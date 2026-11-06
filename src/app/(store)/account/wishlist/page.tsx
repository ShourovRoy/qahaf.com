import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductCard } from "@/components/store/product-card";
import { WishlistRemove } from "@/components/store/wishlist-remove";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeading, Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { wishlistItem } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default function WishlistPage() {
  return (
    <>
      <PageHeading eyebrow="My account" title="Wishlist" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  const user = await requireUser("/account/wishlist");
  const items = await db.query.wishlistItem.findMany({
    where: eq(wishlistItem.userId, user.id),
    orderBy: desc(wishlistItem.createdAt),
    with: {
      product: {
        columns: { id: true, name: true, slug: true, regularPrice: true, salePrice: true, ratingSum: true, ratingCount: true, status: true, createdAt: true },
        with: {
          media: { columns: { key: true, alt: true }, where: (m, { eq }) => eq(m.type, "image"), orderBy: (m, { asc }) => asc(m.sortOrder), limit: 2 },
          variants: { columns: { stock: true } },
        },
      },
    },
  });

  const products = items.filter((i) => i.product.status === "active").map(({ product: p }) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    regularPrice: p.regularPrice,
    salePrice: p.salePrice,
    ratingSum: p.ratingSum,
    ratingCount: p.ratingCount,
    images: p.media.map((m) => m.key),
    alt: p.media[0]?.alt ?? p.name,
    inStock: p.variants.some((v) => v.stock > 0),
    isNew: false,
  }));

  if (!products.length) {
    return (
      <EmptyState title="Your wishlist is empty" action={<ButtonLink href="/shop">Discover pieces</ButtonLink>}>
        Tap the heart on any product to save it here.
      </EmptyState>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3">
      {products.map((p) => (
        <div key={p.id}>
          <ProductCard product={p} />
          <WishlistRemove productId={p.id} />
        </div>
      ))}
    </div>
  );
}
