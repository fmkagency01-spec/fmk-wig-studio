/** Catalog attributes for filtration. Used until DB columns are migrated; then merged from API. */
export type HairType = "human" | "synthetic" | "accessory";
export type CapSize = "petite" | "average" | "large" | "one-size" | "n/a";
export type Texture =
  | "straight"
  | "body-wave"
  | "deep-wave"
  | "curly"
  | "kinky-curly"
  | "n/a";
export type Density = "130%" | "150%" | "180%" | "200%" | "n/a";

export type ProductAttributes = {
  hair_type: HairType;
  cap_size: CapSize;
  texture: Texture;
  density: Density;
  custom_dyeing: boolean;
  wholesale_price: number;
  wholesale_moq: number;
  video_url?: string | null;
};

export const FILTER_OPTIONS = {
  hair_type: [
    { value: "human", label: "Human Hair" },
    { value: "synthetic", label: "Synthetic" },
    { value: "accessory", label: "Accessories" },
  ],
  cap_size: [
    { value: "petite", label: "Petite" },
    { value: "average", label: "Average" },
    { value: "large", label: "Large" },
    { value: "one-size", label: "One Size" },
  ],
  texture: [
    { value: "straight", label: "Straight" },
    { value: "body-wave", label: "Body Wave" },
    { value: "deep-wave", label: "Deep Wave" },
    { value: "curly", label: "Curly" },
    { value: "kinky-curly", label: "Kinky Curly" },
  ],
  density: [
    { value: "130%", label: "130%" },
    { value: "150%", label: "150%" },
    { value: "180%", label: "180%" },
    { value: "200%", label: "200%" },
  ],
  custom_dyeing: [
    { value: "true", label: "Custom Dyeing Available" },
    { value: "false", label: "Standard Colors Only" },
  ],
} as const;

/** Seed attribute map keyed by product slug (matches seeded catalog). */
export const PRODUCT_ATTRS_BY_SLUG: Record<string, ProductAttributes> = {
  "silky-straight-human-hair-wig": {
    hair_type: "human",
    cap_size: "average",
    texture: "straight",
    density: "150%",
    custom_dyeing: true,
    wholesale_price: 6800,
    wholesale_moq: 5,
  },
  "body-wave-lace-front-wig": {
    hair_type: "human",
    cap_size: "average",
    texture: "body-wave",
    density: "180%",
    custom_dyeing: true,
    wholesale_price: 9900,
    wholesale_moq: 3,
  },
  "curly-bob-synthetic-wig": {
    hair_type: "synthetic",
    cap_size: "average",
    texture: "curly",
    density: "130%",
    custom_dyeing: false,
    wholesale_price: 1800,
    wholesale_moq: 10,
  },
  "deep-wave-bundles": {
    hair_type: "human",
    cap_size: "n/a",
    texture: "deep-wave",
    density: "n/a",
    custom_dyeing: true,
    wholesale_price: 12000,
    wholesale_moq: 5,
  },
  "wig-cap-5pack": {
    hair_type: "accessory",
    cap_size: "one-size",
    texture: "n/a",
    density: "n/a",
    custom_dyeing: false,
    wholesale_price: 220,
    wholesale_moq: 20,
  },
  "kinky-curly-afro-wig": {
    hair_type: "synthetic",
    cap_size: "large",
    texture: "kinky-curly",
    density: "200%",
    custom_dyeing: false,
    wholesale_price: 3200,
    wholesale_moq: 8,
  },
};

export function attrsForSlug(slug: string): ProductAttributes | null {
  return PRODUCT_ATTRS_BY_SLUG[slug] ?? null;
}

export type ShopFilters = {
  hair_type?: string;
  cap_size?: string;
  texture?: string;
  density?: string;
  custom_dyeing?: string;
};

export function matchesFilters(
  slug: string,
  filters: ShopFilters,
  override?: Partial<ProductAttributes> | null,
): boolean {
  const attrs = { ...attrsForSlug(slug), ...override } as ProductAttributes | null;
  if (!attrs) {
    return Object.values(filters).every((v) => !v);
  }
  if (filters.hair_type && attrs.hair_type !== filters.hair_type) return false;
  if (filters.cap_size && attrs.cap_size !== filters.cap_size) return false;
  if (filters.texture && attrs.texture !== filters.texture) return false;
  if (filters.density && attrs.density !== filters.density) return false;
  if (filters.custom_dyeing === "true" && !attrs.custom_dyeing) return false;
  if (filters.custom_dyeing === "false" && attrs.custom_dyeing) return false;
  return true;
}

/** Instant B2B quote: volume tiers on wholesale unit price (BDT). */
export function computeWholesaleQuote(unitWholesaleBdt: number, quantity: number) {
  const qty = Math.max(1, quantity);
  let discount = 0;
  if (qty >= 50) discount = 0.18;
  else if (qty >= 25) discount = 0.12;
  else if (qty >= 10) discount = 0.07;
  else if (qty >= 5) discount = 0.03;

  const unit = Math.round(unitWholesaleBdt * (1 - discount));
  const subtotal = unit * qty;
  return {
    quantity: qty,
    unit_price_bdt: unit,
    discount_pct: Math.round(discount * 100),
    subtotal_bdt: subtotal,
    estimated_ship_days: qty >= 25 ? "10–14" : "5–7",
  };
}
