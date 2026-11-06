import { and, asc, count, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeading, EmptyRow, readSort, SortHeader, StatCard, Table, Td, Th } from "@/components/admin/table";
import { Toolbar } from "@/components/admin/toolbar";
import { PROVIDER_LABEL, TxnStatusBadge } from "@/components/order-status";
import { Pagination } from "@/components/pagination";
import { Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { order, paymentProvider, transaction, transactionStatus, user } from "@/db/schema";
import { formatDateTime, formatPrice } from "@/lib/format";
import { intParam, param, type SearchParams } from "@/lib/search-params";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Transactions" };
const PER_PAGE = 25;
const SORTS = ["createdAt", "amount"] as const;

export default function TransactionsPage({ searchParams }: PageProps<"/admin/transactions">) {
  return (
    <>
      <AdminHeading title="Transactions" description="Money movements across all orders. COD charges succeed when an order is delivered." />
      <Suspense fallback={<Skeleton className="h-[500px]" />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function day(s?: string) {
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00+06:00`) : undefined;
}

async function Board({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, intParam(sp, "page") ?? 1);
  const q = param(sp, "q");
  const status = param(sp, "status");
  const provider = param(sp, "provider");
  const type = param(sp, "type");
  const from = day(param(sp, "from"));
  const to = day(param(sp, "to"));
  const sorting = readSort(sp, SORTS, "createdAt");

  const filters: (SQL | undefined)[] = [];
  if (q) {
    const term = `%${q.replace(/[%_]/g, "")}%`;
    filters.push(or(ilike(transaction.reference, term), ilike(order.orderNumber, term), ilike(user.name, term), ilike(transaction.providerTransactionId, term)));
  }
  if (status && (transactionStatus.enumValues as string[]).includes(status)) filters.push(eq(transaction.status, status as never));
  if (provider && (paymentProvider.enumValues as string[]).includes(provider)) filters.push(eq(transaction.provider, provider as never));
  if (type === "charge" || type === "refund") filters.push(eq(transaction.type, type));
  if (from) filters.push(gte(transaction.createdAt, from));
  if (to) filters.push(lt(transaction.createdAt, new Date(to.getTime() + 86400000)));
  const where = and(...filters);

  const sortCol = sorting.sort === "amount" ? transaction.amount : transaction.createdAt;
  const signed = sql`case when ${transaction.type} = 'refund' then -${transaction.amount} else ${transaction.amount} end`;

  const [rows, [{ total }], [sum]] = await Promise.all([
    db
      .select({
        id: transaction.id,
        reference: transaction.reference,
        provider: transaction.provider,
        type: transaction.type,
        status: transaction.status,
        amount: transaction.amount,
        createdAt: transaction.createdAt,
        completedAt: transaction.completedAt,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customer: user.name,
      })
      .from(transaction)
      .innerJoin(order, eq(order.id, transaction.orderId))
      .leftJoin(user, eq(user.id, transaction.userId))
      .where(where)
      .orderBy(sorting.dir === "asc" ? asc(sortCol) : desc(sortCol))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: count() }).from(transaction).innerJoin(order, eq(order.id, transaction.orderId)).leftJoin(user, eq(user.id, transaction.userId)).where(where),
    db
      .select({
        collected: sql<number>`coalesce(sum(${signed}) filter (where ${transaction.status} = 'succeeded'), 0)::int`,
        pending: sql<number>`coalesce(sum(${transaction.amount}) filter (where ${transaction.status} = 'pending'), 0)::int`,
        cancelled: sql<number>`coalesce(sum(${transaction.amount}) filter (where ${transaction.status} in ('cancelled', 'failed')), 0)::int`,
        succeededCount: sql<number>`count(*) filter (where ${transaction.status} = 'succeeded' and ${transaction.type} = 'charge')::int`,
      })
      .from(transaction)
      .innerJoin(order, eq(order.id, transaction.orderId))
      .leftJoin(user, eq(user.id, transaction.userId))
      .where(where),
  ]);

  const base = "/admin/transactions";
  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue collected" value={formatPrice(sum.collected)} hint="Succeeded, net of refunds" />
        <StatCard label="Pending (COD)" value={formatPrice(sum.pending)} hint="To be collected on delivery" />
        <StatCard label="Cancelled / failed" value={formatPrice(sum.cancelled)} />
        <StatCard label="Avg. order value" value={formatPrice(sum.succeededCount ? Math.round(sum.collected / sum.succeededCount) : 0)} hint={`${sum.succeededCount} paid orders`} />
      </div>
      <Toolbar
        searchPlaceholder="Reference, order #, customer"
        filters={[
          { key: "status", label: "Status", options: transactionStatus.enumValues.map((s) => ({ value: s, label: s })) },
          { key: "provider", label: "Method", options: paymentProvider.enumValues.map((p) => ({ value: p, label: PROVIDER_LABEL[p] })) },
          { key: "type", label: "Type", options: [{ value: "charge", label: "Charge" }, { value: "refund", label: "Refund" }] },
          { key: "from", label: "From", type: "date" },
          { key: "to", label: "To", type: "date" },
        ]}
      />
      <p className="mb-2 text-xs text-chocolate">{total} transactions · totals above reflect current filters</p>
      <Table
        head={
          <>
            <Th>Reference</Th>
            <Th>Order</Th>
            <Th>Customer</Th>
            <Th>Method</Th>
            <Th>Status</Th>
            <SortHeader label="Amount" field="amount" base={base} sp={sp} current={sorting} className="text-right" />
            <SortHeader label="Date" field="createdAt" base={base} sp={sp} current={sorting} />
          </>
        }
      >
        {rows.length === 0 && <EmptyRow cols={7} />}
        {rows.map((t) => (
          <tr key={t.id} className="hover:bg-surface/60">
            <Td><Link href={`/admin/transactions/${t.id}`} className="font-mono text-xs hover:underline">{t.reference}</Link></Td>
            <Td><Link href={`/admin/orders/${t.orderId}`} className="hover:underline">{t.orderNumber}</Link></Td>
            <Td>{t.customer ?? "—"}</Td>
            <Td className="text-chocolate">{PROVIDER_LABEL[t.provider]}{t.type === "refund" && " · refund"}</Td>
            <Td><TxnStatusBadge status={t.status} /></Td>
            <Td className="text-right font-medium">{t.type === "refund" && "-"}{formatPrice(t.amount)}</Td>
            <Td className="whitespace-nowrap text-xs text-chocolate">{formatDateTime(t.createdAt)}</Td>
          </tr>
        ))}
      </Table>
      <Pagination base={base} sp={sp} page={page} pageCount={Math.ceil(total / PER_PAGE)} />
    </>
  );
}
