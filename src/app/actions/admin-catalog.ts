"use server";

import { and, eq, inArray, ne, notInArray } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { category, product, productMedia, productVariant } from "@/db/schema";
import { slugify } from "@/lib/format";
import { productInput } from "@/lib/product-schema";
import { deleteObjects } from "@/lib/r2";
import { assertAdmin } from "@/lib/session";

type Result = { ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

function pgCode(err: unknown) {
  const e = err as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  return { code: e.cause?.code ?? e.code, constraint: e.cause?.constraint ?? e.constraint };
}

export async function saveProduct(input: unknown): Promise<Result> {
  await assertAdmin();
  const parsed = productInput.safeParse(input);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please fix the highlighted fields.", fieldErrors: flat.fieldErrors };
  }
  const { id, variants, media, ...data } = parsed.data;

  let previousSlug: string | undefined;
  let removedKeys: string[] = [];

  try {
    const productId = await db.transaction(async (tx) => {
      let pid = id;
      if (pid) {
        const existing = await tx.query.product.findFirst({ where: eq(product.id, pid), columns: { slug: true } });
        if (!existing) throw new Error("Product not found.");
        previousSlug = existing.slug;
        await tx.update(product).set(data).where(eq(product.id, pid));
      } else {
        [{ id: pid }] = await tx.insert(product).values(data).returning({ id: product.id });
      }

      const keepIds = variants.flatMap((v) => (v.id ? [v.id] : []));
      await tx.delete(productVariant).where(and(eq(productVariant.productId, pid!), keepIds.length ? notInArray(productVariant.id, keepIds) : undefined));
      for (const [i, v] of variants.entries()) {
        const values = { size: v.size, color: v.color || null, sku: v.sku.toUpperCase(), stock: v.stock, sortOrder: i };
        if (v.id) await tx.update(productVariant).set(values).where(and(eq(productVariant.id, v.id), eq(productVariant.productId, pid!)));
        else await tx.insert(productVariant).values({ ...values, productId: pid! });
      }

      const oldMedia = await tx.query.productMedia.findMany({ where: eq(productMedia.productId, pid!), columns: { key: true } });
      const newKeys = new Set(media.map((m) => m.key));
      removedKeys = oldMedia.map((m) => m.key).filter((k) => !newKeys.has(k));
      await tx.delete(productMedia).where(eq(productMedia.productId, pid!));
      if (media.length) {
        await tx.insert(productMedia).values(media.map((m, i) => ({ productId: pid!, key: m.key, type: m.type, alt: m.alt || null, sortOrder: i })));
      }
      return pid!;
    });

    await deleteObjects(removedKeys);
    updateTag("products");
    updateTag(`product:${data.slug}`);
    if (previousSlug && previousSlug !== data.slug) updateTag(`product:${previousSlug}`);
    return { ok: true, id: productId };
  } catch (err) {
    const { code, constraint } = pgCode(err);
    if (code === "23505" && constraint?.includes("slug")) return { ok: false, error: "Another product already uses this URL slug.", fieldErrors: { slug: ["Slug already in use."] } };
    if (code === "23505" && constraint?.includes("sku")) return { ok: false, error: "One of these SKUs is already used by another product." };
    console.error("saveProduct failed", err);
    return { ok: false, error: err instanceof Error ? err.message : "Could not save product." };
  }
}

export async function deleteProduct(id: string): Promise<{ ok: boolean; error?: string; archived?: boolean }> {
  await assertAdmin();
  const p = await db.query.product.findFirst({ where: eq(product.id, id), columns: { slug: true }, with: { media: { columns: { key: true } } } });
  if (!p) return { ok: false, error: "Not found." };

  const ordered = await db.query.orderItem.findFirst({ where: (oi, { eq }) => eq(oi.productId, id), columns: { id: true } });
  if (ordered) {
    // Keep order history intact: archive instead of deleting.
    await db.update(product).set({ status: "archived" }).where(eq(product.id, id));
  } else {
    await db.delete(product).where(eq(product.id, id));
    await deleteObjects(p.media.map((m) => m.key));
  }
  updateTag("products");
  updateTag(`product:${p.slug}`);
  refresh();
  return { ok: true, archived: !!ordered };
}

export async function updateVariantStock(variantId: string, stock: number) {
  await assertAdmin();
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) return { ok: false as const, error: "Invalid stock." };
  const [v] = await db.update(productVariant).set({ stock }).where(eq(productVariant.id, variantId)).returning({ productId: productVariant.productId });
  if (!v) return { ok: false as const, error: "Variant not found." };
  const p = await db.query.product.findFirst({ where: eq(product.id, v.productId), columns: { slug: true } });
  updateTag("products");
  if (p) updateTag(`product:${p.slug}`);
  refresh();
  return { ok: true as const };
}

export async function setProductStatus(ids: string[], status: "draft" | "active" | "archived") {
  await assertAdmin();
  if (!ids.length) return;
  await db.update(product).set({ status }).where(inArray(product.id, ids));
  updateTag("products");
  refresh();
}

const categoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().optional(),
  description: z.string().trim().max(500).nullable(),
  parentId: z.string().uuid().nullable(),
  imageKey: z.string().regex(/^categories\//).nullable(),
  sortOrder: z.coerce.number().int().min(0).max(999),
  isActive: z.boolean(),
  seoTitle: z.string().trim().max(70).nullable(),
  seoDescription: z.string().trim().max(170).nullable(),
});

export async function saveCategory(input: unknown): Promise<Result> {
  await assertAdmin();
  const parsed = categoryInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid category." };
  const { id, ...rest } = parsed.data;
  const data = { ...rest, slug: slugify(rest.slug || rest.name) };
  if (!data.slug) return { ok: false, error: "Slug is required." };
  if (id && data.parentId === id) return { ok: false, error: "A category can't be its own parent." };

  const clash = await db.query.category.findFirst({ where: and(eq(category.slug, data.slug), id ? ne(category.id, id) : undefined), columns: { id: true } });
  if (clash) return { ok: false, error: "Another category already uses this slug." };

  let savedId = id;
  if (id) {
    const old = await db.query.category.findFirst({ where: eq(category.id, id), columns: { imageKey: true } });
    await db.update(category).set(data).where(eq(category.id, id));
    if (old?.imageKey && old.imageKey !== data.imageKey) await deleteObjects([old.imageKey]);
  } else {
    [{ id: savedId }] = await db.insert(category).values(data).returning({ id: category.id });
  }
  updateTag("categories");
  updateTag("products");
  refresh();
  return { ok: true, id: savedId! };
}

export async function deleteCategory(id: string) {
  await assertAdmin();
  const [c] = await db.delete(category).where(eq(category.id, id)).returning({ imageKey: category.imageKey });
  if (c?.imageKey) await deleteObjects([c.imageKey]);
  updateTag("categories");
  updateTag("products");
  refresh();
  return { ok: true as const };
}
