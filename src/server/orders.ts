import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { order, orderEvent, orderItem, product, productVariant, transaction } from "@/db/schema";
import { emails, sendMailSafe } from "@/lib/email";
import { env } from "@/lib/env";
import { formatPrice } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import { getSettings } from "./settings";
import { ORDER_LABEL } from "@/components/order-status";

export type OrderStatus = (typeof order.$inferSelect)["status"];

export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["processing", "shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
  rejected: [],
};

const random = (n: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");

export function newOrderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `QH${ymd}-${random(5)}`;
}

export function newTxnReference() {
  return `TXN-${Date.now().toString(36).toUpperCase()}-${random(4)}`;
}

export async function adminEmail() {
  const settings = await getSettings();
  return settings.notifyEmail || settings.contactEmail || env().SMTP_EMAIL;
}

async function restoreStock(tx: Tx, orderId: string) {
  const items = await tx.select({ variantId: orderItem.variantId, quantity: orderItem.quantity }).from(orderItem).where(eq(orderItem.orderId, orderId));
  for (const i of items) {
    if (!i.variantId) continue;
    await tx.update(productVariant).set({ stock: sql`${productVariant.stock} + ${i.quantity}` }).where(eq(productVariant.id, i.variantId));
  }
}

/** Moves an order to a new status and applies stock / payment side effects. */
export async function transitionOrder(opts: { orderId: string; to: OrderStatus; actorId: string; note?: string | null; byCustomer?: boolean }) {
  const { orderId, to, actorId, note, byCustomer } = opts;

  const result = await db.transaction(async (tx) => {
    // Row lock stops two admins applying conflicting changes.
    const [current] = await tx.select().from(order).where(eq(order.id, orderId)).for("update");
    if (!current) throw new Error("Order not found.");
    if (byCustomer && (current.userId !== actorId || current.status !== "pending" || to !== "cancelled")) {
      throw new Error("This order can no longer be cancelled.");
    }
    if (!TRANSITIONS[current.status].includes(to)) {
      throw new Error(`Can't change a ${current.status} order to ${to}.`);
    }
    if (to === "confirmed" && current.paymentMethod === "bkash" && current.paymentStatus !== "paid") {
      throw new Error("Verify the bKash payment before confirming this order.");
    }

    const now = new Date();
    const patch: Partial<typeof order.$inferInsert> = { status: to, statusReason: note ?? current.statusReason };
    if (to === "confirmed") patch.confirmedAt = now;
    if (to === "shipped") patch.shippedAt = now;
    if (to === "delivered") {
      patch.deliveredAt = now;
      if (current.paymentMethod === "cod") patch.paymentStatus = "paid";
    }
    if (to === "cancelled" || to === "rejected") {
      patch.cancelledAt = now;
      await restoreStock(tx, orderId);
    }

    await tx.update(order).set(patch).where(eq(order.id, orderId));
    await tx.insert(orderEvent).values({ orderId, fromStatus: current.status, toStatus: to, note: note || null, actorId });

    if (current.paymentMethod === "cod") {
      const pending = and(eq(transaction.orderId, orderId), eq(transaction.type, "charge"), eq(transaction.status, "pending"));
      if (to === "delivered") {
        await tx.update(transaction).set({ status: "succeeded", completedAt: now }).where(pending);
      } else if (to === "cancelled" || to === "rejected") {
        await tx.update(transaction).set({ status: "cancelled", failureReason: note || `Order ${to}` }).where(pending);
      }
    }

    const slugs = await tx
      .selectDistinct({ slug: product.slug })
      .from(orderItem)
      .innerJoin(product, eq(product.id, orderItem.productId))
      .where(eq(orderItem.orderId, orderId));

    return { order: { ...current, ...patch }, slugs: slugs.map((s) => s.slug) };
  });

  const customer = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.id, result.order.userId), columns: { name: true, email: true } });
  if (customer) {
    await sendMailSafe(
      customer.email,
      emails.orderStatus(customer.name, result.order.orderNumber, ORDER_LABEL[to].toLowerCase(), absoluteUrl(`/account/orders/${orderId}`), note),
    );
  }
  return result;
}

export type BkashAction = "verify" | "reject" | "refund";

/**
 * Admin decisions on a manual bKash payment. Cancelling an order leaves its payment alone,
 * so money that arrived for a cancelled order can still be verified and then refunded.
 */
export async function settleBkashPayment(opts: { orderId: string; action: BkashAction; actorId: string; note?: string | null; refundTrxId?: string | null }) {
  const { orderId, action, actorId, note, refundTrxId } = opts;

  const result = await db.transaction(async (tx) => {
    const [current] = await tx.select().from(order).where(eq(order.id, orderId)).for("update");
    if (!current) throw new Error("Order not found.");
    if (current.paymentMethod !== "bkash") throw new Error("This order isn't paid by bKash.");

    const [charge] = await tx
      .select()
      .from(transaction)
      .where(and(eq(transaction.orderId, orderId), eq(transaction.type, "charge"), eq(transaction.status, "pending")))
      .limit(1);
    const now = new Date();
    let event: string;

    if (action === "verify" || action === "reject") {
      if (!charge) throw new Error("There is no bKash payment waiting for a check.");
      if (action === "verify") {
        await tx.update(transaction).set({ status: "succeeded", completedAt: now }).where(eq(transaction.id, charge.id));
        await tx.update(order).set({ paymentStatus: "paid" }).where(eq(order.id, orderId));
        event = `bKash payment verified (TrxID ${charge.providerTransactionId})`;
      } else {
        if (!note) throw new Error("Please give a reason.");
        await tx.update(transaction).set({ status: "failed", failureReason: note }).where(eq(transaction.id, charge.id));
        await tx.update(order).set({ paymentStatus: "failed" }).where(eq(order.id, orderId));
        event = `bKash payment not received (TrxID ${charge.providerTransactionId}): ${note}`;
      }
    } else {
      if (current.paymentStatus !== "paid" || (current.status !== "cancelled" && current.status !== "rejected")) {
        throw new Error("Only paid orders that were cancelled or rejected can be refunded.");
      }
      await tx.insert(transaction).values({
        reference: newTxnReference(),
        orderId,
        userId: current.userId,
        provider: "bkash",
        type: "refund",
        status: "succeeded",
        amount: current.total,
        providerTransactionId: refundTrxId || null,
        completedAt: now,
      });
      await tx.update(order).set({ paymentStatus: "refunded" }).where(eq(order.id, orderId));
      event = `bKash payment refunded${refundTrxId ? ` (TrxID ${refundTrxId})` : ""}`;
    }

    await tx.insert(orderEvent).values({ orderId, fromStatus: current.status, toStatus: current.status, note: event, actorId });
    return current;
  });

  const customer = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.id, result.userId), columns: { name: true, email: true } });
  if (customer) {
    const url = absoluteUrl(`/account/orders/${orderId}`);
    await sendMailSafe(customer.email, emails.bkashPayment(customer.name, result.orderNumber, action, url, note));
  }
}

export async function notifyLowStock(variantIds: string[]) {
  if (!variantIds.length) return;
  const low = await db
    .select({ name: product.name, size: productVariant.size, color: productVariant.color, stock: productVariant.stock })
    .from(productVariant)
    .innerJoin(product, eq(product.id, productVariant.productId))
    .where(and(inArray(productVariant.id, variantIds), sql`${productVariant.stock} <= ${product.lowStockThreshold}`));
  if (!low.length) return;
  const lines = low.map((l) => `${l.name} — ${l.size}${l.color ? ` / ${l.color}` : ""}: ${l.stock === 0 ? "out of stock" : `${l.stock} left`}`);
  await sendMailSafe(await adminEmail(), emails.adminLowStock(lines, absoluteUrl("/admin/inventory?filter=low")));
}

export async function notifyNewOrder(
  o: { id: string; orderNumber: string; total: number; paymentMethod: "cod" | "bkash" },
  customer: { name: string; email: string },
) {
  const total = formatPrice(o.total);
  await Promise.all([
    sendMailSafe(customer.email, emails.orderPlaced(customer.name, o.orderNumber, total, o.paymentMethod, absoluteUrl(`/account/orders/${o.id}`))),
    adminEmail().then((to) => sendMailSafe(to, emails.adminNewOrder(o.orderNumber, total, o.paymentMethod, absoluteUrl(`/admin/orders/${o.id}`)))),
  ]);
}
