import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { languageAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About FMK WIG",
  description:
    "FMK WIG is a Bangladesh-rooted premium wig brand serving retail clients and international wholesale partners with factory-direct quality.",
  alternates: { canonical: "/about", languages: languageAlternates("/about") },
};

export default function AboutPage() {
  return (
    <div>
      <section className="relative min-h-[50vh] flex items-end overflow-hidden">
        <Image
          src="/hero-model.jpg"
          alt="FMK WIG brand"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 w-full text-white">
          <p className="text-xs uppercase tracking-[0.22em] text-white/70 mb-3">About</p>
          <h1 className="font-display text-4xl md:text-6xl font-semibold max-w-2xl">
            A wig brand built for confidence — and for scale.
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 md:py-24 space-y-6">
        <p className="text-lg text-muted-foreground leading-relaxed">
          FMK WIG started with a simple goal: make premium human hair and synthetic systems accessible
          for everyday wearers, salons, and distributors — without sacrificing quality control.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Today we operate a dual channel. Retail customers shop filtered collections with transparent
          BDT/USD pricing. Wholesale partners generate instant volume quotes, submit B2B inquiries, and
          sync into our FAOS operations stack for monitoring, ads, and day-to-day fulfillment.
        </p>
        <div className="pt-4 flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="inline-flex h-11 items-center rounded-sm bg-brand px-6 text-sm font-semibold text-brand-foreground"
          >
            Shop collection
          </Link>
          <Link
            href="/wholesale"
            className="inline-flex h-11 items-center rounded-sm border px-6 text-sm font-medium"
          >
            Become a partner
          </Link>
        </div>
      </section>
    </div>
  );
}
