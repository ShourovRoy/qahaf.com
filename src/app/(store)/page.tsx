import { ArrowRight, ArrowUpRight, RotateCcw, ShieldCheck, Truck, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProductCard, ProductGrid } from "@/components/store/product-card";
import { ButtonLink } from "@/components/ui/button";
import { discountPercent, formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import {
  getCategoryCounts,
  getFeaturedProducts,
  getNavCategories,
  getNewArrivals,
  getSaleProducts,
  listProducts,
} from "@/server/catalog";
import { getSettings } from "@/server/settings";

export default async function HomePage() {
  const [settings, categories, counts, featured, arrivals, sale] = await Promise.all([
    getSettings(),
    getNavCategories(),
    getCategoryCounts(),
    getFeaturedProducts(8),
    getNewArrivals(10),
    getSaleProducts(3),
  ]);
  const { hero } = settings;
  const tiles = categories.filter((c) => !c.parentId && counts[c.id]);
  const stats = hero.stats.filter((x) => x.value);

  // Editorial block: Panjabi when it exists, otherwise the largest category.
  const story = tiles.find((c) => c.slug === "panjabi") ?? [...tiles].sort((a, b) => counts[b.id] - counts[a.id])[0];
  const storyProducts = story ? (await listProducts({ categoryIds: [story.id], sort: "featured" })).items.slice(0, 3) : [];
  const maxOff = Math.max(0, ...sale.map(discountPercent));

  return (
    <>
      {/* Hero */}
      <section className="container-page pt-6 lg:pt-10">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="animate-rise lg:col-span-5">
            {hero.kicker && (
              <p className="eyebrow flex items-center gap-3 text-chocolate">
                <span aria-hidden className="h-px w-10 bg-tan" />
                {hero.kicker}
              </p>
            )}
            <h1 className="heading-display mt-5 text-5xl text-espresso sm:text-6xl xl:text-7xl">
              {hero.highlight && <span className="block text-7xl text-tan sm:text-8xl xl:text-9xl">{hero.highlight}</span>}
              {hero.title}
            </h1>
            {hero.subtitle && <p className="mt-6 max-w-md text-base leading-relaxed text-chocolate sm:text-lg">{hero.subtitle}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              {hero.ctaLabel && <ButtonLink href={hero.ctaHref || "/shop"} size="lg">{hero.ctaLabel}</ButtonLink>}
              {hero.secondaryLabel && <ButtonLink href={hero.secondaryHref || "/shop"} variant="secondary" size="lg">{hero.secondaryLabel}</ButtonLink>}
            </div>
            {stats.length > 0 && (
              <dl
                className="mt-10 grid max-w-md divide-x divide-chocolate/15 border-y border-chocolate/15 py-4 text-center"
                style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
              >
                {stats.map((x, i) => (
                  <div key={i} className="flex flex-col-reverse">
                    <dt className="mt-1 text-[11px] uppercase tracking-[0.15em] text-chocolate">{x.label}</dt>
                    <dd className="heading-display text-3xl">{x.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="relative lg:col-span-7">
            <div aria-hidden className="absolute inset-0 translate-x-3 translate-y-3 rounded-sm border border-tan sm:translate-x-5 sm:translate-y-5" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-tan">
              {hero.imageKey ? (
                <Image src={mediaUrl(hero.imageKey)} alt={hero.imageAlt || hero.title} fill priority sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-tan via-chocolate to-espresso" />
              )}
            </div>
            {hero.badgeText && <RotatingSeal text={hero.badgeText} />}
          </div>
        </div>
      </section>

      {/* Marquee */}
      {settings.marquee.length > 0 && (
        <div className="mt-20 overflow-hidden bg-espresso py-4 text-ivory" aria-hidden>
          <div className="animate-marquee flex w-max">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center">
                {settings.marquee.map((t, i) => (
                  <span key={i} className="flex items-center font-serif text-2xl italic">
                    <span className="px-8">{t}</span>
                    <span className="h-1.5 w-1.5 rotate-45 bg-tan" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {tiles.length > 0 && (
        <section className="container-page mt-20" aria-labelledby="cat-heading">
          <SectionHeader id="cat-heading" eyebrow="Explore" title="Shop by Category" href="/shop" linkLabel="All products" />
          <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {tiles.map((c, i) => (
              <li key={c.id} className="w-[62%] shrink-0 snap-start sm:w-[38%] lg:w-[calc((100%-4rem)/5)]">
                <Link href={`/category/${c.slug}`} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface">
                    <Image src={mediaUrl(c.imageKey)} alt="" fill sizes="(min-width: 1024px) 20vw, 60vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    <span className="absolute left-3 top-3 font-serif text-sm text-chocolate">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <p className="font-serif text-2xl">{c.name}</p>
                    <p className="flex items-center gap-1 text-xs text-chocolate">
                      {counts[c.id]} styles <ArrowUpRight size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section className="container-page mt-24" aria-labelledby="featured-heading">
          <SectionHeader id="featured-heading" eyebrow="Curated" title="Featured Collections" href="/shop" linkLabel="Best sellers" />
          <ProductGrid products={featured} />
        </section>
      )}

      {/* Editorial story */}
      {story && storyProducts.length > 0 && (
        <section className="mt-28 bg-surface py-16 lg:py-24" aria-labelledby="story-heading">
          <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="relative mx-auto w-full max-w-lg">
              <div className="relative aspect-[4/5] overflow-hidden rounded-t-full bg-ivory">
                <Image src={mediaUrl(storyProducts[0].images[0])} alt={storyProducts[0].alt} fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
              </div>
              {storyProducts[1] && (
                <div className="absolute -bottom-8 -right-2 w-[42%] rounded-sm border-[6px] border-surface shadow-xl sm:-right-10">
                  <div className="relative aspect-[4/5] overflow-hidden bg-ivory">
                    <Image src={mediaUrl(storyProducts[1].images[1] ?? storyProducts[1].images[0])} alt="" fill sizes="200px" className="object-cover" />
                  </div>
                </div>
              )}
              <span aria-hidden className="absolute -left-4 top-10 h-24 w-24 rounded-full border border-tan" />
            </div>

            <div>
              <p className="eyebrow flex items-center gap-3 text-chocolate"><span aria-hidden className="h-px w-10 bg-tan" />The Edit</p>
              <h2 id="story-heading" className="heading-display mt-4 text-5xl sm:text-6xl">The {story.name} Edit</h2>
              {story.description && <p className="mt-5 max-w-lg text-lg leading-relaxed text-chocolate">{story.description}</p>}
              <ul className="mt-8 divide-y divide-chocolate/15 border-y border-chocolate/15">
                {storyProducts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/product/${p.slug}`} className="group flex items-center gap-4 py-4">
                      <span className="relative h-16 w-13 shrink-0 overflow-hidden rounded-sm bg-ivory">
                        <Image src={mediaUrl(p.images[0])} alt="" fill sizes="52px" className="object-cover" />
                      </span>
                      <span className="flex-1">
                        <span className="block font-serif text-xl">{p.name}</span>
                        <span className="text-sm text-chocolate">{formatPrice(p.salePrice ?? p.regularPrice)}</span>
                      </span>
                      <ArrowRight size={18} className="text-chocolate transition-transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
              <ButtonLink href={`/category/${story.slug}`} className="mt-8">Shop the edit</ButtonLink>
            </div>
          </div>
        </section>
      )}

      {/* New arrivals */}
      {arrivals.length > 0 && (
        <section className="container-page mt-24" aria-labelledby="new-heading">
          <SectionHeader id="new-heading" eyebrow="Just in" title="New Arrivals" href="/shop?sort=newest" linkLabel="Shop new" />
          <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-6 sm:px-0">
            {arrivals.map((p) => (
              <li key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[calc((100%-6rem)/5)]">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sale */}
      {sale.length > 0 && (
        <section className="container-page mt-24" aria-labelledby="sale-heading">
          <div className="relative grid overflow-hidden rounded-sm bg-tan text-espresso lg:grid-cols-[1fr_1.3fr]">
            <div className="relative z-10 flex flex-col justify-center gap-4 p-8 sm:p-12">
              <p className="eyebrow">Limited time</p>
              <h2 id="sale-heading" className="heading-display text-6xl sm:text-7xl">
                Up to {maxOff}% off
              </h2>
              <p className="max-w-sm text-espresso/80">Selected shirts, panjabi and essentials at their best price of the season.</p>
              <ButtonLink href="/shop?sale=1" size="lg" className="mt-2 w-fit">Shop the sale</ButtonLink>
            </div>
            <ul className="grid grid-cols-3 gap-3 p-4 sm:gap-4 sm:p-8">
              {sale.map((p) => (
                <li key={p.id}>
                  <Link href={`/product/${p.slug}`} className="group block rounded-sm bg-ivory p-2 shadow-sm transition-transform hover:-translate-y-1">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface">
                      <Image src={mediaUrl(p.images[0])} alt={p.alt} fill sizes="(min-width: 1024px) 15vw, 30vw" className="object-cover" />
                      <span className="absolute left-1.5 top-1.5 rounded-sm bg-espresso px-1.5 py-0.5 text-[10px] font-medium text-ivory">-{discountPercent(p)}%</span>
                    </div>
                    <p className="mt-2 line-clamp-1 text-xs">{p.name}</p>
                    <p className="text-xs font-medium">{formatPrice(p.salePrice ?? p.regularPrice)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Promise */}
      <section className="container-page mt-24" aria-label="Why QAHAF">
        <div className="grid gap-px overflow-hidden rounded-sm border border-chocolate/10 bg-chocolate/10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Wallet, title: "Cash on delivery", text: "Pay in cash when your order arrives. No cards needed." },
            { icon: Truck, title: "Nationwide delivery", text: `Inside Dhaka ${formatPrice(settings.shippingInsideDhaka)}, everywhere else ${formatPrice(settings.shippingOutsideDhaka)}.` },
            { icon: RotateCcw, title: "Easy size exchange", text: "Wrong size? We'll help you swap it." },
            { icon: ShieldCheck, title: "Verified orders", text: "Every order is confirmed by our team before dispatch." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-ivory p-6 sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tan text-espresso">
                <Icon size={20} strokeWidth={1.5} />
              </span>
              <p className="mt-5 font-serif text-2xl">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-chocolate">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Membership */}
      <section className="container-page mt-24">
        <div className="relative overflow-hidden rounded-sm bg-espresso px-6 py-16 text-center text-ivory sm:px-12">
          <span aria-hidden className="absolute left-5 top-5 h-12 w-12 border-l border-t border-tan" />
          <span aria-hidden className="absolute bottom-5 right-5 h-12 w-12 border-b border-r border-tan" />
          <p className="eyebrow text-tan">Members</p>
          <h2 className="heading-display mx-auto mt-4 max-w-2xl text-4xl sm:text-5xl">Join QAHAF for faster checkout and honest reviews</h2>
          <p className="mx-auto mt-4 max-w-lg text-ivory/75">Save your wishlist, track every order, and read photo reviews from customers who&apos;ve worn the pieces.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/register" variant="accent" size="lg">Create account</ButtonLink>
            <Link href="/login" className="inline-flex h-13 items-center rounded-sm border border-ivory/40 px-8 text-sm uppercase tracking-[0.12em] text-ivory hover:bg-ivory hover:text-espresso">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeader({ id, eyebrow, title, href, linkLabel }: { id: string; eyebrow: string; title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow text-chocolate">{eyebrow}</p>
        <h2 id={id} className="heading-display mt-2 text-4xl sm:text-5xl">{title}</h2>
      </div>
      <Link href={href} className="shrink-0 border-b border-chocolate pb-0.5 text-xs uppercase tracking-[0.15em] text-chocolate hover:text-espresso">
        {linkLabel}
      </Link>
    </div>
  );
}

function RotatingSeal({ text }: { text: string }) {
  return (
    <div className="absolute -bottom-10 -left-4 h-28 w-28 sm:-left-10 sm:h-36 sm:w-36" aria-hidden>
      <div className="flex h-full w-full items-center justify-center rounded-full bg-espresso shadow-xl">
        <svg viewBox="0 0 100 100" className="animate-spin-slow absolute inset-0 h-full w-full">
          <defs>
            <path id="seal-circle" d="M 50 50 m -36 0 a 36 36 0 1 1 72 0 a 36 36 0 1 1 -72 0" />
          </defs>
          <text fill="#F9F7F2" fontSize="9.5" fontFamily="var(--font-jost), sans-serif">
            <textPath href="#seal-circle" textLength="226" lengthAdjust="spacing">{`${text.trim()} `}</textPath>
          </text>
        </svg>
        <span className="font-serif text-3xl text-tan sm:text-4xl">Q</span>
      </div>
    </div>
  );
}
