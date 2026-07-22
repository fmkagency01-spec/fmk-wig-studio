import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { CurrencyProvider } from "@/lib/currency";
import { Header } from "@/components/Header";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "FMK WIG — Premium Wigs & Hair Extensions",
  description:
    "Shop premium human hair wigs and wholesale systems. Filter by hair type, cap size, texture, density. Nationwide COD in Bangladesh.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} min-h-screen flex flex-col antialiased`}>
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
