"use client";

import { Boxes, FolderTree, LayoutDashboard, Menu, MessageSquareText, Package, Receipt, Settings, Shirt, Store, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { site } from "@/lib/site";

type Counts = { pendingOrders: number; lowStock: number } | null;

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: Package, badge: "pendingOrders" as const },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/products", label: "Products", icon: Shirt },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, badge: "lowStock" as const },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ counts }: { counts: Counts }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-0.5 p-3">
      {links.map(({ href, label, icon: Icon, badge }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        const n = badge && counts ? counts[badge] : 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm", active ? "bg-ivory/10 text-ivory" : "text-ivory/70 hover:bg-ivory/5 hover:text-ivory")}
          >
            <Icon size={17} strokeWidth={1.5} />
            <span className="flex-1">{label}</span>
            {n > 0 && <span className="rounded-sm bg-tan px-1.5 text-[11px] font-medium text-espresso">{n}</span>}
          </Link>
        );
      })}
      <Link href="/" className="mt-6 flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-ivory/70 hover:text-ivory">
        <Store size={17} strokeWidth={1.5} /> View store
      </Link>
      <a href={site.developer.url} target="_blank" rel="noopener" className="mt-4 px-3 text-[11px] text-ivory/60 hover:text-ivory">
        Built and supported by <span className="font-serif text-xs italic text-tan">{site.developer.name}</span>
      </a>
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-espresso px-4 text-ivory lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open admin menu" className="p-1"><Menu size={20} /></button>
        <span className="font-serif text-xl tracking-[0.3em]">QAHAF</span>
        <span className="w-7" />
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-espresso/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 overflow-y-auto bg-espresso">
            <div className="flex h-14 items-center justify-between px-4 text-ivory">
              <span className="font-serif text-xl tracking-[0.3em]">QAHAF</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
            </div>
            {nav}
          </aside>
        </div>
      )}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto bg-espresso lg:block">
        <div className="px-6 py-6">
          <p className="font-serif text-2xl tracking-[0.3em] text-ivory">QAHAF</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-tan">Admin</p>
        </div>
        {nav}
      </aside>
    </>
  );
}
