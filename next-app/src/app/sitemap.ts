import type { MetadataRoute } from "next";
import { absUrl } from "@/lib/seo";
import { fetchProducts, fetchCategories } from "@/lib/supabase";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absUrl("/shop"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absUrl("/wholesale"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  try {
    const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: absUrl(`/product/${p.slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
    const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
      url: absUrl(`/shop?category=${c.slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}
