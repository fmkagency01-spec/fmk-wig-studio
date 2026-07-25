import type { Metadata } from "next";
import { fetchProducts, fetchCategories } from "@/lib/supabase";
import { languageAlternates } from "@/lib/seo";
import { ShopClient } from "./shop-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop Wigs — Human Hair, Lace Front & Synthetic",
  description:
    "Browse premium wigs and hair systems. Filter by hair type, cap size, texture and density. Worldwide shipping with BDT / USD pricing.",
  alternates: { canonical: "/shop", languages: languageAlternates("/shop") },
  openGraph: {
    title: "Shop Wigs — FMK WIG",
    description: "Premium human hair & synthetic wigs. Filter by type, texture, density. Worldwide shipping.",
    url: "/shop",
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const categorySlug = typeof params.category === "string" ? params.category : undefined;
  const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
  const current = categories.find((c) => c.slug === categorySlug);
  const scoped = current ? products.filter((p) => p.category_id === current.id) : products;

  return (
    <ShopClient
      products={scoped}
      categories={categories}
      initialFilters={{
        category: categorySlug,
        hair_type: typeof params.hair_type === "string" ? params.hair_type : undefined,
        cap_size: typeof params.cap_size === "string" ? params.cap_size : undefined,
        texture: typeof params.texture === "string" ? params.texture : undefined,
        density: typeof params.density === "string" ? params.density : undefined,
        custom_dyeing: typeof params.custom_dyeing === "string" ? params.custom_dyeing : undefined,
      }}
    />
  );
}
