import Link from "next/link";
import { getNavCategories } from "@/server/catalog";
import { getSettings } from "@/server/settings";

export async function Footer() {
  const [categories, settings] = await Promise.all([getNavCategories(), getSettings()]);
  const socials = Object.entries(settings.socials).filter(([, url]) => url);

  return (
    <footer className="mt-24 grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex flex-col justify-center gap-3 bg-espresso px-6 py-14 text-ivory md:px-12">
        <p className="font-serif text-4xl tracking-[0.35em]">QAHAF</p>
        <p className="font-serif text-lg italic text-tan">Wear Your Style</p>
        <p className="max-w-xs text-sm text-ivory/70">Considered menswear, made for everyday Bangladesh. Cash on delivery nationwide.</p>
      </div>
      <div className="grid grid-cols-2 gap-8 bg-tan px-6 py-14 text-espresso sm:grid-cols-3 md:px-12">
        <div>
          <p className="eyebrow mb-4">Shop</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/shop?sort=newest" className="hover:underline">New</Link></li>
            {categories.filter((c) => !c.parentId).slice(0, 6).map((c) => (
              <li key={c.id}><Link href={`/category/${c.slug}`} className="hover:underline">{c.name}</Link></li>
            ))}
            <li><Link href="/shop?sale=1" className="hover:underline">Sale</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Help</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/account/orders" className="hover:underline">Track order</Link></li>
            <li><Link href="/account" className="hover:underline">My account</Link></li>
            <li><Link href="/cart" className="hover:underline">Shopping bag</Link></li>
          </ul>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="eyebrow mb-4">Contact</p>
          <ul className="space-y-2 text-sm">
            {settings.storeAddress && <li>{settings.storeAddress}</li>}
            {settings.contactPhone && <li><a href={`tel:${settings.contactPhone}`} className="hover:underline">{settings.contactPhone}</a></li>}
            {settings.contactEmail && <li><a href={`mailto:${settings.contactEmail}`} className="hover:underline">{settings.contactEmail}</a></li>}
          </ul>
          {socials.length > 0 && (
            <ul className="mt-4 flex gap-4 text-sm">
              {socials.map(([name, url]) => (
                <li key={name}><a href={url} target="_blank" rel="noopener noreferrer" className="capitalize hover:underline">{name}</a></li>
              ))}
            </ul>
          )}
        </div>
        <p className="col-span-full border-t border-espresso/20 pt-6 text-xs">© QAHAF. All rights reserved.</p>
      </div>
    </footer>
  );
}
