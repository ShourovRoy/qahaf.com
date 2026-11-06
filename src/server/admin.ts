import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { order, product, productVariant } from "@/db/schema";
import { getUser } from "@/lib/session";

export const lowStockCondition = sql`${productVariant.stock} <= ${product.lowStockThreshold}`;

export async function getAdminCounts() {
  const user = await getUser();
  if (user?.role !== "admin") return null;
  const [[pending], [low]] = await Promise.all([
    db.select({ n: count() }).from(order).where(eq(order.status, "pending")),
    db
      .select({ n: count() })
      .from(productVariant)
      .innerJoin(product, eq(product.id, productVariant.productId))
      .where(and(eq(product.status, "active"), lowStockCondition)),
  ]);
  return { pendingOrders: pending.n, lowStock: low.n };
}
