import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { AdminHeading, EmptyRow, readSort, SortHeader, Table, Td, Th } from "@/components/admin/table";
import { Toolbar } from "@/components/admin/toolbar";
import { Pagination } from "@/components/pagination";
import { Badge, Skeleton, Stars } from "@/components/ui/misc";
import { db } from "@/db";
import { product, review, user } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { intParam, param, type SearchParams } from "@/lib/search-params";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Reviews" };
const PER_PAGE = 20;
const SORTS = ["createdAt", "rating"] as const;

export default function ReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  return (
    <>
      <AdminHeading title="Reviews" description="Hide or remove reviews. Hidden reviews don't count toward ratings." />
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
  const rating = intParam(sp, "rating");
  const visibility = param(sp, "visibility");
  const sorting = readSort(sp, SORTS, "createdAt");

  const filters: (SQL | undefined)[] = [];
  if (q) {
    const term = `%${q.replace(/[%_]/g, "")}%`;
    filters.push(or(ilike(review.body, term), ilike(product.name, term), ilike(user.name, term)));
  }
  if (rating && rating >= 1 && rating <= 5) filters.push(eq(review.rating, rating));
  if (visibility === "hidden") filters.push(eq(review.isHidden, true));
  if (visibility === "visible") filters.push(eq(review.isHidden, false));
  const where = and(...filters);

  const sortCol = sorting.sort === "rating" ? review.rating : review.createdAt;
  const ids = await db
    .select({ id: review.id })
    .from(review)
    .innerJoin(product, eq(product.id, review.productId))
    .innerJoin(user, eq(user.id, review.userId))
    .where(where)
    .orderBy(sorting.dir === "asc" ? asc(sortCol) : desc(sortCol))
    .limit(PER_PAGE)
    .offset((page - 1) * PER_PAGE);
  const [rows, [{ total }]] = await Promise.all([
    ids.length
      ? db.query.review.findMany({
          where: (r, { inArray }) => inArray(r.id, ids.map((i) => i.id)),
          with: { product: { columns: { name: true, slug: true } }, user: { columns: { id: true, name: true } }, media: true },
        })
      : Promise.resolve([]),
    db.select({ total: count() }).from(review).innerJoin(product, eq(product.id, review.productId)).innerJoin(user, eq(user.id, review.userId)).where(where),
  ]);
  const ordered = ids.map((i) => rows.find((r) => r.id === i.id)!).filter(Boolean);

  const base = "/admin/reviews";
  return (
    <>
      <Toolbar
        searchPlaceholder="Text, product or customer"
        filters={[
          { key: "rating", label: "Rating", options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} stars` })) },
          { key: "visibility", label: "Visibility", options: [{ value: "visible", label: "Visible" }, { value: "hidden", label: "Hidden" }] },
        ]}
      />
      <Table
        head={
          <>
            <Th>Review</Th>
            <Th>Product</Th>
            <SortHeader label="Rating" field="rating" base={base} sp={sp} current={sorting} />
            <SortHeader label="Date" field="createdAt" base={base} sp={sp} current={sorting} />
            <Th />
          </>
        }
        minWidth={820}
      >
        {ordered.length === 0 && <EmptyRow cols={5} />}
        {ordered.map((r) => (
          <tr key={r.id} className={r.isHidden ? "opacity-60" : ""}>
            <Td className="max-w-md">
              <p className="text-xs text-chocolate">
                <Link href={`/admin/customers/${r.user.id}`} className="hover:underline">{r.user.name}</Link>
                {r.isHidden && <Badge tone="outline" className="ml-2">Hidden</Badge>}
              </p>
              <p className="mt-1 line-clamp-3">{r.body}</p>
              {r.media.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {r.media.map((m) => (
                    <a key={m.id} href={mediaUrl(m.key)} target="_blank" rel="noopener noreferrer" className="relative block h-10 w-10 overflow-hidden rounded-sm bg-espresso text-[9px] text-ivory">
                      {m.type === "image" ? <Image src={mediaUrl(m.key)} alt="" fill sizes="40px" className="object-cover" /> : <span className="flex h-full items-center justify-center">VIDEO</span>}
                    </a>
                  ))}
                </div>
              )}
            </Td>
            <Td><Link href={`/product/${r.product.slug}#reviews`} target="_blank" className="hover:underline">{r.product.name}</Link></Td>
            <Td><Stars value={r.rating} size={12} /></Td>
            <Td className="text-xs text-chocolate">{formatDate(r.createdAt)}</Td>
            <Td><ReviewModeration reviewId={r.id} hidden={r.isHidden} /></Td>
          </tr>
        ))}
      </Table>
      <Pagination base={base} sp={sp} page={page} pageCount={Math.ceil(total / PER_PAGE)} />
    </>
  );
}
