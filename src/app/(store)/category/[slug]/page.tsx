import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { ListingSkeleton, ProductListing } from "@/components/store/listing";
import { Skeleton } from "@/components/ui/misc";
import { absoluteUrl } from "@/lib/site";
import { getCategoryBySlug } from "@/server/catalog";

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const cat = await getCategoryBySlug((await params).slug);
  if (!cat) return { title: "Not found", robots: { index: false } };
  return {
    title: cat.seoTitle || `Men's ${cat.name}`,
    description: cat.seoDescription || cat.description || `Shop men's ${cat.name.toLowerCase()} at QAHAF. Cash on delivery across Bangladesh.`,
    alternates: { canonical: `/category/${cat.slug}` },
  };
}

export default function CategoryPage(props: PageProps<"/category/[slug]">) {
  return (
    <div className="container-page py-10">
      <Suspense fallback={<><Skeleton className="mb-8 h-12 w-64" /><ListingSkeleton /></>}>
        <CategoryContent {...props} />
      </Suspense>
    </div>
  );
}

async function CategoryContent({ params, searchParams }: PageProps<"/category/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();

  const crumbs = [
    { name: "Home", url: "/" },
    ...(cat.parent ? [{ name: cat.parent.name, url: `/category/${cat.parent.slug}` }] : []),
    { name: cat.name, url: `/category/${cat.slug}` },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.url) })),
        }}
      />
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-chocolate">
        {crumbs.map((c, i) => (
          <span key={c.url}>
            {i > 0 && <span className="mx-2">/</span>}
            {i < crumbs.length - 1 ? <Link href={c.url} className="hover:underline">{c.name}</Link> : <span aria-current="page">{c.name}</span>}
          </span>
        ))}
      </nav>
      <div className="mb-8">
        <h1 className="heading-display text-4xl sm:text-5xl">{cat.name}</h1>
        {cat.description && <p className="mt-3 max-w-2xl text-chocolate">{cat.description}</p>}
        {cat.children.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {cat.children.map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className="inline-block rounded-sm border border-chocolate/30 px-3 py-1.5 text-xs uppercase tracking-wider hover:border-espresso">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ProductListing base={`/category/${cat.slug}`} sp={sp} categoryIds={[cat.id, ...cat.children.map((c) => c.id)]} />
    </>
  );
}
