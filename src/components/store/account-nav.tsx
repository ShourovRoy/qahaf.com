"use client";

import { Heart, LayoutGrid, LogOut, MapPin, Package, Receipt, ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/cn";

const links = [
  { href: "/account", label: "Overview", icon: LayoutGrid },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/transactions", label: "Transactions", icon: Receipt },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/cart", label: "Bag", icon: ShoppingBag },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile", icon: UserRound },
];

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <nav aria-label="Account" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      <p className="eyebrow mb-3 hidden text-chocolate lg:block">My account</p>
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/account" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm",
              active ? "bg-espresso text-ivory" : "text-chocolate hover:bg-ivory-alt",
            )}
          >
            <Icon size={16} strokeWidth={1.5} />
            {label}
          </Link>
        );
      })}
      <button type="button" onClick={handleSignOut} className="flex shrink-0 items-center gap-2.5 rounded-sm px-3 py-2.5 text-left text-sm text-chocolate hover:bg-ivory-alt lg:mt-4">
        <LogOut size={16} strokeWidth={1.5} />
        Sign out
      </button>
    </nav>
  );
}
