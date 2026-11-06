import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CartQuantity } from "@/components/store/cart-quantity";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeading, Skeleton } from "@/components/ui/misc";
import { formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { getUser } from "@/lib/session";
import { getCart } from "@/server/cart";

export const metadata: Metadata = { title: "Shopping Bag", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-page py-10">
      <PageHeading title="Shopping Bag" />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <CartContent />
      </Suspense>
    </div>
  );
}

async function CartContent() {
  const [cart, user] = await Promise.all([getCart(), getUser()]);

  if (!cart.lines.length) {
    return (
      <EmptyState title="Your bag is empty" action={<ButtonLink href="/shop">Continue shopping</ButtonLink>}>
        Pieces you add will appear here.
      </EmptyState>
    );
  }

  const savings = cart.regularTotal - cart.subtotal;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <ul className="divide-y divide-chocolate/10 border-y border-chocolate/10">
        {cart.lines.map((l) => (
          <li key={l.id} className="flex gap-4 py-5">
            <Link href={`/product/${l.slug}`} className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-sm bg-ivory-alt sm:w-28">
              <Image src={mediaUrl(l.imageKey)} alt={l.name} fill sizes="112px" className="object-cover" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex justify-between gap-4">
                <div className="min-w-0">
                  <Link href={`/product/${l.slug}`} className="line-clamp-2 text-sm hover:underline">{l.name}</Link>
                  <p className="mt-1 text-xs text-chocolate">Size {l.size}{l.color && ` · ${l.color}`}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{formatPrice(l.lineTotal)}</p>
                  {l.regularPrice > l.unitPrice && <p className="text-xs text-chocolate/70 line-through">{formatPrice(l.regularPrice * l.quantity)}</p>}
                </div>
              </div>
              {l.issue && <p className="mt-2 text-xs text-danger">{l.issue}</p>}
              <div className="mt-auto pt-3">
                <CartQuantity itemId={l.id} quantity={l.quantity} max={Math.max(l.available, l.quantity)} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-sm bg-surface p-6 lg:sticky lg:top-28">
        <h2 className="eyebrow mb-4">Order summary</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-chocolate">Subtotal ({cart.count} items)</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
          {savings > 0 && <div className="flex justify-between"><dt className="text-chocolate">You save</dt><dd>-{formatPrice(savings)}</dd></div>}
          <div className="flex justify-between"><dt className="text-chocolate">Delivery</dt><dd className="text-chocolate">Calculated at checkout</dd></div>
        </dl>
        <div className="mt-4 flex justify-between border-t border-chocolate/15 pt-4 font-medium">
          <span>Total</span>
          <span>{formatPrice(cart.subtotal)}</span>
        </div>
        {cart.hasIssues ? (
          <p className="mt-6 text-sm text-danger">Please update the highlighted items before checking out.</p>
        ) : (
          <ButtonLink href={user ? "/checkout" : "/login?next=/checkout"} size="lg" className="mt-6 w-full">
            {user ? "Checkout" : "Sign in to checkout"}
          </ButtonLink>
        )}
        <p className="mt-3 text-center text-xs text-chocolate">Cash on delivery available across Bangladesh</p>
      </aside>
    </div>
  );
}
