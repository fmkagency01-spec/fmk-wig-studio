import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { CurrencyProvider } from "@/lib/currency";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackingScripts } from "@/components/TrackingScripts";
import { SITE, absUrl, languageAlternates, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { Toaster } from "sonner";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
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
      <body className={`${dmSans.variable} ${cormorant.variable} min-h-screen flex flex-col antialiased`}>
        <TrackingScripts />
        <CurrencyProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <Toaster position="top-center" richColors />
        </CurrencyProvider>
      </body>
    </html>
  );
}
