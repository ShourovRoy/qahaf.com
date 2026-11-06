import { and, count, desc, eq, notInArray, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SalesChart } from "@/components/admin/sales-chart";
import { AdminHeading, StatCard } from "@/components/admin/table";
import { OrderStatusBadge } from "@/components/order-status";
import { Badge, Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { order, product, productVariant, transaction, user } from "@/db/schema";
import { formatDateTime, formatPrice } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { lowStockCondition } from "@/server/admin";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <AdminHeading title="Dashboard" />
      <Suspense fallback={<div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>}>
        <Dashboard />
      </Suspense>
    </>
  );
}

const DHAKA_DAY = sql`(${order.createdAt} at time zone 'Asia/Dhaka')::date`;

async function Dashboard() {
  await requireAdmin();
  const live = notInArray(order.status, ["cancelled", "rejected"]);
  const [[money], [pending], [today], [customers], daily, recent, lowStock] = await Promise.all([
    db
      .select({
        collected: sql<number>`coalesce(sum(case when ${transaction.type} = 'refund' then -${transaction.amount} else ${transaction.amount} end) filter (where ${transaction.status} = 'succeeded'), 0)::int`,
        outstanding: sql<number>`coalesce(sum(${transaction.amount}) filter (where ${transaction.status} = 'pending'), 0)::int`,
      })
      .from(transaction),
    db.select({ n: count() }).from(order).where(eq(order.status, "pending")),
    db.select({ n: count(), value: sql<number>`coalesce(sum(${order.total}), 0)::int` }).from(order).where(and(sql`${DHAKA_DAY} = (now() at time zone 'Asia/Dhaka')::date`, live)),
    db.select({ n: count() }).from(user).where(eq(user.role, "customer")),
    db.execute<{ day: string; total: number; orders: number }>(sql`
      select d::date::text as day,
        coalesce(sum(${order.total}), 0)::int as total,
        count(${order.id})::int as orders
      from generate_series((now() at time zone 'Asia/Dhaka')::date - 29, (now() at time zone 'Asia/Dhaka')::date, interval '1 day') d
      left join ${order} on ${DHAKA_DAY} = d::date and ${order.status} not in ('cancelled', 'rejected')
      group by d order by d`),
    db.query.order.findMany({ orderBy: desc(order.createdAt), limit: 8, columns: { id: true, orderNumber: true, status: true, total: true, shippingName: true, createdAt: true } }),
    db
      .select({ id: productVariant.id, productId: product.id, name: product.name, size: productVariant.size, stock: productVariant.stock })
      .from(productVariant)
      .innerJoin(product, eq(product.id, productVariant.productId))
      .where(and(eq(product.status, "active"), lowStockCondition))
      .orderBy(productVariant.stock)
      .limit(8),
  ]);

  const days = daily.rows;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue collected" value={formatPrice(money.collected)} hint={<Link href="/admin/transactions?status=succeeded" className="underline">Transactions</Link>} />
        <StatCard label="To collect (COD)" value={formatPrice(money.outstanding)} hint="Pending on open orders" />
        <StatCard label="Awaiting verification" value={pending.n} tone={pending.n ? "warning" : "default"} hint={<Link href="/admin/orders?status=pending" className="underline">Review orders</Link>} />
        <StatCard label="Today" value={formatPrice(today.value)} hint={`${today.n} orders · ${customers.n} customers total`} />
      </div>

      <section className="rounded-sm border border-chocolate/15 bg-ivory p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="eyebrow">Sales, last 30 days</h2>
          <p className="text-sm text-chocolate">{formatPrice(days.reduce((s, d) => s + d.total, 0))} · {days.reduce((s, d) => s + d.orders, 0)} orders</p>
        </div>
        <SalesChart days={days} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-sm border border-chocolate/15 bg-ivory">
          <div className="flex items-center justify-between border-b border-chocolate/10 px-5 py-3">
            <h2 className="eyebrow">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs text-chocolate underline">All orders</Link>
          </div>
          <ul className="divide-y divide-chocolate/10">
            {recent.length === 0 && <li className="px-5 py-8 text-center text-sm text-chocolate">No orders yet.</li>}
            {recent.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-surface/60">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{o.orderNumber}</p>
                    <p className="truncate text-xs text-chocolate">{o.shippingName} · {formatDateTime(o.createdAt)}</p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                  <span className="w-20 text-right font-medium">{formatPrice(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-sm border border-chocolate/15 bg-ivory">
          <div className="flex items-center justify-between border-b border-chocolate/10 px-5 py-3">
            <h2 className="eyebrow">Stock alerts</h2>
            <Link href="/admin/inventory?filter=low" className="text-xs text-chocolate underline">Inventory</Link>
          </div>
          <ul className="divide-y divide-chocolate/10">
            {lowStock.length === 0 && <li className="px-5 py-8 text-center text-sm text-chocolate">All sizes are well stocked.</li>}
            {lowStock.map((v) => (
              <li key={v.id}>
                <Link href={`/admin/products/${v.productId}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-surface/60">
                  <span className="flex-1 truncate">{v.name}</span>
                  <span className="text-xs text-chocolate">Size {v.size}</span>
                  {v.stock === 0 ? <Badge tone="danger">Out</Badge> : <Badge tone="warning">{v.stock} left</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
