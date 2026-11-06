import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeading, EmptyRow, readSort, SortHeader, Table, Td, Th } from "@/components/admin/table";
import { Toolbar } from "@/components/admin/toolbar";
import { Pagination } from "@/components/pagination";
import { Badge, Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { order, transaction, user } from "@/db/schema";
import { formatDate, formatPrice } from "@/lib/format";
import { formatBdPhone } from "@/lib/phone";
import { intParam, param, type SearchParams } from "@/lib/search-params";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Customers" };
const PER_PAGE = 25;
const SORTS = ["createdAt", "name", "orders", "spent"] as const;

export default function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  return (
    <>
      <AdminHeading title="Customers" />
      <Suspense fallback={<Skeleton className="h-[500px]" />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, intParam(sp, "page") ?? 1);
  const q = param(sp, "q");
  const status = param(sp, "status");
  const role = param(sp, "role");
  const sorting = readSort(sp, SORTS, "createdAt");

  // Single-table selects drop table names, so spell out "user"."id" or it binds to the subquery's own id.
  const userId = sql`${user}.${sql.identifier("id")}`;
  const orders = sql<number>`(select count(*)::int from ${order} where ${order.userId} = ${userId})`;
  const spent = sql<number>`(select coalesce(sum(${transaction.amount}), 0)::int from ${transaction} where ${transaction.userId} = ${userId} and ${transaction.status} = 'succeeded' and ${transaction.type} = 'charge')`;

  const filters: (SQL | undefined)[] = [];
  if (q) {
    const term = `%${q.replace(/[%_]/g, "")}%`;
    filters.push(or(ilike(user.name, term), ilike(user.email, term), ilike(user.phone, term)));
  }
  if (status === "verified") filters.push(eq(user.emailVerified, true));
  if (status === "unverified") filters.push(eq(user.emailVerified, false));
  if (status === "blocked") filters.push(eq(user.isBlocked, true));
  if (role === "admin" || role === "customer") filters.push(eq(user.role, role));
  const where = and(...filters);

  const sortCol = { createdAt: user.createdAt, name: user.name, orders, spent }[sorting.sort];
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, emailVerified: user.emailVerified, isBlocked: user.isBlocked, createdAt: user.createdAt, orders, spent })
      .from(user)
      .where(where)
      .orderBy(sorting.dir === "asc" ? asc(sortCol) : desc(sortCol))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: count() }).from(user).where(where),
  ]);

  const base = "/admin/customers";
  return (
    <>
      <Toolbar
        searchPlaceholder="Name, email or phone"
        filters={[
          { key: "status", label: "Status", options: [{ value: "verified", label: "Verified" }, { value: "unverified", label: "Unverified" }, { value: "blocked", label: "Blocked" }] },
          { key: "role", label: "Role", options: [{ value: "customer", label: "Customer" }, { value: "admin", label: "Admin" }] },
        ]}
      />
      <p className="mb-2 text-xs text-chocolate">{total} accounts</p>
      <Table
        head={
          <>
            <SortHeader label="Name" field="name" base={base} sp={sp} current={sorting} />
            <Th>Contact</Th>
            <Th>Status</Th>
            <SortHeader label="Orders" field="orders" base={base} sp={sp} current={sorting} />
            <SortHeader label="Spent" field="spent" base={base} sp={sp} current={sorting} />
            <SortHeader label="Joined" field="createdAt" base={base} sp={sp} current={sorting} />
          </>
        }
      >
        {rows.length === 0 && <EmptyRow cols={6} />}
        {rows.map((u) => (
          <tr key={u.id} className="hover:bg-surface/60">
            <Td>
              <Link href={`/admin/customers/${u.id}`} className="font-medium hover:underline">{u.name}</Link>
              {u.role === "admin" && <Badge tone="dark" className="ml-2">Admin</Badge>}
            </Td>
            <Td>
              <p>{u.email}</p>
              {u.phone && <p className="text-xs text-chocolate">{formatBdPhone(u.phone)}</p>}
            </Td>
            <Td>
              {u.isBlocked ? <Badge tone="danger">Blocked</Badge> : u.emailVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
            </Td>
            <Td>{u.orders}</Td>
            <Td>{formatPrice(u.spent)}</Td>
            <Td className="text-xs text-chocolate">{formatDate(u.createdAt)}</Td>
          </tr>
        ))}
      </Table>
      <Pagination base={base} sp={sp} page={page} pageCount={Math.ceil(total / PER_PAGE)} />
    </>
  );
}
