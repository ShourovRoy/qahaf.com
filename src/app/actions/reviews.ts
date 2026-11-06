"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { order, orderItem, product, review, reviewMedia } from "@/db/schema";
import { getUser } from "@/lib/session";
import { REVIEWABLE_STATUSES } from "@/server/reviews";

const schema = z.object({
  orderItemId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(10, "Please write at least 10 characters.").max(1500),
  media: z.array(z.object({ key: z.string(), type: z.enum(["image", "video"]) })).max(6),
});

export async function createReview(input: z.infer<typeof schema>) {
  const user = await getUser();
  if (!user) return { ok: false as const, error: "Please sign in." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { orderItemId, rating, body, media } = parsed.data;

  if (media.some((m) => !m.key.startsWith(`reviews/${user.id}/`))) return { ok: false as const, error: "Invalid media." };

  const item = await db
    .select({ productId: orderItem.productId, slug: product.slug })
    .from(orderItem)
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .innerJoin(product, eq(product.id, orderItem.productId))
    .where(and(eq(orderItem.id, orderItemId), eq(order.userId, user.id), inArray(order.status, [...REVIEWABLE_STATUSES])))
    .then((r) => r[0]);
  if (!item?.productId) return { ok: false as const, error: "You can review this item once your order is completed." };

  try {
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(review)
        .values({ productId: item.productId!, userId: user.id, orderItemId, rating, body })
        .returning({ id: review.id });
      if (media.length) {
        await tx.insert(reviewMedia).values(media.map((m, i) => ({ reviewId: created.id, type: m.type, key: m.key, sortOrder: i })));
      }
      await tx
        .update(product)
        .set({ ratingSum: sql`${product.ratingSum} + ${rating}`, ratingCount: sql`${product.ratingCount} + 1` })
        .where(eq(product.id, item.productId!));
    });
  } catch {
    return { ok: false as const, error: "You've already reviewed this item." };
  }

  updateTag(`reviews:${item.productId}`);
  updateTag(`product:${item.slug}`);
  updateTag("products");
  return { ok: true as const };
}
