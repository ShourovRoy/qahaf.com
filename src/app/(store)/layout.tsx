import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl, site } from "@/lib/site";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ClothingStore",
            name: site.name,
            url: site.url,
            description: site.description,
            currenciesAccepted: "BDT",
            paymentAccepted: "Cash",
            areaServed: { "@type": "Country", name: "Bangladesh" },
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: site.name,
            url: site.url,
            potentialAction: {
              "@type": "SearchAction",
              target: `${absoluteUrl("/shop")}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      <Header />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
