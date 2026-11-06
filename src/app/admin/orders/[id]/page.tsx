import { asc, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderActions } from "@/components/admin/order-actions";
import { ORDER_LABEL, OrderStatusBadge, PaymentStatusBadge, PROVIDER_LABEL, TxnStatusBadge } from "@/components/order-status";
import { Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { order, orderEvent, transaction } from "@/db/schema";
import { formatDateTime, formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { formatBdPhone } from "@/lib/phone";
import { requireAdmin } from "@/lib/session";
import { TRANSITIONS } from "@/server/orders";

export const metadata: Metadata = { title: "Order" };

export default function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <Detail {...props} />
    </Suspense>
  );
}

async function Detail({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const o = await db.query.order.findFirst({
    where: eq(order.id, id),
    with: {
      user: { columns: { id: true, name: true, email: true, phone: true, createdAt: true } },
      items: true,
      events: { orderBy: asc(orderEvent.createdAt), with: { actor: { columns: { name: true, role: true } } } },
      transactions: { orderBy: desc(transaction.createdAt) },
    },
  });
  if (!o) notFound();

  const customerOrders = await db.$count(order, eq(order.userId, o.userId));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/orders" className="text-xs uppercase tracking-wider text-chocolate hover:underline">← Orders</Link>
          <h1 className="heading-display mt-2 text-3xl sm:text-4xl">{o.orderNumber}</h1>
          <p className="mt-1 text-sm text-chocolate">Placed {formatDateTime(o.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <OrderStatusBadge status={o.status} />
          <PaymentStatusBadge status={o.paymentStatus} />
        </div>
      </div>

      <OrderActions orderId={o.id} status={o.status} allowed={TRANSITIONS[o.status]} adminNote={o.adminNote ?? ""} phone={o.shippingPhone} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-sm border border-chocolate/15">
            <h2 className="eyebrow border-b border-chocolate/10 px-5 py-3">Items</h2>
            <ul className="divide-y divide-chocolate/10">
              {o.items.map((i) => (
                <li key={i.id} className="flex gap-4 px-5 py-4">
                  <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-sm bg-ivory-alt">
                    <Image src={mediaUrl(i.imageKey)} alt="" fill sizes="56px" className="object-cover" />
                  </div>
                  <div className="flex-1 text-sm">
                    {i.productId ? <Link href={`/admin/products/${i.productId}`} className="hover:underline">{i.productName}</Link> : i.productName}
                    <p className="text-xs text-chocolate">SKU {i.sku} · Size {i.size}{i.color && ` · ${i.color}`}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{i.quantity} × {formatPrice(i.unitPrice)}</p>
                    <p className="font-medium">{formatPrice(i.lineTotal)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-chocolate/10 px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-chocolate">Subtotal</dt><dd>{formatPrice(o.subtotal)}</dd></div>
              {o.discountTotal > 0 && <div className="flex justify-between"><dt className="text-chocolate">Discounts</dt><dd>-{formatPrice(o.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt className="text-chocolate">Delivery</dt><dd>{formatPrice(o.shippingFee)}</dd></div>
              <div className="flex justify-between text-base font-medium"><dt>Total ({PROVIDER_LABEL[o.paymentMethod]})</dt><dd>{formatPrice(o.total)}</dd></div>
            </dl>
          </section>

          <section className="rounded-sm border border-chocolate/15">
            <h2 className="eyebrow border-b border-chocolate/10 px-5 py-3">Transactions</h2>
            <ul className="divide-y divide-chocolate/10">
              {o.transactions.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                  <Link href={`/admin/transactions/${t.id}`} className="font-mono text-xs hover:underline">{t.reference}</Link>
                  <span className="text-xs text-chocolate">{PROVIDER_LABEL[t.provider]} · {t.type}</span>
                  <TxnStatusBadge status={t.status} />
                  <span className="font-medium">{formatPrice(t.amount)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-sm border border-chocolate/15 p-5">
            <h2 className="eyebrow mb-4">Timeline</h2>
            <ol className="space-y-4 border-l border-chocolate/20 pl-5">
              {o.events.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-espresso" />
                  <p className="font-medium">{ORDER_LABEL[e.toStatus]}</p>
                  <p className="text-xs text-chocolate">
                    {formatDateTime(e.createdAt)}
                    {e.actor && ` · by ${e.actor.name}${e.actor.role === "admin" ? " (admin)" : ""}`}
                  </p>
                  {e.note && <p className="mt-1 text-xs text-chocolate">“{e.note}”</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-sm border border-chocolate/15 p-5 text-sm">
            <h2 className="eyebrow mb-3">Customer</h2>
            <Link href={`/admin/customers/${o.user.id}`} className="font-medium hover:underline">{o.user.name}</Link>
            <p className="text-chocolate">{o.user.email}</p>
            {o.user.phone && <p className="text-chocolate">{formatBdPhone(o.user.phone)}</p>}
            <p className="mt-2 text-xs text-chocolate">{customerOrders} orders in total</p>
          </section>
          <section className="rounded-sm border border-chocolate/15 p-5 text-sm">
            <h2 className="eyebrow mb-3">Shipping</h2>
            <p className="font-medium">{o.shippingName}</p>
            <a href={`tel:${o.shippingPhone}`} className="text-chocolate underline-offset-4 hover:underline">{formatBdPhone(o.shippingPhone)}</a>
            <p className="mt-2 text-chocolate">{o.shippingAddressLine}<br />{o.shippingArea}, {o.shippingDistrict} {o.shippingPostcode}<br />{o.shippingDivision} Division</p>
            {o.customerNote && <p className="mt-3 rounded-sm bg-surface p-3 text-xs">Customer note: {o.customerNote}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
