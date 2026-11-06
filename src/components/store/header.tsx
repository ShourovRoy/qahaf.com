import { Heart, Search, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCart } from "@/server/cart";
import { getNavCategories } from "@/server/catalog";
import { getSettings } from "@/server/settings";
import { getUser } from "@/lib/session";
import { MobileMenu, MobileSearch } from "./mobile-menu";

export async function Header() {
  const [categories, settings] = await Promise.all([getNavCategories(), getSettings()]);
  const topLevel = categories.filter((c) => !c.parentId).slice(0, 5);

  return (
    <header className="sticky top-0 z-40 border-b border-chocolate/10 bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/85">
      {settings.announcement && (
        <p className="bg-espresso px-4 py-2 text-center text-[11px] uppercase tracking-[0.2em] text-ivory">{settings.announcement}</p>
      )}
      <div className="container-page flex h-16 items-center gap-4 lg:h-20">
        <Suspense fallback={<span className="-ml-2 h-10 w-10 lg:hidden" />}>
          <MobileMenu categories={topLevel.map(({ name, slug }) => ({ name, slug }))} />
        </Suspense>

        <Link href="/" className="font-serif text-2xl tracking-[0.35em] text-espresso lg:text-3xl" aria-label="QAHAF home">
          QAHAF
        </Link>

        <nav aria-label="Main" className="ml-8 hidden items-center gap-7 lg:flex">
          <Link href="/shop?sort=newest" className="text-sm text-espresso hover:text-chocolate">New</Link>
          {topLevel.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} className="text-sm text-espresso hover:text-chocolate">
              {c.name}
            </Link>
          ))}
          <Link href="/shop?sale=1" className="text-sm text-espresso hover:text-chocolate">Sale</Link>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <form action="/shop" role="search" className="relative hidden md:block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-chocolate/60" />
            <input
              name="q"
              type="search"
              placeholder="Search"
              aria-label="Search products"
              className="h-10 w-44 rounded-sm border border-chocolate/25 bg-ivory pl-9 pr-3 text-sm placeholder:text-chocolate/50 focus:border-espresso focus:outline-none lg:w-56"
            />
          </form>
          <Suspense fallback={<span className="h-9 w-9 md:hidden" />}>
            <MobileSearch />
          </Suspense>
          <Suspense fallback={<HeaderIcons />}>
            <HeaderUserIcons />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

async function HeaderUserIcons() {
  const [user, cart] = await Promise.all([getUser(), getCart()]);
  return <HeaderIcons signedIn={!!user} isAdmin={user?.role === "admin"} cartCount={cart.count} />;
}

function HeaderIcons({ signedIn, isAdmin, cartCount = 0 }: { signedIn?: boolean; isAdmin?: boolean; cartCount?: number }) {
  return (
    <>
      {isAdmin && (
        <Link href="/admin" className="hidden rounded-sm border border-chocolate/30 px-2 py-1 text-[11px] uppercase tracking-wider text-chocolate hover:bg-chocolate hover:text-ivory sm:inline-block">
          Admin
        </Link>
      )}
      <Link href={signedIn ? "/account" : "/login"} className="p-2 text-espresso hover:text-chocolate" aria-label={signedIn ? "My account" : "Sign in"}>
        <User size={20} strokeWidth={1.5} />
      </Link>
      <Link href="/account/wishlist" className="hidden p-2 text-espresso hover:text-chocolate sm:block" aria-label="Wishlist">
        <Heart size={20} strokeWidth={1.5} />
      </Link>
      <Link href="/cart" className="relative p-2 text-espresso hover:text-chocolate" aria-label={`Shopping bag, ${cartCount} items`}>
        <ShoppingBag size={20} strokeWidth={1.5} />
        {cartCount > 0 && (
          <span className="absolute right-0 top-0 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-espresso px-1 text-[10px] font-medium text-ivory">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </Link>
    </>
  );
}
