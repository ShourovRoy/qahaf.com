import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/store/checkout-form";
import { PageHeading, Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { address } from "@/db/schema";
import { formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { requireUser } from "@/lib/session";
import { getCart } from "@/server/cart";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-page py-10">
      <PageHeading title="Checkout" eyebrow="Cash on delivery" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}

async function CheckoutContent() {
  const user = await requireUser("/checkout");
  const [cart, settings, addresses] = await Promise.all([
    getCart(),
    getSettings(),
    db.query.address.findMany({ where: eq(address.userId, user.id), orderBy: [desc(address.isDefault), desc(address.updatedAt)] }),
  ]);
  if (!cart.lines.length) redirect("/cart");
  if (cart.hasIssues) redirect("/cart");

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <CheckoutForm
        addresses={addresses.map(({ id, label, fullName, phone, division, district, area, addressLine, postcode }) => ({ id, label, fullName, phone, division, district, area, addressLine, postcode }))}
        defaults={{ fullName: user.name, phone: user.phone ?? "" }}
        subtotal={cart.subtotal}
        shipping={{ inside: settings.shippingInsideDhaka, outside: settings.shippingOutsideDhaka, freeOver: settings.freeShippingThreshold }}
      />
      <aside className="h-fit rounded-sm bg-surface p-6 lg:sticky lg:top-28">
        <h2 className="eyebrow mb-4">Your bag ({cart.count})</h2>
        <ul className="space-y-4">
          {cart.lines.map((l) => (
            <li key={l.id} className="flex gap-3">
              <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-sm bg-ivory-alt">
                <Image src={mediaUrl(l.imageKey)} alt="" fill sizes="56px" className="object-cover" />
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-espresso px-1 text-[10px] text-ivory">{l.quantity}</span>
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="line-clamp-1">{l.name}</p>
                <p className="text-xs text-chocolate">Size {l.size}{l.color && ` · ${l.color}`}</p>
              </div>
              <p className="text-sm">{formatPrice(l.lineTotal)}</p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
