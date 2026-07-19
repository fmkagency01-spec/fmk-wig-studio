import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { productsQuery, categoriesQuery, settingsQuery } from "@/lib/queries";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Truck, ShieldCheck, RefreshCcw, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-model.jpg";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: products } = useQuery(productsQuery({ featured: true }));
  const { data: categories } = useQuery(categoriesQuery);
  const { data: settings } = useQuery(settingsQuery);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-soft via-background to-brand-soft">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-20 grid gap-8 md:grid-cols-2 items-center">
          <div className="space-y-6 order-2 md:order-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand bg-background px-3 py-1 rounded-full">
              <Sparkles className="h-3 w-3" /> New collection
            </span>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              {settings?.hero_title || "Premium Wigs for Every Look"}
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              {settings?.hero_subtitle || "Human hair, lace front, synthetic — hand-selected quality shipped across Bangladesh."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-brand text-brand-foreground hover:opacity-90">
                <Link to="/shop">{settings?.hero_cta || "Shop Now"}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/shop" search={{ category: "human-hair-wigs" }}>Human Hair</Link>
              </Button>
            </div>
          </div>
          <div className="order-1 md:order-2 relative aspect-[4/5] max-w-md mx-auto md:max-w-none rounded-2xl overflow-hidden shadow-2xl">
            <img src={heroImg} alt="FMK WIG model wearing premium wig" width={1600} height={1000} className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      {/* USPs */}
      <section className="border-y bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { icon: Truck, title: "Free Delivery", sub: "Over ৳5000" },
            { icon: ShieldCheck, title: "100% Authentic", sub: "Quality checked" },
            { icon: RefreshCcw, title: "Easy Returns", sub: "7 day policy" },
            { icon: Sparkles, title: "Cash on Delivery", sub: "Nationwide" },
          ].map((f) => (
            <div key={f.title} className="flex flex-col items-center gap-1">
              <f.icon className="h-6 w-6 text-brand" />
              <div className="text-sm font-semibold">{f.title}</div>
              <div className="text-xs text-muted-foreground">{f.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Shop by Category</h2>
            <p className="text-muted-foreground text-sm mt-1">Find your perfect look</p>
          </div>
          <Link to="/shop" className="text-sm text-brand hover:underline hidden sm:inline">View all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {categories?.map((c) => (
            <Link key={c.id} to="/shop" search={{ category: c.slug }} className="group relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-brand-soft to-brand/20 flex items-end p-4 hover:shadow-lg transition-shadow">
              <div className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Featured Wigs</h2>
            <p className="text-muted-foreground text-sm mt-1">Our best sellers this season</p>
          </div>
          <Link to="/shop" className="text-sm text-brand hover:underline">Shop all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products?.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="rounded-2xl bg-gradient-to-r from-brand to-sale text-white p-8 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to transform your look?</h2>
          <p className="mt-2 opacity-90">Explore our full collection and get free shipping on orders over ৳5000.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link to="/shop">Shop the Collection</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
