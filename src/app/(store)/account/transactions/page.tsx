import { count, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PROVIDER_LABEL, TxnStatusBadge } from "@/components/order-status";
import { Pagination } from "@/components/pagination";
import { EmptyState, PageHeading, Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { transaction } from "@/db/schema";
import { formatDateTime, formatPrice } from "@/lib/format";
import { intParam, type SearchParams } from "@/lib/search-params";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My transactions", robots: { index: false } };
const PER_PAGE = 15;

export default function TransactionsPage({ searchParams }: PageProps<"/account/transactions">) {
  return (
    <>
      <PageHeading eyebrow="My account" title="Transactions" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser("/account/transactions");
  const sp = await searchParams;
  const page = Math.max(1, intParam(sp, "page") ?? 1);
  const where = eq(transaction.userId, user.id);

  const [rows, [{ total }], paid] = await Promise.all([
    db.query.transaction.findMany({
      where,
      orderBy: desc(transaction.createdAt),
      limit: PER_PAGE,
      offset: (page - 1) * PER_PAGE,
      with: { order: { columns: { id: true, orderNumber: true } } },
    }),
    db.select({ total: count() }).from(transaction).where(where),
    db.query.transaction.findMany({ where, columns: { amount: true, status: true, type: true } }),
  ]);
  const totalPaid = paid.filter((t) => t.status === "succeeded").reduce((s, t) => s + (t.type === "refund" ? -t.amount : t.amount), 0);

  if (!rows.length) return <EmptyState title="No transactions yet">Payments for your orders will appear here.</EmptyState>;

  return (
    <>
      <div className="mb-6 rounded-sm bg-surface p-5">
        <p className="eyebrow text-chocolate">Total paid</p>
        <p className="heading-display mt-1 text-3xl">{formatPrice(totalPaid)}</p>
      </div>
      <div className="overflow-x-auto rounded-sm border border-chocolate/15">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-chocolate">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-chocolate/10">
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3">
                  <p className="font-mono text-xs">{t.reference}</p>
                  <p className="text-xs text-chocolate">{formatDateTime(t.createdAt)}</p>
                </td>
                <td className="px-4 py-3"><Link href={`/account/orders/${t.order.id}`} className="underline underline-offset-4">{t.order.orderNumber}</Link></td>
                <td className="px-4 py-3">{PROVIDER_LABEL[t.provider]}</td>
                <td className="px-4 py-3"><TxnStatusBadge status={t.status} /></td>
                <td className="px-4 py-3 text-right font-medium">{t.type === "refund" && "-"}{formatPrice(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination base="/account/transactions" sp={sp} page={page} pageCount={Math.ceil(total / PER_PAGE)} />
    </>
  );
}
