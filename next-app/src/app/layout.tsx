import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { CurrencyProvider } from "@/lib/currency";
import { Header } from "@/components/Header";
import { TrackingScripts } from "@/components/TrackingScripts";
import { SITE, absUrl, languageAlternates, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "FMK WIG — Premium Human Hair & Wholesale Wigs",
    template: "%s · FMK WIG",
  },
  description: SITE.description,
  keywords: [...SITE.keywords],
  applicationName: SITE.name,
  alternates: { canonical: "/", languages: languageAlternates("/") },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: "FMK WIG — Premium Human Hair & Wholesale Wigs",
    description: SITE.description,
    url: SITE.url,
    locale: "en_US",
    images: [{ url: absUrl("/hero-model.jpg"), width: 1200, height: 630, alt: "FMK WIG" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FMK WIG — Premium Human Hair & Wholesale Wigs",
    description: SITE.description,
    images: [absUrl("/hero-model.jpg")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} min-h-screen flex flex-col antialiased`}>
        <TrackingScripts />
        <CurrencyProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="mt-16 border-t bg-secondary">
            <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground flex flex-wrap justify-between gap-2">
              <span>© {new Date().getFullYear()} FMK WIG. All rights reserved.</span>
              <span>Retail + Wholesale · BDT / USD · Jarvis-ready</span>
            </div>
          </footer>
          <Toaster position="top-center" richColors />
        </CurrencyProvider>
      </body>
    </html>
  );
}
