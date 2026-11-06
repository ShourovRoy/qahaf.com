import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { intParam, param, type SearchParams } from "@/lib/search-params";
import { getAvailableSizes, listProducts, SORTS, type SortKey } from "@/server/catalog";
import { ListingFilters } from "./listing-filters";
import { ProductGrid } from "./product-card";

export async function ProductListing({ base, sp, categoryIds }: { base: string; sp: SearchParams; categoryIds?: string[] }) {
  const sortParam = param(sp, "sort");
  const sort: SortKey = SORTS.includes(sortParam as SortKey) ? (sortParam as SortKey) : "featured";
  const [result, sizes] = await Promise.all([
    listProducts({
      categoryIds,
      q: param(sp, "q")?.slice(0, 80),
      sort,
      sale: param(sp, "sale") === "1",
      size: param(sp, "size"),
      min: intParam(sp, "min"),
      max: intParam(sp, "max"),
      page: intParam(sp, "page"),
    }),
    getAvailableSizes(),
  ]);

  return (
    <>
      <ListingFilters
        total={result.total}
        sizes={sizes}
        current={{ sort, size: param(sp, "size") ?? "", sale: param(sp, "sale") === "1", min: param(sp, "min") ?? "", max: param(sp, "max") ?? "", q: param(sp, "q") ?? "" }}
      />
      {result.items.length ? (
        <>
          <ProductGrid products={result.items} priorityCount={4} />
          <Pagination base={base} sp={sp} page={result.page} pageCount={result.pageCount} />
        </>
      ) : (
        <EmptyState title="Nothing found" action={<ButtonLink href={base} variant="secondary">Clear filters</ButtonLink>}>
          Try a different size or price range, or browse the full collection.
        </EmptyState>
      )}
    </>
  );
}

export function ListingSkeleton() {
  return (
    <>
      <Skeleton className="mb-8 h-11 w-full" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[4/5]" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/3" />
          </div>
        ))}
      </div>
    </>
  );
}
