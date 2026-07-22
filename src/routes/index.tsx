import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { productsQuery, categoriesQuery, settingsQuery } from "@/lib/queries";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Truck, ShieldCheck, RefreshCcw, Sparkles, Building2, Scissors } from "lucide-react";
import heroImg from "@/assets/hero-model.jpg";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: products } = useQuery(productsQuery({ featured: true }));
  const { data: categories } = useQuery(categoriesQuery);
  const { data: settings } = useQuery(settingsQuery);

  useEffect(() => {
    void trackEvent({ event_name: "home_view" });
  }, []);

  return (
    <div>
      <section className="relative overflow-hidden min-h-[70vh] flex items-end md:items-center">
        <img
          src={heroImg}
          alt="FMK WIG model wearing premium wig"
          className="absolute inset-0 h-full w-full object-cover"
          width={1600}
          height={1000}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/20" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24 w-full">
          <div className="max-w-xl space-y-5 text-white">
            <p className="font-display text-sm tracking-[0.2em] uppercase text-white/80">
              FMK WIG
            </p>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05]">
              {settings?.hero_title || "Craft Your Confidence"}
            </h1>
            <p className="text-base md:text-lg text-white/85 max-w-md">
              {settings?.hero_subtitle ||
                "Premium human hair & synthetic systems — retail ready, wholesale capable, shipped across Bangladesh."}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild size="lg" className="bg-brand text-brand-foreground hover:opacity-90">
                <Link to="/shop">{settings?.hero_cta || "Shop Now"}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="bg-white/15 text-white border-white/30 hover:bg-white/25"
              >
                <Link to="/wholesale">Wholesale / B2B</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-secondary/40">
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

      <section className="mx-auto max-w-7xl px-4 py-14 grid md:grid-cols-2 gap-4">
        <Link
          to="/shop"
          className="group relative overflow-hidden rounded-2xl min-h-56 bg-gradient-to-br from-brand to-sale text-white p-8 flex flex-col justify-end"
        >
          <Scissors className="absolute top-6 right-6 h-10 w-10 opacity-40 group-hover:scale-110 transition-transform" />
          <h2 className="text-2xl font-bold">Retail</h2>
          <p className="text-white/90 text-sm mt-1 max-w-sm">
            1–2 piece orders with nationwide COD — filter by hair type, cap size, texture & density.
          </p>
          <span className="mt-4 text-sm font-semibold underline-offset-4 group-hover:underline">
            Shop retail →
          </span>
        </Link>
        <Link
          to="/wholesale"
          className="group relative overflow-hidden rounded-2xl min-h-56 bg-foreground text-background p-8 flex flex-col justify-end"
        >
          <Building2 className="absolute top-6 right-6 h-10 w-10 opacity-30 group-hover:scale-110 transition-transform" />
          <h2 className="text-2xl font-bold">Wholesale</h2>
          <p className="text-background/80 text-sm mt-1 max-w-sm">
            Salon & distributor MOQs with an instant quote generator and Jarvis order sync.
          </p>
          <span className="mt-4 text-sm font-semibold underline-offset-4 group-hover:underline">
            Get a quote →
          </span>
        </Link>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Shop by Category</h2>
            <p className="text-muted-foreground text-sm mt-1">Find your perfect look</p>
          </div>
          <Link to="/shop" className="text-sm text-brand hover:underline hidden sm:inline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {categories?.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              className="group relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-brand-soft to-brand/20 flex items-end p-4 hover:shadow-lg transition-shadow"
            >
              <div className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors">
                {c.name}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Featured Wigs</h2>
            <p className="text-muted-foreground text-sm mt-1">Our best sellers this season</p>
          </div>
          <Link to="/shop" className="text-sm text-brand hover:underline">
            Shop all →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products?.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="rounded-2xl border bg-secondary/50 p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold">Customize your wig</h2>
            <p className="mt-2 text-muted-foreground">
              Cap size, density, and custom dyeing — request a tailored unit for retail or bulk.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Button asChild size="lg" className="bg-brand text-brand-foreground">
              <Link
                to="/shop"
                search={{ custom_dyeing: "true" }}
              >
                Browse custom-dye SKUs
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/wholesale">B2B customization</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
