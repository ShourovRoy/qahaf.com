import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { ProductGrid } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchase } from "@/components/store/product-purchase";
import { ProductReviews } from "@/components/store/product-reviews";
import { Badge, Skeleton, Stars } from "@/components/ui/misc";
import { discountPercent, formatPrice, ratingAverage } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { absoluteUrl, site } from "@/lib/site";
import { getProductBySlug, getRelatedProducts } from "@/server/catalog";

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: "Product not found", robots: { index: false } };
  const image = p.media.find((m) => m.type === "image");
  const description = p.seoDescription || p.shortDescription;
  return {
    title: p.seoTitle || p.name,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: {
      type: "website",
      title: p.name,
      description,
      url: `/product/${p.slug}`,
      images: image ? [{ url: mediaUrl(image.key), alt: image.alt ?? p.name }] : undefined,
    },
  };
}

export default function ProductPage(props: PageProps<"/product/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent {...props} />
    </Suspense>
  );
}

async function ProductContent({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();

  const related = await getRelatedProducts(p.id, p.categoryId);
  const price = p.salePrice ?? p.regularPrice;
  const off = discountPercent(p);
  const avg = ratingAverage(p);
  const inStock = p.variants.some((v) => v.stock > 0);
  const images = p.media.filter((m) => m.type === "image");

  return (
    <div className="container-page py-6 lg:py-10">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description: p.shortDescription,
            sku: p.variants[0]?.sku,
            image: images.map((m) => mediaUrl(m.key)),
            brand: { "@type": "Brand", name: site.name },
            category: p.category?.name,
            offers: {
              "@type": "Offer",
              url: absoluteUrl(`/product/${p.slug}`),
              priceCurrency: "BDT",
              price,
              availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
              shippingDetails: { "@type": "OfferShippingDetails", shippingDestination: { "@type": "DefinedRegion", addressCountry: "BD" } },
            },
            ...(p.ratingCount > 0 && {
              aggregateRating: { "@type": "AggregateRating", ratingValue: avg, reviewCount: p.ratingCount, bestRating: 5, worstRating: 1 },
            }),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
              ...(p.category ? [{ "@type": "ListItem", position: 2, name: p.category.name, item: absoluteUrl(`/category/${p.category.slug}`) }] : []),
              { "@type": "ListItem", position: p.category ? 3 : 2, name: p.name, item: absoluteUrl(`/product/${p.slug}`) },
            ],
          },
        ]}
      />

      <nav aria-label="Breadcrumb" className="mb-5 text-xs text-chocolate">
        <Link href="/" className="hover:underline">Home</Link>
        {p.category && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/category/${p.category.slug}`} className="hover:underline">{p.category.name}</Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span aria-current="page">{p.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        <ProductGallery media={p.media} name={p.name} />

        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="flex flex-wrap gap-2">
            {off > 0 && <Badge>Save {off}%</Badge>}
            {!inStock && <Badge tone="dark">Sold out</Badge>}
          </div>
          <h1 className="heading-display mt-3 text-4xl sm:text-5xl">{p.name}</h1>

          <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-chocolate">
            <Stars value={avg} />
            {p.ratingCount > 0 ? <span>{avg.toFixed(1)} · {p.ratingCount} {p.ratingCount === 1 ? "review" : "reviews"}</span> : <span>No reviews yet</span>}
          </a>

          <p className="mt-5 flex items-baseline gap-3">
            <span className="text-2xl font-medium">{formatPrice(price)}</span>
            {p.salePrice != null && (
              <>
                <span className="text-base text-chocolate/70 line-through">{formatPrice(p.regularPrice)}</span>
                <span className="text-sm text-chocolate">You save {formatPrice(p.regularPrice - p.salePrice)}</span>
              </>
            )}
          </p>

          <p className="mt-5 leading-relaxed text-chocolate">{p.shortDescription}</p>

          <ProductPurchase productId={p.id} variants={p.variants} sizeChart={p.sizeChart} />

          <div className="mt-8 divide-y divide-chocolate/10 border-y border-chocolate/10">
            {p.description && (
              <details className="group py-4" open>
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.15em]">
                  Details <span className="text-lg transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-chocolate">{p.description}</div>
              </details>
            )}
            {(p.fabric || p.careInstructions) && (
              <details className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.15em]">
                  Fabric &amp; care <span className="text-lg transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-3 space-y-2 text-sm text-chocolate">
                  {p.fabric && <p><span className="text-espresso">Fabric:</span> {p.fabric}</p>}
                  {p.careInstructions && <p className="whitespace-pre-line">{p.careInstructions}</p>}
                </div>
              </details>
            )}
            <details className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.15em]">
                Delivery &amp; payment <span className="text-lg transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-chocolate">Cash on delivery across Bangladesh. Orders are verified by our team before dispatch.</p>
            </details>
          </div>
        </div>
      </div>

      <section id="reviews" className="mt-20 scroll-mt-28" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" className="heading-display mb-6 text-3xl">Reviews</h2>
        <ProductReviews productId={p.id} slug={p.slug} avg={avg} count={p.ratingCount} />
      </section>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-6 text-lg uppercase tracking-[0.12em]">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-2 lg:gap-14">
      <Skeleton className="aspect-[4/5]" />
      <div className="space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
