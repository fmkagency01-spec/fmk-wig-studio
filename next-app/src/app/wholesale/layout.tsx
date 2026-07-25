import type { Metadata } from "next";
import { languageAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Wholesale & B2B Wigs — Bulk Pricing & Instant Quotes",
  description:
    "Factory-direct wholesale wigs for salons, distributors and resellers. Instant volume quotes, low MOQs, and international bulk supply. Onboard as a B2B partner.",
  alternates: { canonical: "/wholesale", languages: languageAlternates("/wholesale") },
  openGraph: {
    title: "Wholesale & B2B Wigs — FMK WIG",
    description:
      "Factory-direct wholesale wigs with instant volume quotes and low MOQs. International bulk supply for salons & distributors.",
    url: "/wholesale",
  },
};

export default function WholesaleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
