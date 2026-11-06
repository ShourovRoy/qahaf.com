"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { cartItem, product, productVariant, wishlistItem } from "@/db/schema";
import { getUser } from "@/lib/session";
import { resolveCartId } from "@/server/cart";

type Result = { ok: true; message?: string } | { ok: false; error: string; requiresLogin?: boolean };

const addSchema = z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(20) });

export async function addToCart(input: { variantId: string; quantity: number }): Promise<Result> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please choose a size." };
  const { variantId, quantity } = parsed.data;

  const variant = await db.query.productVariant.findFirst({
    where: eq(productVariant.id, variantId),
    columns: { stock: true },
    with: { product: { columns: { status: true } } },
  });
  if (!variant || variant.product.status !== "active") return { ok: false, error: "This item is no longer available." };

  const cartRef = await resolveCartId({ create: true });
  const existing = await db.query.cartItem.findFirst({
    where: and(eq(cartItem.cartId, cartRef!.id), eq(cartItem.variantId, variantId)),
    columns: { quantity: true },
  });
  const next = (existing?.quantity ?? 0) + quantity;
  if (next > variant.stock) {
    return { ok: false, error: variant.stock === 0 ? "This size is out of stock." : `Only ${variant.stock} left in this size.` };
  }

  await db
    .insert(cartItem)
    .values({ cartId: cartRef!.id, variantId, quantity })
    .onConflictDoUpdate({
      target: [cartItem.cartId, cartItem.variantId],
      set: { quantity: sql`${cartItem.quantity} + ${quantity}`, updatedAt: new Date() },
    });
  refresh();
  return { ok: true, message: "Added to bag" };
}

export async function updateCartItem(itemId: string, quantity: number): Promise<Result> {
  const cartRef = await resolveCartId({ create: false });
  if (!cartRef) return { ok: false, error: "Cart not found." };
  const where = and(eq(cartItem.id, itemId), eq(cartItem.cartId, cartRef.id));

  if (quantity <= 0) {
    await db.delete(cartItem).where(where);
  } else {
    const item = await db.query.cartItem.findFirst({ where, with: { variant: { columns: { stock: true } } } });
    if (!item) return { ok: false, error: "Item not found." };
    if (quantity > item.variant.stock) return { ok: false, error: `Only ${item.variant.stock} left.` };
    await db.update(cartItem).set({ quantity: Math.min(quantity, 20) }).where(where);
  }
  refresh();
  return { ok: true };
}

export async function toggleWishlist(productId: string): Promise<Result & { added?: boolean }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in to save items.", requiresLogin: true };
  if (!z.string().uuid().safeParse(productId).success) return { ok: false, error: "Invalid product." };

  const where = and(eq(wishlistItem.userId, user.id), eq(wishlistItem.productId, productId));
  const existing = await db.query.wishlistItem.findFirst({ where });
  if (existing) {
    await db.delete(wishlistItem).where(where);
    refresh();
    return { ok: true, added: false, message: "Removed from wishlist" };
  }
  const exists = await db.query.product.findFirst({ where: eq(product.id, productId), columns: { id: true } });
  if (!exists) return { ok: false, error: "Product not found." };
  await db.insert(wishlistItem).values({ userId: user.id, productId }).onConflictDoNothing();
  refresh();
  return { ok: true, added: true, message: "Saved to wishlist" };
}
