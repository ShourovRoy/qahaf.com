"use server";

import { eq, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { product, review, session, setting, user } from "@/db/schema";
import { normalizeBdPhone } from "@/lib/phone";
import { deleteObjects } from "@/lib/r2";
import { assertAdmin } from "@/lib/session";
import { getSettings } from "@/server/settings";

export async function setCustomerBlocked(userId: string, blocked: boolean) {
  const admin = await assertAdmin();
  if (admin.id === userId) return { ok: false as const, error: "You can't block yourself." };
  await db.update(user).set({ isBlocked: blocked }).where(eq(user.id, userId));
  if (blocked) await db.delete(session).where(eq(session.userId, userId));
  refresh();
  return { ok: true as const };
}

async function reviewProduct(reviewId: string) {
  return db.query.review.findFirst({
    where: eq(review.id, reviewId),
    columns: { id: true, rating: true, isHidden: true, productId: true },
    with: { product: { columns: { slug: true } }, media: { columns: { key: true } } },
  });
}

function invalidateReviews(productId: string, slug: string) {
  updateTag(`reviews:${productId}`);
  updateTag(`product:${slug}`);
  updateTag("products");
  refresh();
}

// Hidden reviews don't count toward the product rating.
export async function setReviewHidden(reviewId: string, hidden: boolean) {
  await assertAdmin();
  const r = await reviewProduct(reviewId);
  if (!r || r.isHidden === hidden) return { ok: true as const };
  const sign = hidden ? -1 : 1;
  await db.transaction(async (tx) => {
    await tx.update(review).set({ isHidden: hidden }).where(eq(review.id, reviewId));
    await tx
      .update(product)
      .set({ ratingSum: sql`${product.ratingSum} + ${sign * r.rating}`, ratingCount: sql`${product.ratingCount} + ${sign}` })
      .where(eq(product.id, r.productId));
  });
  invalidateReviews(r.productId, r.product.slug);
  return { ok: true as const };
}

export async function deleteReview(reviewId: string) {
  await assertAdmin();
  const r = await reviewProduct(reviewId);
  if (!r) return { ok: true as const };
  await db.transaction(async (tx) => {
    await tx.delete(review).where(eq(review.id, reviewId));
    if (!r.isHidden) {
      await tx
        .update(product)
        .set({ ratingSum: sql`${product.ratingSum} - ${r.rating}`, ratingCount: sql`${product.ratingCount} - 1` })
        .where(eq(product.id, r.productId));
    }
  });
  await deleteObjects(r.media.map((m) => m.key));
  invalidateReviews(r.productId, r.product.slug);
  return { ok: true as const };
}

const text = (max: number) => z.string().trim().max(max);
const storePath = z.string().trim().regex(/^\/[^\s]*$/, "Use a store path like /shop").or(z.literal(""));
const settingsSchema = z.object({
  shippingInsideDhaka: z.coerce.number().int().min(0).max(10000),
  shippingOutsideDhaka: z.coerce.number().int().min(0).max(10000),
  freeShippingThreshold: z.coerce.number().int().min(0).max(1000000),
  announcement: text(160),
  contactPhone: text(30),
  contactEmail: z.union([z.literal(""), z.string().email()]),
  notifyEmail: z.union([z.literal(""), z.string().trim().email()]),
  storeAddress: text(200),
  bkash: z
    .object({
      enabled: z.boolean(),
      // Stored as 01XXXXXXXXX, the way customers type it into the bKash app.
      number: z
        .string()
        .trim()
        .transform((v, ctx) => {
          if (!v) return "";
          const phone = normalizeBdPhone(v);
          if (!phone) {
            ctx.addIssue({ code: "custom", message: "Enter a valid bKash mobile number." });
            return z.NEVER;
          }
          return phone.replace(/^\+88/, "");
        }),
      accountType: z.enum(["personal", "agent", "merchant"]),
    })
    .refine((b) => !b.enabled || b.number, { path: ["number"], message: "Add the bKash number before turning bKash on." }),
  socials: z.object({ facebook: text(200), instagram: text(200), tiktok: text(200) }),
  hero: z.object({
    kicker: text(40),
    highlight: text(20),
    title: text(60),
    subtitle: text(160),
    ctaLabel: text(30),
    ctaHref: storePath,
    secondaryLabel: text(30),
    secondaryHref: storePath,
    imageKey: z.string().regex(/^site\//).or(z.literal("")),
    imageAlt: text(120),
    stats: z.array(z.object({ value: text(10), label: text(24) })).max(3),
    badgeText: text(40),
  }),
  marquee: z.array(text(40)).max(10).transform((a) => a.filter(Boolean)),
});

export async function saveSettings(input: unknown) {
  await assertAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: `${parsed.error.issues[0].path.join(".")}: ${parsed.error.issues[0].message}` };

  const previous = await getSettings();
  await db
    .insert(setting)
    .values({ key: "store", value: parsed.data })
    .onConflictDoUpdate({ target: setting.key, set: { value: parsed.data } });
  if (previous.hero.imageKey && previous.hero.imageKey !== parsed.data.hero.imageKey) await deleteObjects([previous.hero.imageKey]);
  updateTag("settings");
  return { ok: true as const };
}
