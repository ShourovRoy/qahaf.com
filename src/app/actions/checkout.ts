"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { after } from "next/server";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { address, cartItem, order, orderEvent, orderItem, productVariant, transaction } from "@/db/schema";
import { effectivePrice } from "@/lib/format";
import { getUser } from "@/lib/session";
import { addressSchema, bkashSchema, formToObject, type FormState } from "@/lib/validators";
import { getCart } from "@/server/cart";
import { newOrderNumber, newTxnReference, notifyLowStock, notifyNewOrder, transitionOrder } from "@/server/orders";
import { bkashAvailable, getSettings, shippingFeeFor } from "@/server/settings";

class CheckoutError extends Error {}

// Postgres unique_violation on transaction (provider, provider_transaction_id).
const isDuplicateTrxId = (err: unknown) =>
  (err as { cause?: { code?: string } })?.cause?.code === "23505" || (err as { code?: string })?.code === "23505";
const TRX_USED = "This bKash TrxID has already been used for another order.";

async function trxIdUsed(trxId: string) {
  const found = await db.query.transaction.findFirst({
    where: and(eq(transaction.provider, "bkash"), eq(transaction.providerTransactionId, trxId)),
    columns: { id: true },
  });
  return !!found;
}

export async function placeOrder(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login?next=/checkout");

  const parsed = addressSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { error: "Please check your shipping details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const a = parsed.data;
  const note = String(fd.get("note") ?? "").trim().slice(0, 500) || null;

  const settings = await getSettings();
  const method = fd.get("paymentMethod") === "bkash" ? "bkash" : "cod";
  let bkash: { trxId: string; sender: string } | null = null;
  if (method === "bkash") {
    if (!bkashAvailable(settings)) return { error: "bKash payment isn't available right now. Please choose cash on delivery." };
    const paid = bkashSchema.safeParse(formToObject(fd));
    if (!paid.success) return { error: "Please check your bKash payment details.", fieldErrors: paid.error.flatten().fieldErrors };
    if (await trxIdUsed(paid.data.bkashTrxId)) return { error: TRX_USED, fieldErrors: { bkashTrxId: [TRX_USED] } };
    bkash = { trxId: paid.data.bkashTrxId, sender: paid.data.bkashSender };
  }

  const cart = await getCart();
  if (!cart.id || !cart.lines.length) return { error: "Your bag is empty." };
  if (cart.hasIssues) return { error: "Some items in your bag are no longer available in that quantity. Please review your bag." };

  let created: { id: string; orderNumber: string; total: number };

  try {
    created = await db.transaction(async (tx) => {
      const variantIds = cart.lines.map((l) => l.variantId);
      const variants = await tx.query.productVariant.findMany({
        where: inArray(productVariant.id, variantIds),
        with: { product: { columns: { id: true, name: true, slug: true, regularPrice: true, salePrice: true, status: true }, with: { media: { columns: { key: true }, where: (m, { eq }) => eq(m.type, "image"), orderBy: (m, { asc }) => asc(m.sortOrder), limit: 1 } } } },
      });

      const items = cart.lines.map((line) => {
        const v = variants.find((x) => x.id === line.variantId);
        if (!v || v.product.status !== "active") throw new CheckoutError(`${line.name} is no longer available.`);
        const unitPrice = effectivePrice(v.product);
        return { line, v, unitPrice };
      });

      for (const { line, v } of items) {
        // Conditional decrement keeps stock from going negative under concurrent checkouts.
        const updated = await tx
          .update(productVariant)
          .set({ stock: sql`${productVariant.stock} - ${line.quantity}` })
          .where(and(eq(productVariant.id, v.id), sql`${productVariant.stock} >= ${line.quantity}`))
          .returning({ id: productVariant.id });
        if (!updated.length) throw new CheckoutError(`${v.product.name} (${v.size}) just sold out in that quantity.`);
      }

      const subtotal = items.reduce((s, i) => s + i.unitPrice * i.line.quantity, 0);
      const discountTotal = items.reduce((s, i) => s + (i.v.product.regularPrice - i.unitPrice) * i.line.quantity, 0);
      const shippingFee = shippingFeeFor(settings, a.district, subtotal);
      const total = subtotal + shippingFee;

      const [o] = await tx
        .insert(order)
        .values({
          orderNumber: newOrderNumber(),
          userId: user.id,
          paymentMethod: method,
          // A bKash payment waits for an admin to match the TrxID.
          paymentStatus: bkash ? "pending" : "unpaid",
          subtotal,
          discountTotal,
          shippingFee,
          total,
          shippingName: a.fullName,
          shippingPhone: a.phone,
          shippingDivision: a.division,
          shippingDistrict: a.district,
          shippingArea: a.area,
          shippingAddressLine: a.addressLine,
          shippingPostcode: a.postcode,
          customerNote: note,
        })
        .returning({ id: order.id, orderNumber: order.orderNumber, total: order.total });

      await tx.insert(orderItem).values(
        items.map(({ line, v, unitPrice }) => ({
          orderId: o.id,
          productId: v.product.id,
          variantId: v.id,
          productName: v.product.name,
          productSlug: v.product.slug,
          size: v.size,
          color: v.color,
          sku: v.sku,
          imageKey: v.product.media[0]?.key ?? null,
          unitPrice,
          regularPrice: v.product.regularPrice,
          quantity: line.quantity,
          lineTotal: unitPrice * line.quantity,
        })),
      );
      await tx.insert(orderEvent).values({
        orderId: o.id,
        toStatus: "pending",
        actorId: user.id,
        note: bkash ? `Order placed (bKash, TrxID ${bkash.trxId})` : "Order placed (cash on delivery)",
      });
      await tx.insert(transaction).values({
        reference: newTxnReference(),
        orderId: o.id,
        userId: user.id,
        provider: method,
        type: "charge",
        status: "pending",
        amount: total,
        providerTransactionId: bkash?.trxId ?? null,
        providerPayload: bkash ? { senderNumber: bkash.sender, receiverNumber: settings.bkash.number } : null,
      });
      await tx.delete(cartItem).where(and(eq(cartItem.cartId, cart.id!), inArray(cartItem.variantId, variantIds)));

      if (fd.get("saveAddress") === "on") {
        const hasDefault = await tx.query.address.findFirst({ where: and(eq(address.userId, user.id), eq(address.isDefault, true)), columns: { id: true } });
        await tx.insert(address).values({ userId: user.id, ...a, isDefault: !hasDefault });
      }
      return o;
    });
  } catch (err) {
    if (err instanceof CheckoutError) return { error: err.message };
    if (isDuplicateTrxId(err)) return { error: TRX_USED, fieldErrors: { bkashTrxId: [TRX_USED] } };
    console.error("placeOrder failed", err);
    return { error: "We couldn't place your order. Please try again." };
  }

  updateTag("products");
  const variantIds = cart.lines.map((l) => l.variantId);
  after(async () => {
    await notifyNewOrder({ ...created, paymentMethod: method }, { name: user.name, email: user.email });
    await notifyLowStock(variantIds);
  });
  redirect(`/account/orders/${created.id}?placed=1`);
}

export async function cancelMyOrder(orderId: string) {
  const user = await getUser();
  if (!user) return { ok: false as const, error: "Please sign in." };
  try {
    const { slugs } = await transitionOrder({ orderId, to: "cancelled", actorId: user.id, note: "Cancelled by customer", byCustomer: true });
    updateTag("products");
    slugs.forEach((s) => updateTag(`product:${s}`));
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Could not cancel." };
  }
}

// After an admin marks a bKash payment as not received, the customer can send the right TrxID.
export async function resubmitBkashPayment(orderId: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Please sign in." };
  const paid = bkashSchema.safeParse(formToObject(fd));
  if (!paid.success) return { error: "Please check your bKash payment details.", fieldErrors: paid.error.flatten().fieldErrors };
  const { bkashTrxId: trxId, bkashSender: sender } = paid.data;
  if (await trxIdUsed(trxId)) return { error: TRX_USED, fieldErrors: { bkashTrxId: [TRX_USED] } };

  const settings = await getSettings();
  try {
    await db.transaction(async (tx) => {
      const [o] = await tx.select().from(order).where(and(eq(order.id, orderId), eq(order.userId, user.id))).for("update");
      if (!o || o.paymentMethod !== "bkash" || o.paymentStatus !== "failed" || o.status !== "pending") {
        throw new CheckoutError("This order isn't waiting for a new bKash payment.");
      }
      await tx.insert(transaction).values({
        reference: newTxnReference(),
        orderId,
        userId: user.id,
        provider: "bkash",
        type: "charge",
        status: "pending",
        amount: o.total,
        providerTransactionId: trxId,
        providerPayload: { senderNumber: sender, receiverNumber: settings.bkash.number },
      });
      await tx.update(order).set({ paymentStatus: "pending" }).where(eq(order.id, orderId));
      await tx.insert(orderEvent).values({ orderId, fromStatus: o.status, toStatus: o.status, actorId: user.id, note: `New bKash TrxID sent: ${trxId}` });
    });
  } catch (err) {
    if (err instanceof CheckoutError) return { error: err.message };
    if (isDuplicateTrxId(err)) return { error: TRX_USED, fieldErrors: { bkashTrxId: [TRX_USED] } };
    console.error("resubmitBkashPayment failed", err);
    return { error: "We couldn't save your payment. Please try again." };
  }
  refresh();
  return { success: "Thanks! We'll check your bKash payment shortly." };
}
