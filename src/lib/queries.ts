import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  stock: number;
  category_id: string | null;
  images: string[];
  featured: boolean;
  active: boolean;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

const mapProduct = (p: any): Product => ({
  ...p,
  price: Number(p.price),
  compare_at_price: p.compare_at_price != null ? Number(p.compare_at_price) : null,
  images: Array.isArray(p.images) ? p.images : [],
});

export const productsQuery = (opts?: { featured?: boolean; category?: string | null }) =>
  queryOptions({
    queryKey: ["products", opts],
    queryFn: async (): Promise<Product[]> => {
      let q = supabase.from("products").select("*").eq("active", true).order("created_at", { ascending: false });
      if (opts?.featured) q = q.eq("featured", true);
      if (opts?.category) q = q.eq("category_id", opts.category);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(mapProduct);
    },
  });

export const productBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data ? mapProduct(data) : null;
    },
  });

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase.from("categories").select("*").order("sort_order");
    if (error) throw error;
    return (data || []) as Category[];
  },
});

export const settingsQuery = queryOptions({
  queryKey: ["settings", "brand"],
  queryFn: async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "brand").maybeSingle();
    return (data?.value as Record<string, string> | undefined) ?? {};
  },
});
