import { createClient } from "@supabase/supabase-js";
import {
  FALLBACK_CATEGORIES,
  fallbackProductBySlug,
  fallbackProducts,
} from "@/lib/catalog-fallback";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

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
  sort_order: number;
};

function mapProduct(p: Record<string, unknown>): Product {
  return {
    id: String(p.id),
    name: String(p.name),
    slug: String(p.slug),
    description: (p.description as string | null) ?? null,
    price: Number(p.price),
    compare_at_price: p.compare_at_price != null ? Number(p.compare_at_price) : null,
    currency: String(p.currency || "BDT"),
    stock: Number(p.stock || 0),
    category_id: (p.category_id as string | null) ?? null,
    images: Array.isArray(p.images) ? (p.images as string[]) : [],
    featured: Boolean(p.featured),
    active: Boolean(p.active),
  };
}

export async function fetchProducts(opts?: { featured?: boolean; categoryId?: string | null }) {
  try {
    let q = supabase.from("products").select("*").eq("active", true).order("created_at", { ascending: false });
    if (opts?.featured) q = q.eq("featured", true);
    if (opts?.categoryId) q = q.eq("category_id", opts.categoryId);
    const { data, error } = await q;
    if (error) throw error;
    const mapped = (data || []).map((row) => mapProduct(row as Record<string, unknown>));
    if (mapped.length === 0) return fallbackProducts(opts);
    return mapped;
  } catch {
    return fallbackProducts(opts);
  }
}

export async function fetchProductBySlug(slug: string) {
  try {
    const { data, error } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();
    if (error) throw error;
    if (data) return mapProduct(data as Record<string, unknown>);
  } catch {
    /* fall through */
  }
  return fallbackProductBySlug(slug);
}

export async function fetchCategories() {
  try {
    const { data, error } = await supabase.from("categories").select("*").order("sort_order");
    if (error) throw error;
    if (data && data.length > 0) return data as Category[];
  } catch {
    /* fall through */
  }
  return FALLBACK_CATEGORIES;
}

export async function fetchBrandSettings() {
  try {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "brand").maybeSingle();
    return (data?.value as Record<string, string> | undefined) ?? {};
  } catch {
    return {};
  }
}
