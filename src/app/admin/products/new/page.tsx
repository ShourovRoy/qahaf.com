import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductForm } from "@/components/admin/product-form";
import { AdminHeading } from "@/components/admin/table";
import { Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { category } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <>
      <AdminHeading title="New product" />
      <Suspense fallback={<Skeleton className="h-[700px]" />}>
        <Form />
      </Suspense>
    </>
  );
}

async function Form() {
  await requireAdmin();
  const categories = await db.query.category.findMany({ columns: { id: true, name: true, parentId: true }, orderBy: asc(category.name) });
  return <ProductForm categories={categories} />;
}
