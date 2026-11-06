import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsForm } from "@/components/admin/settings-form";
import { AdminHeading } from "@/components/admin/table";
import { Skeleton } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <AdminHeading title="Settings" description="Delivery charges, homepage banner and store contact details." />
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <Form />
      </Suspense>
    </>
  );
}

async function Form() {
  await requireAdmin();
  return <SettingsForm initial={await getSettings()} />;
}
