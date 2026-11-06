import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderStatusBadge, PROVIDER_LABEL, TxnStatusBadge } from "@/components/order-status";
import { Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { transaction } from "@/db/schema";
import { formatDateTime, formatPrice } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Transaction" };

export default function TransactionPage(props: PageProps<"/admin/transactions/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Detail {...props} />
    </Suspense>
  );
}

async function Detail({ params }: PageProps<"/admin/transactions/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const t = await db.query.transaction.findFirst({
    where: eq(transaction.id, id),
    with: { order: { columns: { id: true, orderNumber: true, status: true, total: true } }, user: { columns: { id: true, name: true, email: true } } },
  });
  if (!t) notFound();

  const rows: [string, React.ReactNode][] = [
    ["Reference", <span key="r" className="font-mono">{t.reference}</span>],
    ["Status", <TxnStatusBadge key="s" status={t.status} />],
    ["Type", t.type],
    ["Amount", <span key="a" className="font-medium">{t.type === "refund" && "-"}{formatPrice(t.amount)} {t.currency}</span>],
    ["Method", PROVIDER_LABEL[t.provider]],
    ["Order", <span key="o" className="flex items-center gap-2"><Link href={`/admin/orders/${t.order.id}`} className="underline">{t.order.orderNumber}</Link><OrderStatusBadge status={t.order.status} /></span>],
    ["Customer", t.user ? <Link key="c" href={`/admin/customers/${t.user.id}`} className="underline">{t.user.name} ({t.user.email})</Link> : "—"],
    ["Created", formatDateTime(t.createdAt)],
    ["Completed", t.completedAt ? formatDateTime(t.completedAt) : "—"],
    ["Gateway transaction ID", t.providerTransactionId ?? "—"],
    ["Gateway session ID", t.providerSessionId ?? "—"],
    ["Failure / cancel reason", t.failureReason ?? "—"],
  ];

  return (
    <div className="max-w-3xl">
      <Link href="/admin/transactions" className="text-xs uppercase tracking-wider text-chocolate hover:underline">← Transactions</Link>
      <h1 className="heading-display mb-6 mt-2 text-3xl">Transaction</h1>
      <dl className="divide-y divide-chocolate/10 rounded-sm border border-chocolate/15 bg-ivory">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-5 py-3 text-sm sm:grid-cols-[200px_1fr]">
            <dt className="text-chocolate">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {t.providerPayload != null && (
        <details className="mt-6 rounded-sm border border-chocolate/15 p-4">
          <summary className="cursor-pointer text-xs uppercase tracking-wider text-chocolate">Raw gateway payload</summary>
          <pre className="mt-3 overflow-x-auto text-xs">{JSON.stringify(t.providerPayload, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
