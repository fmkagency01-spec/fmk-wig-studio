"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, Product } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import { FILTER_OPTIONS, matchesFilters } from "@/lib/product-attributes";
import { trackEvent } from "@/lib/analytics";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

type Filters = {
  category?: string;
  hair_type?: string;
  cap_size?: string;
  texture?: string;
  density?: string;
  custom_dyeing?: string;
};

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: readonly { value: string; label: string }[];
  onChange: (v?: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        value={value || ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ShopClient({
  products,
  categories,
  initialFilters,
}: {
  products: Product[];
  categories: Category[];
  initialFilters: Filters;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(initialFilters);

  useEffect(() => {
    void trackEvent({ event_name: "shop_view", metadata: { ...filters } });
  }, [filters]);

  const filtered = useMemo(
    () => products.filter((p) => matchesFilters(p.slug, filters)),
    [products, filters],
  );

  const push = (next: Filters) => {
    setFilters(next);
    const q = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v) q.set(k, v);
    });
    router.replace(`/shop${q.toString() ? `?${q}` : ""}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">
            {categories.find((c) => c.slug === filters.category)?.name || "All Wigs"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Filter by hair type, cap size, texture, density & custom dyeing
          </p>
        </div>
        <Link href="/wholesale" className="text-sm font-medium text-brand hover:underline">
          Looking for wholesale? →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => push({ ...filters, category: undefined })}
          className={`px-4 py-1.5 rounded-full text-sm border ${!filters.category ? "bg-brand text-brand-foreground border-brand" : ""}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => push({ ...filters, category: c.slug })}
            className={`px-4 py-1.5 rounded-full text-sm border ${filters.category === c.slug ? "bg-brand text-brand-foreground border-brand" : ""}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4 rounded-xl border bg-card p-4 h-fit sticky top-24">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </h2>
          <Select
            label="Hair Type"
            value={filters.hair_type}
            options={FILTER_OPTIONS.hair_type}
            onChange={(v) => push({ ...filters, hair_type: v })}
          />
          <Select
            label="Cap Size"
            value={filters.cap_size}
            options={FILTER_OPTIONS.cap_size}
            onChange={(v) => push({ ...filters, cap_size: v })}
          />
          <Select
            label="Texture"
            value={filters.texture}
            options={FILTER_OPTIONS.texture}
            onChange={(v) => push({ ...filters, texture: v })}
          />
          <Select
            label="Density"
            value={filters.density}
            options={FILTER_OPTIONS.density}
            onChange={(v) => push({ ...filters, density: v })}
          />
          <Select
            label="Custom Dyeing"
            value={filters.custom_dyeing}
            options={FILTER_OPTIONS.custom_dyeing}
            onChange={(v) => push({ ...filters, custom_dyeing: v })}
          />
        </aside>

        <div>
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} products</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
