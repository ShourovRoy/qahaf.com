import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductForm } from "@/components/admin/product-form";
import { AdminHeading } from "@/components/admin/table";
import { Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { category, product, productMedia, productVariant } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Edit product" };

export default function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[700px]" />}>
      <Edit {...props} />
    </Suspense>
  );
}

async function Edit({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [p, categories] = await Promise.all([
    db.query.product.findFirst({
      where: eq(product.id, id),
      with: {
        variants: { orderBy: asc(productVariant.sortOrder) },
        media: { orderBy: asc(productMedia.sortOrder) },
      },
    }),
    db.query.category.findMany({ columns: { id: true, name: true, parentId: true }, orderBy: asc(category.name) }),
  ]);
  if (!p) notFound();

  return (
    <>
      <AdminHeading
        title={p.name}
        actions={p.status === "active" ? <Link href={`/product/${p.slug}`} target="_blank" className="text-xs uppercase tracking-wider text-chocolate underline underline-offset-4">View in store ↗</Link> : undefined}
      />
      <ProductForm
        categories={categories}
        initial={{
          id: p.id,
          name: p.name,
          slug: p.slug,
          categoryId: p.categoryId,
          shortDescription: p.shortDescription,
          description: p.description,
          regularPrice: p.regularPrice,
          salePrice: p.salePrice,
          fabric: p.fabric,
          careInstructions: p.careInstructions,
          status: p.status,
          isFeatured: p.isFeatured,
          lowStockThreshold: p.lowStockThreshold,
          seoTitle: p.seoTitle,
          seoDescription: p.seoDescription,
          sizeChart: p.sizeChart,
          variants: p.variants.map((v) => ({ id: v.id, size: v.size, color: v.color, sku: v.sku, stock: v.stock })),
          media: p.media.map((m) => ({ key: m.key, type: m.type, alt: m.alt })),
        }}
      />
    </>
  );
}
