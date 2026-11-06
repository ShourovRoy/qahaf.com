import "server-only";
import { and, asc, desc, eq, exists, gte, ilike, inArray, isNotNull, lte, or, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { category, product, productMedia, productVariant } from "@/db/schema";

export const PAGE_SIZE = 24;
export const SORTS = ["featured", "newest", "price-asc", "price-desc", "rating"] as const;
export type SortKey = (typeof SORTS)[number];

const price = sql<number>`coalesce(${product.salePrice}, ${product.regularPrice})`;

const cardColumns = {
  id: true,
  name: true,
  slug: true,
  regularPrice: true,
  salePrice: true,
  ratingSum: true,
  ratingCount: true,
} as const;

// Postgres works out "new" so rendering never reads the clock.
const cardExtras = { isNew: sql<boolean>`${product.createdAt} > now() - interval '21 days'`.as("is_new") };

const cardWith = {
  media: {
    columns: { key: true, alt: true },
    where: eq(productMedia.type, "image"),
    orderBy: asc(productMedia.sortOrder),
    limit: 2,
  },
  variants: { columns: { stock: true } },
} as const;

type RawCard = {
  id: string;
  name: string;
  slug: string;
  regularPrice: number;
  salePrice: number | null;
  ratingSum: number;
  ratingCount: number;
  isNew: boolean;
  media: { key: string; alt: string | null }[];
  variants: { stock: number }[];
};

function toCard(p: RawCard) {
  const { variants, media, ...rest } = p;
  return {
    ...rest,
    images: media.map((m) => m.key),
    alt: media[0]?.alt ?? p.name,
    inStock: variants.some((v) => v.stock > 0),
  };
}

export type ProductCard = ReturnType<typeof toCard>;

export async function getNavCategories() {
  "use cache";
  cacheTag("categories");
  cacheLife("days");
  return db.query.category.findMany({
    where: eq(category.isActive, true),
    columns: { id: true, name: true, slug: true, parentId: true, imageKey: true, description: true },
    orderBy: [asc(category.sortOrder), asc(category.name)],
  });
}

export async function getCategoryBySlug(slug: string) {
  "use cache";
  cacheTag("categories");
  cacheLife("days");
  const cat = await db.query.category.findFirst({
    where: and(eq(category.slug, slug), eq(category.isActive, true)),
    with: { parent: { columns: { name: true, slug: true } }, children: { columns: { id: true, name: true, slug: true } } },
  });
  return cat ?? null;
}

export type ProductQuery = {
  categoryIds?: string[];
  q?: string;
  sort?: SortKey;
  sale?: boolean;
  size?: string;
  min?: number;
  max?: number;
  page?: number;
};

export async function listProducts(query: ProductQuery) {
  "use cache";
  cacheTag("products");
  cacheLife("hours");

  const filters: (SQL | undefined)[] = [eq(product.status, "active")];
  if (query.categoryIds?.length) filters.push(inArray(product.categoryId, query.categoryIds));
  if (query.q) {
    const term = `%${query.q.replace(/[%_]/g, "")}%`;
    filters.push(or(ilike(product.name, term), ilike(product.shortDescription, term)));
  }
  if (query.sale) filters.push(isNotNull(product.salePrice));
  if (query.min != null) filters.push(gte(price, query.min));
  if (query.max != null) filters.push(lte(price, query.max));
  if (query.size) {
    filters.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(productVariant)
          .where(and(sql`${productVariant.productId} = ${product}.${sql.identifier("id")}`, eq(productVariant.size, query.size), sql`${productVariant.stock} > 0`)),
      ),
    );
  }
  const where = and(...filters);

  const orderBy = {
    featured: [desc(product.isFeatured), desc(product.createdAt)],
    newest: [desc(product.createdAt)],
    "price-asc": [asc(price)],
    "price-desc": [desc(price)],
    rating: [desc(sql`${product.ratingSum}::float / nullif(${product.ratingCount}, 0)`), desc(product.ratingCount)],
  }[query.sort ?? "featured"];

  const page = Math.max(1, query.page ?? 1);
  const [rows, [{ count }]] = await Promise.all([
    db.query.product.findMany({
      where,
      columns: cardColumns,
      extras: cardExtras,
      with: cardWith,
      orderBy,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(product).where(where),
  ]);

  return { items: rows.map(toCard), total: count, page, pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export async function getAvailableSizes() {
  "use cache";
  cacheTag("products");
  cacheLife("hours");
  const rows = await db
    .selectDistinct({ size: productVariant.size })
    .from(productVariant)
    .innerJoin(product, eq(product.id, productVariant.productId))
    .where(eq(product.status, "active"));
  const order = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
  return rows
    .map((r) => r.size)
    .sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b, undefined, { numeric: true });
    });
}

export async function getFeaturedProducts(limit = 8) {
  "use cache";
  cacheTag("products");
  cacheLife("hours");
  const rows = await db.query.product.findMany({
    where: and(eq(product.status, "active"), eq(product.isFeatured, true)),
    columns: cardColumns,
    extras: cardExtras,
    with: cardWith,
    orderBy: desc(product.updatedAt),
    limit,
  });
  return rows.map(toCard);
}

export async function getNewArrivals(limit = 8) {
  "use cache";
  cacheTag("products");
  cacheLife("hours");
  const rows = await db.query.product.findMany({
    where: eq(product.status, "active"),
    columns: cardColumns,
    extras: cardExtras,
    with: cardWith,
    orderBy: desc(product.createdAt),
    limit,
  });
  return rows.map(toCard);
}

export async function getProductBySlug(slug: string) {
  "use cache";
  cacheTag("products", `product:${slug}`);
  cacheLife("hours");
  const p = await db.query.product.findFirst({
    where: and(eq(product.slug, slug), eq(product.status, "active")),
    with: {
      category: { columns: { id: true, name: true, slug: true } },
      media: { orderBy: asc(productMedia.sortOrder), columns: { id: true, type: true, key: true, alt: true } },
      variants: {
        orderBy: asc(productVariant.sortOrder),
        columns: { id: true, size: true, color: true, stock: true, sku: true },
      },
    },
  });
  return p ?? null;
}

export async function getRelatedProducts(productId: string, categoryId: string | null, limit = 4) {
  "use cache";
  cacheTag("products");
  cacheLife("hours");
  const rows = await db.query.product.findMany({
    where: and(
      eq(product.status, "active"),
      sql`${product.id} <> ${productId}`,
      categoryId ? eq(product.categoryId, categoryId) : undefined,
    ),
    columns: cardColumns,
    extras: cardExtras,
    with: cardWith,
    orderBy: desc(product.ratingCount),
    limit,
  });
  return rows.map(toCard);
}

export async function getCategoryCounts() {
  "use cache";
  cacheTag("products", "categories");
  cacheLife("hours");
  const rows = await db
    .select({ categoryId: product.categoryId, count: sql<number>`count(*)::int` })
    .from(product)
    .where(eq(product.status, "active"))
    .groupBy(product.categoryId);
  return Object.fromEntries(rows.map((r) => [r.categoryId ?? "", r.count])) as Record<string, number>;
}

export async function getSaleProducts(limit = 3) {
  "use cache";
  cacheTag("products");
  cacheLife("hours");
  const rows = await db.query.product.findMany({
    where: and(eq(product.status, "active"), isNotNull(product.salePrice)),
    columns: cardColumns,
    extras: cardExtras,
    with: cardWith,
    orderBy: desc(sql`(${product.regularPrice} - ${product.salePrice})::float / ${product.regularPrice}`),
    limit,
  });
  return rows.map(toCard);
}

export async function getSitemapEntries() {
  "use cache";
  cacheTag("products", "categories");
  cacheLife("hours");
  const [products, categories] = await Promise.all([
    db.query.product.findMany({ where: eq(product.status, "active"), columns: { slug: true, updatedAt: true } }),
    db.query.category.findMany({ where: eq(category.isActive, true), columns: { slug: true, updatedAt: true } }),
  ]);
  return { products, categories };
}
