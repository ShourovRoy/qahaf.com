import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AddressBook } from "@/components/store/address-book";
import { PageHeading, Skeleton } from "@/components/ui/misc";
import { db } from "@/db";
import { address } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default function AddressesPage() {
  return (
    <>
      <PageHeading eyebrow="My account" title="Addresses" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  const user = await requireUser("/account/addresses");
  const rows = await db.query.address.findMany({
    where: eq(address.userId, user.id),
    orderBy: [desc(address.isDefault), desc(address.createdAt)],
  });
  return (
    <AddressBook
      addresses={rows.map(({ id, label, fullName, phone, division, district, area, addressLine, postcode, isDefault }) => ({ id, label, fullName, phone, division, district, area, addressLine, postcode, isDefault }))}
      defaults={{ fullName: user.name, phone: user.phone ?? "" }}
    />
  );
}
