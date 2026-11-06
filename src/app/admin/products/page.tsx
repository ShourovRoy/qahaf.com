import { and, asc, count, desc, eq, exists, ilike, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeading, EmptyRow, readSort, SortHeader, Table, Td, Th } from "@/components/admin/table";
import { Toolbar } from "@/components/admin/toolbar";
import { Pagination } from "@/components/pagination";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { category, product, productMedia, productVariant } from "@/db/schema";
import { formatDate, formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { intParam, param, type SearchParams } from "@/lib/search-params";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Products" };
const PER_PAGE = 20;
const SORTS = ["createdAt", "name", "price", "stock"] as const;

export default function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <>
      <AdminHeading title="Products" actions={<ButtonLink href="/admin/products/new" size="sm"><Plus size={14} /> New product</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-[500px]" />}>
        <ProductsTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ProductsTable({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, intParam(sp, "page") ?? 1);
  const q = param(sp, "q");
  const status = param(sp, "status");
  const cat = param(sp, "category");
  const stockFilter = param(sp, "stock");
  const sorting = readSort(sp, SORTS, "createdAt");

  // Subqueries name the outer row in full, since single-table selects drop table names.
  const productId = sql`${product}.${sql.identifier("id")}`;
  const lowStockThreshold = sql`${product}.${sql.identifier("low_stock_threshold")}`;
  const totalStock = sql<number>`(select coalesce(sum(${productVariant.stock}), 0)::int from ${productVariant} where ${productVariant.productId} = ${productId})`;
  const filters: (SQL | undefined)[] = [];
  if (q) {
    const term = `%${q.replace(/[%_]/g, "")}%`;
    filters.push(
      or(
        ilike(product.name, term),
        exists(db.select({ one: sql`1` }).from(productVariant).where(and(sql`${productVariant.productId} = ${productId}`, ilike(productVariant.sku, term)))),
      ),
    );
  }
  if (status === "draft" || status === "active" || status === "archived") filters.push(eq(product.status, status));
  if (cat && /^[0-9a-f-]{36}$/.test(cat)) filters.push(eq(product.categoryId, cat));
  if (stockFilter === "out") filters.push(sql`${totalStock} = 0`);
  if (stockFilter === "low") filters.push(exists(db.select({ one: sql`1` }).from(productVariant).where(and(sql`${productVariant.productId} = ${productId}`, sql`${productVariant.stock} <= ${lowStockThreshold}`))));
  if (param(sp, "sale") === "1") filters.push(isNotNull(product.salePrice));
  const where = and(...filters);

  const sortCol = { createdAt: product.createdAt, name: product.name, price: sql`coalesce(${product.salePrice}, ${product.regularPrice})`, stock: totalStock }[sorting.sort];
  const [rows, [{ total }], categories] = await Promise.all([
    db
      .select({
        id: product.id,
        name: product.name,
        slug: product.slug,
        status: product.status,
        isFeatured: product.isFeatured,
        regularPrice: product.regularPrice,
        salePrice: product.salePrice,
        createdAt: product.createdAt,
        lowStockThreshold: product.lowStockThreshold,
        categoryName: category.name,
        stock: totalStock,
        variants: sql<number>`(select count(*)::int from ${productVariant} where ${productVariant.productId} = ${product.id})`,
        image: sql<string | null>`(select ${productMedia.key} from ${productMedia} where ${productMedia.productId} = ${product.id} and ${productMedia.type} = 'image' order by ${productMedia.sortOrder} limit 1)`,
      })
      .from(product)
      .leftJoin(category, eq(category.id, product.categoryId))
      .where(where)
      .orderBy(sorting.dir === "asc" ? asc(sortCol) : desc(sortCol))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: count() }).from(product).where(where),
    db.query.category.findMany({ columns: { id: true, name: true }, orderBy: asc(category.name) }),
  ]);

  const base = "/admin/products";
  return (
    <>
      <Toolbar
        searchPlaceholder="Name or SKU"
        filters={[
          { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "archived", label: "Archived" }] },
          { key: "category", label: "Category", options: categories.map((c) => ({ value: c.id, label: c.name })) },
          { key: "stock", label: "Stock", options: [{ value: "low", label: "Low stock" }, { value: "out", label: "Out of stock" }] },
          { key: "sale", label: "Sale", options: [{ value: "1", label: "On sale" }] },
        ]}
      />
      <p className="mb-2 text-xs text-chocolate">{total} products</p>
      <Table
        head={
          <>
            <SortHeader label="Product" field="name" base={base} sp={sp} current={sorting} />
            <Th>Category</Th>
            <Th>Status</Th>
            <SortHeader label="Price" field="price" base={base} sp={sp} current={sorting} />
            <SortHeader label="Stock" field="stock" base={base} sp={sp} current={sorting} />
            <SortHeader label="Created" field="createdAt" base={base} sp={sp} current={sorting} />
          </>
        }
      >
        {rows.length === 0 && <EmptyRow cols={6} />}
        {rows.map((p) => (
          <tr key={p.id} className="hover:bg-surface/60">
            <Td>
              <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-sm bg-ivory-alt">
                  <Image src={mediaUrl(p.image)} alt="" fill sizes="40px" className="object-cover" />
                </span>
                <span>
                  <span className="font-medium hover:underline">{p.name}</span>
                  {p.isFeatured && <Badge tone="accent" className="ml-2">Featured</Badge>}
                  <span className="block text-xs text-chocolate">{p.variants} sizes</span>
                </span>
              </Link>
            </Td>
            <Td className="text-chocolate">{p.categoryName ?? "—"}</Td>
            <Td><Badge tone={p.status === "active" ? "success" : p.status === "draft" ? "warning" : "outline"}>{p.status}</Badge></Td>
            <Td>
              <span className="font-medium">{formatPrice(p.salePrice ?? p.regularPrice)}</span>
              {p.salePrice != null && <span className="ml-1.5 text-xs text-chocolate line-through">{formatPrice(p.regularPrice)}</span>}
            </Td>
            <Td>
              <span className={p.stock === 0 ? "text-danger" : p.stock <= p.lowStockThreshold ? "text-warning" : ""}>{p.stock}</span>
            </Td>
            <Td className="text-xs text-chocolate">{formatDate(p.createdAt)}</Td>
          </tr>
        ))}
      </Table>
      <Pagination base={base} sp={sp} page={page} pageCount={Math.ceil(total / PER_PAGE)} />
    </>
  );
}
