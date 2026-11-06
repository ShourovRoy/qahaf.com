import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { OrderStatusBadge } from "@/components/order-status";
import { Pagination } from "@/components/pagination";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeading, Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { order } from "@/db/schema";
import { cn } from "@/lib/cn";
import { formatDate, formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { intParam, param, type SearchParams, withParams } from "@/lib/search-params";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

const TABS = [
  { key: "", label: "All" },
  { key: "active", label: "In progress" },
  { key: "delivered", label: "Delivered" },
  { key: "closed", label: "Cancelled" },
];
const PER_PAGE = 10;

export default function OrdersPage({ searchParams }: PageProps<"/account/orders">) {
  return (
    <>
      <PageHeading eyebrow="My account" title="Orders" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <OrdersList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function OrdersList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser("/account/orders");
  const sp = await searchParams;
  const tab = param(sp, "status") ?? "";
  const page = Math.max(1, intParam(sp, "page") ?? 1);

  const filters: SQL[] = [eq(order.userId, user.id)];
  if (tab === "active") filters.push(inArray(order.status, ["pending", "confirmed", "processing", "shipped"]));
  if (tab === "delivered") filters.push(eq(order.status, "delivered"));
  if (tab === "closed") filters.push(inArray(order.status, ["cancelled", "rejected"]));
  const where = and(...filters);

  const [orders, [{ total }]] = await Promise.all([
    db.query.order.findMany({
      where,
      orderBy: desc(order.createdAt),
      limit: PER_PAGE,
      offset: (page - 1) * PER_PAGE,
      with: { items: { columns: { id: true, imageKey: true, productName: true } } },
    }),
    db.select({ total: count() }).from(order).where(where),
  ]);

  return (
    <>
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={withParams("/account/orders", {}, { status: t.key })}
            className={cn("shrink-0 rounded-sm border px-3 py-1.5 text-xs uppercase tracking-wider", tab === t.key ? "border-espresso bg-espresso text-ivory" : "border-chocolate/25 text-chocolate")}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {orders.length === 0 ? (
        <EmptyState title="No orders here" action={<ButtonLink href="/shop">Browse the collection</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} className="flex flex-col gap-4 rounded-sm border border-chocolate/15 p-5 hover:border-chocolate sm:flex-row sm:items-center">
                <div className="flex -space-x-3">
                  {o.items.slice(0, 3).map((i) => (
                    <span key={i.id} className="relative h-16 w-13 overflow-hidden rounded-sm border-2 border-ivory bg-ivory-alt">
                      <Image src={mediaUrl(i.imageKey)} alt={i.productName} fill sizes="52px" className="object-cover" />
                    </span>
                  ))}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{o.orderNumber}</p>
                  <p className="text-xs text-chocolate">{formatDate(o.createdAt)} · {o.items.length} {o.items.length === 1 ? "item" : "items"}</p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <OrderStatusBadge status={o.status} />
                  <p className="text-sm font-medium">{formatPrice(o.total)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination base="/account/orders" sp={sp} page={page} pageCount={Math.ceil(total / PER_PAGE)} />
    </>
  );
}
