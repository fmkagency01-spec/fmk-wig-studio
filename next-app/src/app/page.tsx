import Link from "next/link";
import Image from "next/image";
import { fetchProducts, fetchCategories, fetchBrandSettings } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import { ArrowRight, Globe2, ShieldCheck, Sparkles, Truck } from "lucide-react";
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

      {/* Full-bleed hero — brand first */}
      <section className="relative overflow-hidden min-h-[88vh] flex items-end md:items-center">
        <Image
          src="/hero-model.jpg"
          alt="FMK WIG — premium wig styling"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/15" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-28 w-full">
          <div className="max-w-2xl space-y-6 text-white">
            <p className="font-display text-sm md:text-base tracking-[0.28em] uppercase text-white/85">
              FMK WIG
            </p>
            <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[0.98]">
              {settings.hero_title || "Craft Your Confidence"}
            </h1>
            <p className="text-base md:text-lg text-white/85 max-w-md leading-relaxed">
              {settings.hero_subtitle ||
                "Premium human hair & synthetic systems — retail ready, wholesale capable, built for global markets."}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center rounded-sm bg-brand px-8 text-sm font-semibold text-brand-foreground"
              >
                {settings.hero_cta || "Shop the collection"}
              </Link>
              <Link
                href="/wholesale"
                className="inline-flex h-12 items-center rounded-sm border border-white/40 px-8 text-sm font-medium text-white hover:bg-white/10"
              >
                Wholesale partners
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-secondary/50">
        <div className="mx-auto max-w-7xl px-4 py-7 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Truck, title: "Free delivery", sub: "Orders over ৳5,000" },
            { icon: ShieldCheck, title: "Authentic quality", sub: "Inspected before ship" },
            { icon: Globe2, title: "Global ready", sub: "BDT & USD display" },
            { icon: Sparkles, title: "B2B quotes", sub: "Instant volume tiers" },
          ].map((f) => (
            <div key={f.title} className="flex flex-col items-center gap-1.5">
              <f.icon className="h-5 w-5 text-brand" />
              <div className="text-sm font-semibold">{f.title}</div>
              <div className="text-xs text-muted-foreground">{f.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Brand story — one job */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <Image
            src="/products/wig-bodywave.jpg"
            alt="FMK WIG body wave lace front"
            fill
            sizes="(max-width:768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="space-y-5 max-w-lg">
          <p className="text-xs uppercase tracking-[0.22em] text-brand font-semibold">The brand</p>
          <h2 className="font-display text-4xl md:text-5xl font-semibold leading-tight">
            Built for salons, distributors, and everyday confidence.
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            FMK WIG bridges factory-direct supply with a polished retail experience. Filter by hair
            type, texture, density and cap size — then scale into wholesale with instant MOQ quotes.
          </p>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand"
          >
            Our story <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Split channels — full-bleed panels, not floating cards */}
      <section className="grid md:grid-cols-2">
        <Link
          href="/shop"
          className="group relative min-h-72 md:min-h-96 flex flex-col justify-end p-10 text-white overflow-hidden"
        >
          <Image
            src="/products/wig-straight.jpg"
            alt="Retail collection"
            fill
            sizes="50vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/50 group-hover:bg-black/45 transition-colors" />
          <div className="relative space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Retail</p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold">Shop the collection</h2>
            <p className="text-sm text-white/80 max-w-sm">
              Human hair, lace fronts, synthetics — filtered to match your style.
            </p>
          </div>
        </Link>
        <Link
          href="/wholesale"
          className="group relative min-h-72 md:min-h-96 flex flex-col justify-end p-10 text-white overflow-hidden bg-foreground"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.28_0.06_20)] to-[oklch(0.16_0.03_20)]" />
          <div className="relative space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Wholesale / B2B</p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold">Partner with FMK</h2>
            <p className="text-sm text-white/80 max-w-sm">
              Instant volume quotes, MOQs, and FAOS-connected lead sync for your team.
            </p>
          </div>
        </Link>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between gap-4 mb-8">
          <h2 className="font-display text-3xl md:text-4xl font-semibold">Shop by category</h2>
          <Link href="/shop" className="text-sm font-semibold text-brand hidden sm:inline-flex items-center gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop?category=${c.slug}`}
              className="aspect-square bg-gradient-to-br from-brand-soft to-secondary flex items-end p-4 hover:opacity-90 transition-opacity"
            >
              <span className="text-sm font-semibold">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="flex items-end justify-between gap-4 mb-8">
          <h2 className="font-display text-3xl md:text-4xl font-semibold">Featured pieces</h2>
          <Link href="/shop" className="text-sm font-semibold text-brand hidden sm:inline-flex items-center gap-1">
            Shop all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
