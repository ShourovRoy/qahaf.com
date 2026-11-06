"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function MobileMenu({ categories }: { categories: { name: string; slug: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // Close when the route changes.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { label: "New In", href: "/shop?sort=newest" },
    ...categories.map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
    { label: "Sale", href: "/shop?sale=1" },
    { label: "All Products", href: "/shop" },
  ];

  return (
    <>
      <button type="button" className="-ml-2 p-2 text-espresso lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu size={22} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-espresso/40" onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-ivory shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-chocolate/10 px-4">
              <span className="font-serif text-2xl tracking-[0.35em]">QAHAF</span>
              <button type="button" className="p-2" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>
            <form action="/shop" role="search" className="border-b border-chocolate/10 p-4">
              <input
                name="q"
                type="search"
                placeholder="Search products"
                aria-label="Search products"
                className="h-11 w-full rounded-sm border border-chocolate/25 bg-ivory px-3 text-sm focus:border-espresso focus:outline-none"
              />
            </form>
            <ul className="flex-1 overflow-y-auto py-2">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block px-5 py-3.5 font-serif text-xl text-espresso hover:bg-ivory-alt">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2 border-t border-chocolate/10 p-4 text-sm">
              <Link href="/account" className="rounded-sm border border-chocolate/30 py-2.5 text-center">Account</Link>
              <Link href="/account/wishlist" className="rounded-sm border border-chocolate/30 py-2.5 text-center">Wishlist</Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
