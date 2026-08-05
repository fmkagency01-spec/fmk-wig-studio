import type { Metadata } from "next";
import { languageAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact FMK WIG for retail support, wholesale partnerships, and press inquiries.",
  alternates: { canonical: "/contact", languages: languageAlternates("/contact") },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
