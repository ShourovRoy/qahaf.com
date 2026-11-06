import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { getAdminCounts } from "@/server/admin";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin | QAHAF" }, robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen flex-col bg-ivory lg:flex-row">
      <Suspense fallback={<SidebarPlaceholder />}>
        <SidebarWithCounts />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}

function SidebarPlaceholder() {
  return (
    <>
      <div className="h-14 bg-espresso lg:hidden" />
      <aside className="hidden h-screen w-60 shrink-0 bg-espresso lg:block" />
    </>
  );
}

async function SidebarWithCounts() {
  return <AdminSidebar counts={await getAdminCounts()} />;
}
