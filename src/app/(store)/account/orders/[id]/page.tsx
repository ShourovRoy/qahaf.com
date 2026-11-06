import { and, asc, eq } from "drizzle-orm";
import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ORDER_LABEL, OrderProgress, OrderStatusBadge, PaymentStatusBadge, PROVIDER_LABEL } from "@/components/order-status";
import { CancelOrderButton } from "@/components/store/cancel-order-button";
import { Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { order, orderEvent } from "@/db/schema";
import { formatDateTime, formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { formatBdPhone } from "@/lib/phone";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

export default function OrderPage(props: PageProps<"/account/orders/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <OrderDetail {...props} />
    </Suspense>
  );
}

async function OrderDetail({ params, searchParams }: PageProps<"/account/orders/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/account/orders/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const o = await db.query.order.findFirst({
    where: and(eq(order.id, id), eq(order.userId, user.id)),
    with: {
      items: { with: { review: { columns: { id: true } } } },
      events: { orderBy: asc(orderEvent.createdAt), columns: { id: true, toStatus: true, note: true, createdAt: true } },
      transactions: true,
    },
  });
  if (!o) notFound();

  const canReview = o.status === "delivered" || o.status === "cancelled";

  return (
    <div className="space-y-8">
      {sp.placed && (
        <div className="flex items-start gap-3 rounded-sm border border-success/30 bg-success/5 p-5">
          <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={20} />
          <div>
            <p className="font-medium">Thank you! Your order has been placed.</p>
            <p className="text-sm text-chocolate">We&apos;ve emailed a confirmation. Our team will verify your order shortly, usually by phone.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/account/orders" className="text-xs uppercase tracking-wider text-chocolate hover:underline">← All orders</Link>
          <h1 className="heading-display mt-2 text-3xl sm:text-4xl">Order {o.orderNumber}</h1>
          <p className="mt-1 text-sm text-chocolate">Placed {formatDateTime(o.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={o.status} />
          {o.status === "pending" && <CancelOrderButton orderId={o.id} />}
        </div>
      </div>

      <div className="rounded-sm border border-chocolate/15 p-5">
        <OrderProgress status={o.status} />
        {o.statusReason && (o.status === "rejected" || o.status === "cancelled") && (
          <p className="text-sm text-chocolate">Reason: {o.statusReason}</p>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <h2 className="eyebrow mb-4">Items</h2>
          <ul className="divide-y divide-chocolate/10 border-y border-chocolate/10">
            {o.items.map((i) => (
              <li key={i.id} className="flex gap-4 py-4">
                <Link href={`/product/${i.productSlug}`} className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-sm bg-ivory-alt">
                  <Image src={mediaUrl(i.imageKey)} alt={i.productName} fill sizes="80px" className="object-cover" />
                </Link>
                <div className="flex-1 text-sm">
                  <Link href={`/product/${i.productSlug}`} className="hover:underline">{i.productName}</Link>
                  <p className="text-xs text-chocolate">Size {i.size}{i.color && ` · ${i.color}`} · Qty {i.quantity}</p>
                  <p className="mt-1">{formatPrice(i.lineTotal)}</p>
                  {canReview && i.productId && (
                    i.review ? (
                      <p className="mt-2 text-xs text-success">Reviewed — thank you</p>
                    ) : (
                      <Link href={`/product/${i.productSlug}#reviews`} className="mt-2 inline-block text-xs uppercase tracking-wider text-chocolate underline underline-offset-4">
                        Write a review
                      </Link>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>

          <h2 className="eyebrow mb-4 mt-10">History</h2>
          <ol className="space-y-4 border-l border-chocolate/20 pl-5">
            {o.events.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-espresso" />
                <p className="text-sm font-medium">{ORDER_LABEL[e.toStatus]}</p>
                <p className="text-xs text-chocolate">{formatDateTime(e.createdAt)}{e.note && ` · ${e.note}`}</p>
              </li>
            ))}
          </ol>
        </section>

        <aside className="space-y-6">
          <div className="rounded-sm bg-surface p-5">
            <h2 className="eyebrow mb-3">Summary</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-chocolate">Subtotal</dt><dd>{formatPrice(o.subtotal)}</dd></div>
              {o.discountTotal > 0 && <div className="flex justify-between"><dt className="text-chocolate">Savings</dt><dd>-{formatPrice(o.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt className="text-chocolate">Delivery</dt><dd>{o.shippingFee ? formatPrice(o.shippingFee) : "Free"}</dd></div>
              <div className="flex justify-between border-t border-chocolate/15 pt-2 font-medium"><dt>Total</dt><dd>{formatPrice(o.total)}</dd></div>
            </dl>
          </div>
          <div className="rounded-sm bg-surface p-5 text-sm">
            <h2 className="eyebrow mb-3">Payment</h2>
            <p>{PROVIDER_LABEL[o.paymentMethod]}</p>
            <div className="mt-2"><PaymentStatusBadge status={o.paymentStatus} /></div>
          </div>
          <div className="rounded-sm bg-surface p-5 text-sm">
            <h2 className="eyebrow mb-3">Deliver to</h2>
            <p className="font-medium">{o.shippingName}</p>
            <p className="text-chocolate">{formatBdPhone(o.shippingPhone)}</p>
            <p className="mt-2 text-chocolate">{o.shippingAddressLine}<br />{o.shippingArea}, {o.shippingDistrict} {o.shippingPostcode}<br />{o.shippingDivision}</p>
            {o.customerNote && <p className="mt-3 text-xs text-chocolate">Note: {o.customerNote}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
