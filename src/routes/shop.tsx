import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { productsQuery, categoriesQuery } from "@/lib/queries";
import { ProductCard } from "@/components/ProductCard";

const searchSchema = z.object({
  category: z.string().optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: searchSchema,
  component: ShopPage,
  head: () => ({
    meta: [
      { title: "Shop All Wigs — FMK WIG" },
      { name: "description", content: "Browse our full collection of premium wigs and hair extensions." },
    ],
  }),
});

function ShopPage() {
  const { category: categorySlug } = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const { data: categories } = useQuery(categoriesQuery);
  const currentCategory = categories?.find((c) => c.slug === categorySlug);
  const { data: products, isLoading } = useQuery(productsQuery({ category: currentCategory?.id ?? null }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">{currentCategory?.name || "All Wigs"}</h1>
        <p className="text-muted-foreground mt-1">{currentCategory?.description || "Discover our full collection"}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => navigate({ search: {} })}
          className={`px-4 py-1.5 rounded-full text-sm border ${!categorySlug ? "bg-brand text-brand-foreground border-brand" : "hover:bg-accent"}`}
        >
          All
        </button>
        {categories?.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate({ search: { category: c.slug } })}
            className={`px-4 py-1.5 rounded-full text-sm border ${categorySlug === c.slug ? "bg-brand text-brand-foreground border-brand" : "hover:bg-accent"}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          No products found. <Link to="/shop" className="text-brand underline">View all</Link>
        </div>
      )}
    </div>
  );
}
