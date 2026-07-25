/**
 * Central SEO / GEO configuration.
 *
 * `NEXT_PUBLIC_SITE_URL` should be the canonical production origin (e.g.
 * https://fmkwig.com). Falls back to a sensible default for local/dev.
 */

export const SITE = {
  name: "FMK WIG",
  legalName: "FMK WIG",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://fmkwig.com").replace(/\/$/, ""),
  description:
    "FMK WIG — premium human hair & synthetic wigs, lace fronts, and wholesale hair systems. Retail + B2B wholesale with instant quotes, worldwide shipping, and multi-currency (BDT / USD).",
  locale: "en",
  twitter: "@fmkwig",
  keywords: [
    "wigs",
    "human hair wigs",
    "lace front wig",
    "synthetic wig",
    "hair extensions",
    "wholesale wigs",
    "bulk wigs supplier",
    "wig manufacturer Bangladesh",
    "buy wigs online",
    "premium wigs",
  ],
} as const;

/** Absolute URL helper for canonicals / sitemaps / OG. */
export function absUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * hreflang alternates for international (GEO) SEO. The storefront is English but
 * serves global regions (currency switch handles BDT/USD), so we advertise a
 * generic `en` plus `x-default`. Add region variants here later if you localize.
 */
export function languageAlternates(path = "/"): Record<string, string> {
  const url = absUrl(path);
  return { en: url, "x-default": url };
}

/** Organization + WebSite JSON-LD for the site root (rich results / knowledge panel). */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: absUrl("/logo.png"),
    description: SITE.description,
    sameAs: [] as string[],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/shop?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
