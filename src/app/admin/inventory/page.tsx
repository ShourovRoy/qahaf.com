import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StockEditor } from "@/components/admin/stock-editor";
import { AdminHeading, EmptyRow, readSort, SortHeader, StatCard, Table, Td, Th } from "@/components/admin/table";
import { Toolbar } from "@/components/admin/toolbar";
import { Pagination } from "@/components/pagination";
import { Badge, Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { product, productVariant } from "@/db/schema";
import { intParam, param, type SearchParams } from "@/lib/search-params";
import { requireAdmin } from "@/lib/session";
import { lowStockCondition } from "@/server/admin";

export const metadata: Metadata = { title: "Inventory" };
const PER_PAGE = 30;
const SORTS = ["stock", "product", "sku"] as const;

export default function InventoryPage({ searchParams }: PageProps<"/admin/inventory">) {
  return (
    <>
      <AdminHeading title="Inventory" description="Stock per size. Rows at or below a product's alert level are flagged." />
      <Suspense fallback={<Skeleton className="h-[500px]" />}>
        <Inventory searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Inventory({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, intParam(sp, "page") ?? 1);
  const q = param(sp, "q");
  const filter = param(sp, "filter");
  const sorting = readSort(sp, SORTS, "stock");

  const filters: (SQL | undefined)[] = [];
  if (q) {
    const term = `%${q.replace(/[%_]/g, "")}%`;
    filters.push(or(ilike(product.name, term), ilike(productVariant.sku, term)));
  }
  if (filter === "low") filters.push(lowStockCondition);
  if (filter === "out") filters.push(eq(productVariant.stock, 0));
  if (param(sp, "status") !== "all") filters.push(eq(product.status, "active"));
  const where = and(...filters);

  const sortCol = { stock: productVariant.stock, product: product.name, sku: productVariant.sku }[sorting.sort];
  const dir = param(sp, "dir") ? sorting.dir : "asc";

  const [rows, [{ total }], [summary]] = await Promise.all([
    db
      .select({
        id: productVariant.id,
        sku: productVariant.sku,
        size: productVariant.size,
        color: productVariant.color,
        stock: productVariant.stock,
        productId: product.id,
        productName: product.name,
        status: product.status,
        threshold: product.lowStockThreshold,
      })
      .from(productVariant)
      .innerJoin(product, eq(product.id, productVariant.productId))
      .where(where)
      .orderBy(dir === "asc" ? asc(sortCol) : desc(sortCol), asc(product.name))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: count() }).from(productVariant).innerJoin(product, eq(product.id, productVariant.productId)).where(where),
    db
      .select({
        units: sql<number>`coalesce(sum(${productVariant.stock}), 0)::int`,
        low: sql<number>`count(*) filter (where ${lowStockCondition} and ${productVariant.stock} > 0)::int`,
        out: sql<number>`count(*) filter (where ${productVariant.stock} = 0)::int`,
      })
      .from(productVariant)
      .innerJoin(product, eq(product.id, productVariant.productId))
      .where(eq(product.status, "active")),
  ]);

  const base = "/admin/inventory";
  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Units in stock" value={summary.units} hint="Active products" />
        <StatCard label="Low stock" value={summary.low} tone={summary.low ? "warning" : "default"} hint={<Link href="?filter=low" className="underline">View</Link>} />
        <StatCard label="Out of stock" value={summary.out} tone={summary.out ? "warning" : "default"} hint={<Link href="?filter=out" className="underline">View</Link>} />
      </div>
      <Toolbar
        searchPlaceholder="Product or SKU"
        filters={[
          { key: "filter", label: "Stock", options: [{ value: "low", label: "Low (incl. out)" }, { value: "out", label: "Out of stock" }] },
          { key: "status", label: "Products", options: [{ value: "all", label: "Include drafts & archived" }] },
        ]}
      />
      <Table
        head={
          <>
            <SortHeader label="Product" field="product" base={base} sp={sp} current={{ ...sorting, dir }} />
            <SortHeader label="SKU" field="sku" base={base} sp={sp} current={{ ...sorting, dir }} />
            <Th>Size</Th>
            <Th>Alert at</Th>
            <SortHeader label="Stock" field="stock" base={base} sp={sp} current={{ ...sorting, dir }} />
          </>
        }
      >
        {rows.length === 0 && <EmptyRow cols={5} />}
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-surface/60">
            <Td>
              <Link href={`/admin/products/${r.productId}`} className="hover:underline">{r.productName}</Link>
              {r.status !== "active" && <Badge tone="outline" className="ml-2">{r.status}</Badge>}
            </Td>
            <Td className="font-mono text-xs">{r.sku}</Td>
            <Td>{r.size}{r.color && ` / ${r.color}`}</Td>
            <Td className="text-chocolate">≤ {r.threshold}</Td>
            <Td>
              <div className="flex items-center gap-3">
                <StockEditor variantId={r.id} stock={r.stock} />
                {r.stock === 0 ? <Badge tone="danger">Out</Badge> : r.stock <= r.threshold ? <Badge tone="warning">Low</Badge> : null}
              </div>
            </Td>
          </tr>
        ))}
      </Table>
      <Pagination base={base} sp={sp} page={page} pageCount={Math.ceil(total / PER_PAGE)} />
    </>
  );
}
