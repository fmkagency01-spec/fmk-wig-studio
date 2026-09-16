/**
 * Central SEO / GEO configuration.
 *
 * Explicit canonical origin wins over Vercel deployment origins.
 * Localhost is only a fallback for local development.
 */

function resolveSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (!configured) {
    if (process.env.NODE_ENV === "development" && !process.env.VERCEL) {
      return "http://localhost:3000";
    }
    throw new Error(
      "Set NEXT_PUBLIC_SITE_URL, VERCEL_URL, or VERCEL_PROJECT_PRODUCTION_URL before building or serving the storefront.",
    );
  }

  const normalized = /^https?:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;
  const url = new URL(normalized);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username || url.password || url.search || url.hash ||
    url.pathname.replace(/\/+$/, "")
  ) {
    throw new Error("The site URL must be an HTTP(S) origin without credentials, a path, query, or fragment.");
  }
  return url.origin;
}

export const SITE = {
  name: "FMK WIG",
  legalName: "FMK WIG",
  url: resolveSiteUrl(),
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
