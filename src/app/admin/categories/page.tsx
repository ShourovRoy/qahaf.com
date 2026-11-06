import { asc, count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryManager } from "@/components/admin/category-manager";
import { AdminHeading } from "@/components/admin/table";
import { Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { category, product } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <>
      <AdminHeading title="Categories" description="Organise the catalogue. Top-level categories appear in the main menu." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  await requireAdmin();
  const rows = await db
    .select({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      imageKey: category.imageKey,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      seoTitle: category.seoTitle,
      seoDescription: category.seoDescription,
      products: count(product.id),
    })
    .from(category)
    .leftJoin(product, eq(product.categoryId, category.id))
    .groupBy(category.id)
    .orderBy(asc(category.sortOrder), asc(category.name));
  return <CategoryManager categories={rows} />;
}
