"use client";

import { ArrowRight, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

// Goes to the shop's search results; an empty query does nothing.
function useSearchSubmit(onDone: () => void) {
  const router = useRouter();
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    if (!q) return;
    router.push(`/shop?q=${encodeURIComponent(q)}`);
    onDone();
  };
}

function useCloseOnEscape(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);
}

function useCloseOnRouteChange(close: () => void) {
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    close();
  }
}

function SearchField({ onSubmit, autoFocus }: { onSubmit: (e: FormEvent<HTMLFormElement>) => void; autoFocus?: boolean }) {
  // Icon, input and button sit side by side in one bordered row, so nothing overlaps whatever the browser does to inputs.
  return (
    <form
      action="/shop"
      role="search"
      onSubmit={onSubmit}
      className="flex h-12 items-center rounded-sm border border-chocolate/30 bg-ivory focus-within:border-espresso"
    >
      <Search size={18} strokeWidth={1.5} aria-hidden className="ml-3.5 shrink-0 text-chocolate/70" />
      <input
        name="q"
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="Search products"
        aria-label="Search products"
        className="h-full min-w-0 flex-1 appearance-none bg-transparent px-3 text-base text-espresso placeholder:text-chocolate/60 focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Search"
        className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-espresso hover:bg-ivory-alt"
      >
        <ArrowRight size={18} strokeWidth={1.5} />
      </button>
    </form>
  );
}

export function MobileMenu({ categories }: { categories: { name: string; slug: string }[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const onSearch = useSearchSubmit(close);
  useCloseOnRouteChange(close);
  useCloseOnEscape(open, close);

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
      {/* Portaled to body: the header's backdrop-blur would otherwise trap this fixed overlay inside the header bar. */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="absolute inset-0 bg-espresso/40" onClick={close} />
            <nav className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-ivory shadow-xl">
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-chocolate/10 px-4">
                <span className="font-serif text-2xl tracking-[0.35em] text-espresso">QAHAF</span>
                <button type="button" className="p-2 text-espresso" aria-label="Close menu" onClick={close}>
                  <X size={22} strokeWidth={1.5} />
                </button>
              </div>
              <div className="shrink-0 bg-ivory-alt px-4 py-4">
                <SearchField onSubmit={onSearch} />
              </div>
              <ul className="flex-1 overflow-y-auto overscroll-contain py-2">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} onClick={close} className="block px-5 py-3.5 font-serif text-xl text-espresso hover:bg-ivory-alt">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-chocolate/10 p-4 text-sm">
                <Link href="/account" onClick={close} className="rounded-sm border border-chocolate/30 py-2.5 text-center text-espresso">Account</Link>
                <Link href="/account/wishlist" onClick={close} className="rounded-sm border border-chocolate/30 py-2.5 text-center text-espresso">Wishlist</Link>
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}

export function MobileSearch() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const onSearch = useSearchSubmit(close);
  useCloseOnRouteChange(close);
  useCloseOnEscape(open, close);

  return (
    <>
      <button
        type="button"
        className="p-2 text-espresso md:hidden"
        aria-label={open ? "Close search" : "Search"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={20} strokeWidth={1.5} /> : <Search size={20} strokeWidth={1.5} />}
      </button>
      {open && (
        // Positioned against the sticky header, so it drops down right under the bar.
        <div className="absolute inset-x-0 top-full border-b border-chocolate/10 bg-ivory-alt px-4 py-3 shadow-sm sm:px-6 md:hidden">
          <SearchField onSubmit={onSearch} autoFocus />
        </div>
      )}
    </>
  );
}
