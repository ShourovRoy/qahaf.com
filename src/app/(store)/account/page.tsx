import { and, count, desc, eq, notInArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrderProgress, OrderStatusBadge } from "@/components/order-status";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading, Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { order, wishlistItem } from "@/db/schema";
import { formatDate, formatPrice } from "@/lib/format";
import { formatBdPhone } from "@/lib/phone";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default function AccountPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const user = await requireUser("/account");
  const [active, [{ total }], [{ saved }]] = await Promise.all([
    db.query.order.findMany({
      where: and(eq(order.userId, user.id), notInArray(order.status, ["delivered", "cancelled", "rejected"])),
      orderBy: desc(order.createdAt),
      limit: 5,
    }),
    db.select({ total: count() }).from(order).where(eq(order.userId, user.id)),
    db.select({ saved: count() }).from(wishlistItem).where(eq(wishlistItem.userId, user.id)),
  ]);

  return (
    <>
      <PageHeading eyebrow="My account" title={`Hello, ${user.name.split(" ")[0]}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Orders" value={total} href="/account/orders" />
        <Stat label="Active orders" value={active.length} href="/account/orders?status=active" />
        <Stat label="Wishlist" value={saved} href="/account/wishlist" />
      </div>

      <section className="mt-10">
        <h2 className="eyebrow mb-4">Current orders</h2>
        {active.length === 0 ? (
          <div className="rounded-sm bg-surface p-6 text-sm text-chocolate">
            No orders in progress. <Link href="/shop" className="text-espresso underline underline-offset-4">Start shopping</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {active.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.id}`} className="block rounded-sm border border-chocolate/15 p-5 hover:border-chocolate">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{o.orderNumber}</p>
                      <p className="text-xs text-chocolate">{formatDate(o.createdAt)} · {formatPrice(o.total)}</p>
                    </div>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <OrderProgress status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-sm bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="eyebrow mb-3">Profile</h2>
            <p className="text-sm">{user.name}</p>
            <p className="text-sm text-chocolate">{user.email}</p>
            {user.phone && <p className="text-sm text-chocolate">{formatBdPhone(user.phone)}</p>}
          </div>
          <ButtonLink href="/account/profile" variant="secondary" size="sm">Edit profile</ButtonLink>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-sm border border-chocolate/15 p-5 hover:border-chocolate">
      <p className="eyebrow text-chocolate">{label}</p>
      <p className="heading-display mt-2 text-4xl">{value}</p>
    </Link>
  );
}
