import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { productsQuery, categoriesQuery } from "@/lib/queries";
import { ProductCard } from "@/components/ProductCard";
import { FILTER_OPTIONS, matchesFilters } from "@/lib/product-attributes";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { SlidersHorizontal, X } from "lucide-react";

const searchSchema = z.object({
  category: z.string().optional(),
  hair_type: z.string().optional(),
  cap_size: z.string().optional(),
  texture: z.string().optional(),
  density: z.string().optional(),
  custom_dyeing: z.string().optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: searchSchema,
  component: ShopPage,
  head: () => ({
    meta: [
      { title: "Shop All Wigs — FMK WIG" },
      {
        name: "description",
        content:
          "Browse our full collection of premium wigs and hair extensions. Filter by hair type, cap size, texture, density, and custom dyeing.",
      },
    ],
  }),
});

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: readonly { value: string; label: string }[];
  onChange: (v: string | undefined) => void;
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

function ShopPage() {
  const search = Route.useSearch();
  const { category: categorySlug, hair_type, cap_size, texture, density, custom_dyeing } = search;
  const navigate = useNavigate({ from: "/shop" });
  const { data: categories } = useQuery(categoriesQuery);
  const currentCategory = categories?.find((c) => c.slug === categorySlug);
  const { data: products, isLoading } = useQuery(
    productsQuery({ category: currentCategory?.id ?? null }),
  );

  useEffect(() => {
    void trackEvent({ event_name: "shop_view", metadata: { ...search } });
  }, [search]);

  const filtered =
    products?.filter((p) =>
      matchesFilters(p.slug, { hair_type, cap_size, texture, density, custom_dyeing }),
    ) ?? [];

  const setFilter = (key: keyof typeof search, value: string | undefined) => {
    void navigate({
      search: (prev: Record<string, string | undefined>) => {
        const next = { ...prev, [key]: value };
        if (!value) delete next[key];
        return next;
      },
    });
  };

  const clearFilters = () => {
    void navigate({
      search: categorySlug ? { category: categorySlug } : {},
    });
  };

  const hasAttrFilters = Boolean(hair_type || cap_size || texture || density || custom_dyeing);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">{currentCategory?.name || "All Wigs"}</h1>
          <p className="text-muted-foreground mt-1">
            {currentCategory?.description ||
              "Filter by hair type, cap size, texture, density & custom dyeing"}
          </p>
        </div>
        <Link to="/wholesale" className="text-sm font-medium text-brand hover:underline">
          Looking for wholesale? →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => void navigate({ search: { ...search, category: undefined } })}
          className={`px-4 py-1.5 rounded-full text-sm border ${!categorySlug ? "bg-brand text-brand-foreground border-brand" : "hover:bg-accent"}`}
        >
          All
        </button>
        {categories?.map((c) => (
          <button
            key={c.id}
            onClick={() => void navigate({ search: { ...search, category: c.slug } })}
            className={`px-4 py-1.5 rounded-full text-sm border ${categorySlug === c.slug ? "bg-brand text-brand-foreground border-brand" : "hover:bg-accent"}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4 rounded-xl border bg-card p-4 h-fit sticky top-24">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </h2>
            {hasAttrFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-brand flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          <FilterSelect
            label="Hair Type"
            value={hair_type}
            options={FILTER_OPTIONS.hair_type}
            onChange={(v) => setFilter("hair_type", v)}
          />
          <FilterSelect
            label="Cap Size"
            value={cap_size}
            options={FILTER_OPTIONS.cap_size}
            onChange={(v) => setFilter("cap_size", v)}
          />
          <FilterSelect
            label="Texture"
            value={texture}
            options={FILTER_OPTIONS.texture}
            onChange={(v) => setFilter("texture", v)}
          />
          <FilterSelect
            label="Density"
            value={density}
            options={FILTER_OPTIONS.density}
            onChange={(v) => setFilter("density", v)}
          />
          <FilterSelect
            label="Custom Dyeing"
            value={custom_dyeing}
            options={FILTER_OPTIONS.custom_dyeing}
            onChange={(v) => setFilter("custom_dyeing", v)}
          />
        </aside>

        <div>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">{filtered.length} products</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              No products match these filters.{" "}
              <button onClick={clearFilters} className="text-brand underline">
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
