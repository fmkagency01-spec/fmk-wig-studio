import type { MetadataRoute } from "next";
import { absUrl, SITE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/admin", "/cart", "/checkout", "/auth"],
    },
    sitemap: absUrl("/sitemap.xml"),
    host: SITE.url,
  };
}
