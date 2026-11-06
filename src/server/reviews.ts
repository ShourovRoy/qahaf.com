import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { order, orderItem, review, reviewMedia } from "@/db/schema";

export const REVIEWABLE_STATUSES = ["delivered", "cancelled"] as const;

export async function getRatingBreakdown(productId: string) {
  "use cache";
  cacheTag(`reviews:${productId}`);
  cacheLife("hours");
  const rows = await db
    .select({ rating: review.rating, count: sql<number>`count(*)::int` })
    .from(review)
    .where(and(eq(review.productId, productId), eq(review.isHidden, false)))
    .groupBy(review.rating);
  return [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: rows.find((x) => x.rating === r)?.count ?? 0 }));
}

// Only call after confirming the viewer is signed in.
export async function getProductReviews(productId: string, page = 1, perPage = 10) {
  "use cache";
  cacheTag(`reviews:${productId}`);
  cacheLife("hours");
  const where = and(eq(review.productId, productId), eq(review.isHidden, false));
  const [rows, [{ count }]] = await Promise.all([
    db.query.review.findMany({
      where,
      orderBy: desc(review.createdAt),
      limit: perPage,
      offset: (page - 1) * perPage,
      columns: { id: true, rating: true, body: true, createdAt: true },
      with: {
        user: { columns: { name: true } },
        media: { columns: { id: true, type: true, key: true }, orderBy: asc(reviewMedia.sortOrder) },
        orderItem: { columns: { size: true } },
      },
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(review).where(where),
  ]);
  return { reviews: rows, total: count, pageCount: Math.max(1, Math.ceil(count / perPage)) };
}

/** Order items the user can still review for this product. */
export async function getReviewableItems(userId: string, productId: string) {
  const rows = await db
    .select({ id: orderItem.id, orderNumber: order.orderNumber, size: orderItem.size, reviewId: review.id })
    .from(orderItem)
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .leftJoin(review, eq(review.orderItemId, orderItem.id))
    .where(
      and(eq(order.userId, userId), eq(orderItem.productId, productId), inArray(order.status, [...REVIEWABLE_STATUSES])),
    );
  return rows.filter((r) => !r.reviewId);
}
