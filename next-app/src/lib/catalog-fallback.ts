/**
 * Local catalog fallback used when Supabase RLS / network fails.
 * Keeps the storefront browsable so a DB grant issue never takes the brand offline.
 */
import type { Category, Product } from "@/lib/supabase";
import { PRODUCT_ATTRS_BY_SLUG } from "@/lib/product-attributes";

const IMAGE_BY_SLUG: Record<string, string> = {
  "silky-straight-human-hair-wig": "/products/wig-straight.jpg",
  "body-wave-lace-front-wig": "/products/wig-bodywave.jpg",
  "curly-bob-synthetic-wig": "/products/wig-curlybob.jpg",
  "deep-wave-bundles": "/products/wig-bundles.jpg",
  "wig-cap-5pack": "/products/wig-cap.jpg",
  "kinky-curly-afro-wig": "/products/wig-afro.jpg",
};

const RETAIL_PRICE: Record<string, { price: number; compare?: number }> = {
  "silky-straight-human-hair-wig": { price: 8900, compare: 12000 },
  "body-wave-lace-front-wig": { price: 12900, compare: 16500 },
  "curly-bob-synthetic-wig": { price: 2490, compare: 3200 },
  "deep-wave-bundles": { price: 15500, compare: 18900 },
  "wig-cap-5pack": { price: 350 },
  "kinky-curly-afro-wig": { price: 4200, compare: 5500 },
};

const NAMES: Record<string, string> = {
  "silky-straight-human-hair-wig": "Silky Straight Human Hair Wig",
  "body-wave-lace-front-wig": "Body Wave Lace Front Wig",
  "curly-bob-synthetic-wig": "Curly Bob Synthetic Wig",
  "deep-wave-bundles": "Deep Wave Bundles (3pc)",
  "wig-cap-5pack": "Wig Cap (Pack of 5)",
  "kinky-curly-afro-wig": "Kinky Curly Afro Wig",
};

export const FALLBACK_CATEGORIES: Category[] = [
  { id: "cat-human", name: "Human Hair", slug: "human-hair", description: null, sort_order: 1 },
  { id: "cat-lace", name: "Lace Front", slug: "lace-front", description: null, sort_order: 2 },
  { id: "cat-synth", name: "Synthetic", slug: "synthetic", description: null, sort_order: 3 },
  { id: "cat-bundles", name: "Bundles", slug: "bundles", description: null, sort_order: 4 },
  { id: "cat-accessories", name: "Accessories", slug: "accessories", description: null, sort_order: 5 },
];

const CATEGORY_BY_SLUG: Record<string, string> = {
  "silky-straight-human-hair-wig": "cat-human",
  "body-wave-lace-front-wig": "cat-lace",
  "curly-bob-synthetic-wig": "cat-synth",
  "deep-wave-bundles": "cat-bundles",
  "wig-cap-5pack": "cat-accessories",
  "kinky-curly-afro-wig": "cat-synth",
};

export function fallbackProducts(opts?: { featured?: boolean; categoryId?: string | null }): Product[] {
  const all = Object.keys(PRODUCT_ATTRS_BY_SLUG).map((slug, i) => {
    const pricing = RETAIL_PRICE[slug] || { price: 5000 };
    return {
      id: `fallback-${slug}`,
      name: NAMES[slug] || slug,
      slug,
      description: `Premium ${NAMES[slug] || slug} from FMK WIG. Retail ready, wholesale available.`,
      price: pricing.price,
      compare_at_price: pricing.compare ?? null,
      currency: "BDT",
      stock: 50,
      category_id: CATEGORY_BY_SLUG[slug] || null,
      images: [IMAGE_BY_SLUG[slug] || "/products/wig-straight.jpg"],
      featured: i < 4,
      active: true,
    } satisfies Product;
  });
  let out = all;
  if (opts?.featured) out = out.filter((p) => p.featured);
  if (opts?.categoryId) out = out.filter((p) => p.category_id === opts.categoryId);
  return out;
}

export function fallbackProductBySlug(slug: string): Product | null {
  return fallbackProducts().find((p) => p.slug === slug) ?? null;
}
