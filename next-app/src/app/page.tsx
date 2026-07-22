import Link from "next/link";
import Image from "next/image";
import { fetchProducts, fetchCategories, fetchBrandSettings } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import { Building2, Scissors, ShieldCheck, Sparkles, Truck, RefreshCcw } from "lucide-react";
import { HomeTracker } from "./home-tracker";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, categories, settings] = await Promise.all([
    fetchProducts({ featured: true }),
    fetchCategories(),
    fetchBrandSettings(),
  ]);

  return (
    <div>
      <HomeTracker />
      <section className="relative overflow-hidden min-h-[70vh] flex items-end md:items-center">
        <Image
          src="/hero-model.jpg"
          alt="FMK WIG model"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/20" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24 w-full">
          <div className="max-w-xl space-y-5 text-white">
            <p className="font-display text-sm tracking-[0.2em] uppercase text-white/80">FMK WIG</p>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05]">
              {settings.hero_title || "Craft Your Confidence"}
            </h1>
            <p className="text-base md:text-lg text-white/85 max-w-md">
              {settings.hero_subtitle ||
                "Premium human hair & synthetic systems — retail ready, wholesale capable."}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/shop"
                className="inline-flex h-11 items-center rounded-md bg-brand px-8 text-sm font-medium text-brand-foreground"
              >
                {settings.hero_cta || "Shop Now"}
              </Link>
              <Link
                href="/wholesale"
                className="inline-flex h-11 items-center rounded-md border border-white/30 bg-white/15 px-8 text-sm font-medium text-white"
              >
                Wholesale / B2B
              </Link>
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
          href="/shop"
          className="group relative overflow-hidden rounded-2xl min-h-56 bg-gradient-to-br from-brand to-sale text-white p-8 flex flex-col justify-end"
        >
          <Scissors className="absolute top-6 right-6 h-10 w-10 opacity-40" />
          <h2 className="text-2xl font-bold">Retail</h2>
          <p className="text-white/90 text-sm mt-1 max-w-sm">
            Filter by hair type, cap size, texture, density & custom dyeing.
          </p>
        </Link>
        <Link
          href="/wholesale"
          className="group relative overflow-hidden rounded-2xl min-h-56 bg-foreground text-background p-8 flex flex-col justify-end"
        >
          <Building2 className="absolute top-6 right-6 h-10 w-10 opacity-30" />
          <h2 className="text-2xl font-bold">Wholesale</h2>
          <p className="text-background/80 text-sm mt-1 max-w-sm">
            Instant quotes, MOQs, and Jarvis Common Center sync.
          </p>
        </Link>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6">
        <h2 className="text-3xl font-bold mb-6">Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop?category=${c.slug}`}
              className="aspect-square rounded-xl bg-gradient-to-br from-brand-soft to-brand/20 flex items-end p-4 hover:shadow-lg"
            >
              <span className="text-sm font-semibold">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-3xl font-bold mb-6">Featured Wigs</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
