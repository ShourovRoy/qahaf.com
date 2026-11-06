import { Suspense } from "react";
import { AccountNav } from "@/components/store/account-nav";

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <Suspense fallback={<div className="h-11 lg:h-80" />}>
          <AccountNav />
        </Suspense>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
