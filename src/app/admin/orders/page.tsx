import { and, asc, count, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeading, EmptyRow, readSort, SortHeader, Table, Td, Th } from "@/components/admin/table";
import { Toolbar } from "@/components/admin/toolbar";
import { ORDER_LABEL, OrderStatusBadge, PaymentStatusBadge } from "@/components/order-status";
import { Pagination } from "@/components/pagination";
import { Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { order, orderItem, orderStatus, paymentStatus, user } from "@/db/schema";
import { formatDateTime, formatPrice } from "@/lib/format";
import { formatBdPhone } from "@/lib/phone";
import { intParam, param, type SearchParams } from "@/lib/search-params";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Orders" };
const PER_PAGE = 20;
const SORTS = ["createdAt", "total", "orderNumber"] as const;

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <>
      <AdminHeading title="Orders" description="Verify cash-on-delivery orders and move them through fulfilment." />
      <Suspense fallback={<Skeleton className="h-[500px]" />}>
        <OrdersTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function dayStart(s?: string) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  return new Date(`${s}T00:00:00+06:00`);
}

async function OrdersTable({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, intParam(sp, "page") ?? 1);
  const q = param(sp, "q");
  const status = param(sp, "status");
  const pay = param(sp, "payment");
  const from = dayStart(param(sp, "from"));
  const to = dayStart(param(sp, "to"));
  const sorting = readSort(sp, SORTS, "createdAt");

  const filters: (SQL | undefined)[] = [];
  if (q) {
    const term = `%${q.replace(/[%_]/g, "")}%`;
    filters.push(or(ilike(order.orderNumber, term), ilike(order.shippingName, term), ilike(order.shippingPhone, term), ilike(user.email, term)));
  }
  if (status && (orderStatus.enumValues as string[]).includes(status)) filters.push(eq(order.status, status as never));
  if (pay && (paymentStatus.enumValues as string[]).includes(pay)) filters.push(eq(order.paymentStatus, pay as never));
  if (from) filters.push(gte(order.createdAt, from));
  if (to) filters.push(lt(order.createdAt, new Date(to.getTime() + 86400000)));
  const where = and(...filters);

  const col = { createdAt: order.createdAt, total: order.total, orderNumber: order.orderNumber }[sorting.sort];
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        createdAt: order.createdAt,
        name: order.shippingName,
        phone: order.shippingPhone,
        district: order.shippingDistrict,
        email: user.email,
        items: sql<number>`(select coalesce(sum(${orderItem.quantity}), 0)::int from ${orderItem} where ${orderItem.orderId} = ${order.id})`,
      })
      .from(order)
      .innerJoin(user, eq(user.id, order.userId))
      .where(where)
      .orderBy(sorting.dir === "asc" ? asc(col) : desc(col))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: count() }).from(order).innerJoin(user, eq(user.id, order.userId)).where(where),
  ]);

  const base = "/admin/orders";
  return (
    <>
      <Toolbar
        searchPlaceholder="Order #, name, phone, email"
        filters={[
          { key: "status", label: "Status", options: orderStatus.enumValues.map((s) => ({ value: s, label: ORDER_LABEL[s] })) },
          { key: "payment", label: "Payment", options: paymentStatus.enumValues.map((s) => ({ value: s, label: s.replace("_", " ") })) },
          { key: "from", label: "From", type: "date" },
          { key: "to", label: "To", type: "date" },
        ]}
      />
      <p className="mb-2 text-xs text-chocolate">{total} orders</p>
      <Table
        head={
          <>
            <SortHeader label="Order" field="orderNumber" base={base} sp={sp} current={sorting} />
            <Th>Customer</Th>
            <Th>Status</Th>
            <Th>Payment</Th>
            <SortHeader label="Total" field="total" base={base} sp={sp} current={sorting} className="text-right" />
            <SortHeader label="Placed" field="createdAt" base={base} sp={sp} current={sorting} />
          </>
        }
      >
        {rows.length === 0 && <EmptyRow cols={6} />}
        {rows.map((o) => (
          <tr key={o.id} className="hover:bg-surface/60">
            <Td>
              <Link href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">{o.orderNumber}</Link>
              <p className="text-xs text-chocolate">{o.items} items</p>
            </Td>
            <Td>
              <p>{o.name}</p>
              <p className="text-xs text-chocolate">{formatBdPhone(o.phone)} · {o.district}</p>
            </Td>
            <Td><OrderStatusBadge status={o.status} /></Td>
            <Td><PaymentStatusBadge status={o.paymentStatus} /></Td>
            <Td className="text-right font-medium">{formatPrice(o.total)}</Td>
            <Td className="whitespace-nowrap text-xs text-chocolate">{formatDateTime(o.createdAt)}</Td>
          </tr>
        ))}
      </Table>
      <Pagination base={base} sp={sp} page={page} pageCount={Math.ceil(total / PER_PAGE)} />
    </>
  );
}
