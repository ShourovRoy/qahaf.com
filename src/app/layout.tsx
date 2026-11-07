import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import Script from "next/script";
import { DeveloperSignature } from "@/components/developer-signature";
import { Toaster } from "@/components/toaster";
import { site } from "@/lib/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — Menswear in Bangladesh`, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.developer.name, url: site.developer.url }],
  creator: site.developer.name,
  keywords: ["menswear Bangladesh", "men's clothing", "shirts", "panjabi", "trousers", "QAHAF", "online shopping BD"],
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    url: "/",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1E1916",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
        <DeveloperSignature />
        {/* Developer promo popup, hosted on the Roybrains CDN. */}
        <Script
          src="https://d2dxk61kqibovk.cloudfront.net/peomotion-scripts/roybrains-promo.js"
          strategy="afterInteractive"
          data-roybrains-promo=""
          data-bg="#1E1916"
          data-fg="#F9F7F2"
          data-accent="#C4A482"
          data-font="var(--font-jost), sans-serif"
        />
      </body>
    </html>
  );
}
