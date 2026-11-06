import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/cart", "/checkout", "/api/", "/login", "/register", "/forgot-password", "/reset-password"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
