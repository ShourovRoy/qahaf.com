export const site = {
  name: "QAHAF",
  tagline: "Wear Your Style",
  description:
    "QAHAF is a Bangladeshi menswear label offering refined shirts, trousers, outerwear, shoes and accessories. Cash on delivery across Bangladesh.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_BD",
  currency: "BDT",
  developer: { name: "Roybrains", url: "https://roybrains.com" },
  nav: [
    { label: "New", href: "/shop?sort=newest" },
    { label: "Shop", href: "/shop" },
    { label: "Sale", href: "/shop?sale=1" },
  ],
};

export function absoluteUrl(path = "/") {
  return new URL(path, site.url).toString();
}
