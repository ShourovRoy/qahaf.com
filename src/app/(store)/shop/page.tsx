import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingSkeleton, ProductListing } from "@/components/store/listing";
import { PageHeading } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Shop All Menswear",
  description: "Browse QAHAF shirts, trousers, outerwear, shoes and accessories. Cash on delivery across Bangladesh.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <div className="container-page py-10">
      <PageHeading eyebrow="The Collection" title="Shop All" />
      <Suspense fallback={<ListingSkeleton />}>
        <Listing searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Listing({ searchParams }: { searchParams: PageProps<"/shop">["searchParams"] }) {
  return <ProductListing base="/shop" sp={await searchParams} />;
}
