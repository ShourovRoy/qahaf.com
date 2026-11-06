import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { cart, cartItem } from "@/db/schema";
import { effectivePrice } from "@/lib/format";
import { getUser } from "@/lib/session";

export const CART_COOKIE = "qahaf_cart";

async function guestCartId() {
  const id = (await cookies()).get(CART_COOKIE)?.value;
  return id && /^[0-9a-f-]{36}$/.test(id) ? id : null;
}

async function userCartId(userId: string) {
  const existing = await db.query.cart.findFirst({ where: eq(cart.userId, userId), columns: { id: true } });
  if (existing) return existing.id;
  const [created] = await db.insert(cart).values({ userId }).onConflictDoNothing().returning({ id: cart.id });
  return created?.id ?? (await db.query.cart.findFirst({ where: eq(cart.userId, userId), columns: { id: true } }))!.id;
}

// Moves a guest cart into the user's cart. Safe to call repeatedly.
async function mergeGuestCart(targetId: string) {
  const guestId = await guestCartId();
  if (!guestId || guestId === targetId) return;
  const guest = await db.query.cart.findFirst({
    where: and(eq(cart.id, guestId), isNull(cart.userId)),
    with: { items: true },
  });
  if (!guest) return;
  await db.transaction(async (tx) => {
    for (const item of guest.items) {
      await tx
        .insert(cartItem)
        .values({ cartId: targetId, variantId: item.variantId, quantity: item.quantity })
        .onConflictDoNothing();
    }
    await tx.delete(cart).where(eq(cart.id, guest.id));
  });
}

/** Resolves the current cart id; `create` makes a guest cart when none exists. */
export async function resolveCartId(opts: { create: boolean }) {
  const user = await getUser();
  if (user) {
    const id = await userCartId(user.id);
    await mergeGuestCart(id);
    return { id, isGuest: false };
  }
  const existing = await guestCartId();
  if (existing) {
    const found = await db.query.cart.findFirst({ where: and(eq(cart.id, existing), isNull(cart.userId)), columns: { id: true } });
    if (found) return { id: found.id, isGuest: true };
  }
  if (!opts.create) return null;
  const [created] = await db.insert(cart).values({}).returning({ id: cart.id });
  (await cookies()).set(CART_COOKIE, created.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 60,
    path: "/",
  });
  return { id: created.id, isGuest: true };
}

export async function getCart() {
  const resolved = await resolveCartId({ create: false });
  if (!resolved) return { id: null, lines: [], subtotal: 0, regularTotal: 0, count: 0, hasIssues: false };

  const items = await db.query.cartItem.findMany({
    where: eq(cartItem.cartId, resolved.id),
    orderBy: (c, { asc }) => asc(c.createdAt),
    with: {
      variant: {
        with: {
          product: {
            columns: { id: true, name: true, slug: true, regularPrice: true, salePrice: true, status: true },
            with: { media: { columns: { key: true }, where: (m, { eq }) => eq(m.type, "image"), orderBy: (m, { asc }) => asc(m.sortOrder), limit: 1 } },
          },
        },
      },
    },
  });

  const lines = items.map((i) => {
    const p = i.variant.product;
    const unitPrice = effectivePrice(p);
    const available = p.status === "active" ? i.variant.stock : 0;
    return {
      id: i.id,
      variantId: i.variantId,
      productId: p.id,
      name: p.name,
      slug: p.slug,
      size: i.variant.size,
      color: i.variant.color,
      imageKey: p.media[0]?.key ?? null,
      unitPrice,
      regularPrice: p.regularPrice,
      quantity: i.quantity,
      available,
      lineTotal: unitPrice * i.quantity,
      issue: available === 0 ? "Out of stock" : i.quantity > available ? `Only ${available} left` : null,
    };
  });

  return {
    id: resolved.id,
    lines,
    subtotal: lines.reduce((s, l) => s + l.lineTotal, 0),
    regularTotal: lines.reduce((s, l) => s + l.regularPrice * l.quantity, 0),
    count: lines.reduce((s, l) => s + l.quantity, 0),
    hasIssues: lines.some((l) => l.issue),
  };
}

export type Cart = Awaited<ReturnType<typeof getCart>>;

export async function clearCartItems(cartId: string, variantIds: string[]) {
  if (!variantIds.length) return;
  await db.delete(cartItem).where(and(eq(cartItem.cartId, cartId), inArray(cartItem.variantId, variantIds)));
}
