"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useCurrency, type CurrencyCode } from "@/lib/currency";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/wholesale", label: "Wholesale" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header({ brandName = "FMK WIG" }: { brandName?: string }) {
  const { count } = useCart();
  const { user } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  const toggle = (c: CurrencyCode) => setCurrency(c);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-4">
        <button className="md:hidden p-1" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        <Link href="/" className="font-display text-2xl md:text-3xl font-bold tracking-tight text-brand">
          {brandName}
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "text-brand" : "text-foreground/80 hover:text-brand"}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <div className="hidden sm:flex items-center mr-2 border text-[11px] font-semibold overflow-hidden">
            <button
              type="button"
              onClick={() => toggle("BDT")}
              className={`px-2.5 py-1 ${currency === "BDT" ? "bg-brand text-brand-foreground" : "hover:bg-accent"}`}
            >
              ৳
            </button>
            <button
              type="button"
              onClick={() => toggle("USD")}
              className={`px-2.5 py-1 ${currency === "USD" ? "bg-brand text-brand-foreground" : "hover:bg-accent"}`}
            >
              $
            </button>
          </div>
          <Link href={user ? "/account" : "/auth"} aria-label="Account" className="p-2 hover:text-brand">
            <User className="h-5 w-5" />
          </Link>
          <Link href="/cart" aria-label="Cart" className="p-2 hover:text-brand relative">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-brand text-brand-foreground text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t px-4 py-4 flex flex-col gap-3 text-sm font-medium">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href={user ? "/account" : "/auth"}>{user ? "Account" : "Sign in"}</Link>
        </nav>
      )}
    </header>
  );
}
