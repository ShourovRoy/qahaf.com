import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BlockCustomerButton } from "@/components/admin/block-customer";
import { StatCard, Table, Td, Th } from "@/components/admin/table";
import { OrderStatusBadge } from "@/components/order-status";
import { Badge, Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { address, order, user } from "@/db/schema";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { formatBdPhone } from "@/lib/phone";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Customer" };

export default function CustomerPage(props: PageProps<"/admin/customers/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Detail {...props} />
    </Suspense>
  );
}

async function Detail({ params }: PageProps<"/admin/customers/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const u = await db.query.user.findFirst({ where: eq(user.id, id) });
  if (!u) notFound();

  const [orders, addresses] = await Promise.all([
    db.query.order.findMany({ where: eq(order.userId, id), orderBy: desc(order.createdAt), limit: 50 }),
    db.query.address.findMany({ where: eq(address.userId, id) }),
  ]);
  const delivered = orders.filter((o) => o.status === "delivered");
  const spent = delivered.reduce((s, o) => s + o.total, 0);
  const rejected = orders.filter((o) => o.status === "rejected" || o.status === "cancelled").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/customers" className="text-xs uppercase tracking-wider text-chocolate hover:underline">← Customers</Link>
          <h1 className="heading-display mt-2 text-3xl sm:text-4xl">{u.name}</h1>
          <p className="mt-1 text-sm text-chocolate">{u.email}{u.phone && ` · ${formatBdPhone(u.phone)}`} · joined {formatDate(u.createdAt)}</p>
          <div className="mt-2 flex gap-2">
            {u.role === "admin" && <Badge tone="dark">Admin</Badge>}
            {u.emailVerified ? <Badge tone="success">Email verified</Badge> : <Badge tone="warning">Unverified</Badge>}
            {u.isBlocked && <Badge tone="danger">Blocked</Badge>}
          </div>
        </div>
        {u.id !== admin.id && <BlockCustomerButton userId={u.id} blocked={u.isBlocked} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders" value={orders.length} />
        <StatCard label="Delivered spend" value={formatPrice(spent)} />
        <StatCard label="Cancelled / rejected" value={rejected} tone={rejected >= 3 ? "warning" : "default"} hint={rejected >= 3 ? "Consider verifying carefully" : undefined} />
      </div>

      <section>
        <h2 className="eyebrow mb-3">Orders</h2>
        <Table head={<><Th>Order</Th><Th>Status</Th><Th className="text-right">Total</Th><Th>Placed</Th></>} minWidth={520}>
          {orders.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-chocolate">No orders yet.</td></tr>}
          {orders.map((o) => (
            <tr key={o.id}>
              <Td><Link href={`/admin/orders/${o.id}`} className="hover:underline">{o.orderNumber}</Link></Td>
              <Td><OrderStatusBadge status={o.status} /></Td>
              <Td className="text-right">{formatPrice(o.total)}</Td>
              <Td className="text-xs text-chocolate">{formatDateTime(o.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      </section>

      {addresses.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Saved addresses</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {addresses.map((a) => (
              <li key={a.id} className="rounded-sm border border-chocolate/15 p-4 text-sm">
                <p className="font-medium">{a.label}{a.isDefault && " (default)"}</p>
                <p className="text-chocolate">{a.fullName} · {formatBdPhone(a.phone)}</p>
                <p className="text-chocolate">{a.addressLine}, {a.area}, {a.district} {a.postcode}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
