import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingBag, User, Menu, X, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery, categoriesQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { useCurrency, type CurrencyCode } from "@/lib/currency";

export function Header() {
  const { count } = useCart();
  const { user } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { data: settings } = useQuery(settingsQuery);
  const { data: categories } = useQuery(categoriesQuery);
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [pathname]);

  const brandName = settings?.name || "FMK WIG";
  const announcement = settings?.announcement;

  const toggleCurrency = (c: CurrencyCode) => setCurrency(c);

  return (
    <header className="sticky top-0 z-50 bg-background">
      {announcement && (
        <div className="bg-brand text-brand-foreground text-center text-xs sm:text-sm py-2 px-4">
          {announcement}
        </div>
      )}
      <div className="border-b">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-4">
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link to="/" className="font-display text-2xl font-bold tracking-tight text-brand">
            {brandName}
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/" className="hover:text-brand transition-colors">
              Home
            </Link>
            <Link to="/shop" className="hover:text-brand transition-colors">
              Shop
            </Link>
            <Link to="/wholesale" className="hover:text-brand transition-colors">
              Wholesale
            </Link>
            {categories?.slice(0, 2).map((c) => (
              <Link
                key={c.id}
                to="/shop"
                search={{ category: c.slug }}
                className="hover:text-brand transition-colors"
              >
                {c.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <div className="hidden sm:flex items-center mr-1 rounded-full border text-[11px] font-semibold overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCurrency("BDT")}
                className={`px-2 py-1 ${currency === "BDT" ? "bg-brand text-brand-foreground" : "hover:bg-accent"}`}
              >
                ৳
              </button>
              <button
                type="button"
                onClick={() => toggleCurrency("USD")}
                className={`px-2 py-1 ${currency === "USD" ? "bg-brand text-brand-foreground" : "hover:bg-accent"}`}
              >
                $
              </button>
            </div>
            <Link to="/shop" aria-label="Search" className="p-2 hover:text-brand">
              <Search className="h-5 w-5" />
            </Link>
            <Link
              to={user ? "/account" : "/auth"}
              aria-label="Account"
              className="p-2 hover:text-brand"
            >
              <User className="h-5 w-5" />
            </Link>
            <Link to="/cart" aria-label="Cart" className="p-2 hover:text-brand relative">
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
          <nav className="md:hidden border-t bg-background px-4 py-3 flex flex-col gap-2 text-sm">
            <Link to="/" className="py-2">
              Home
            </Link>
            <Link to="/shop" className="py-2">
              Shop All
            </Link>
            <Link to="/wholesale" className="py-2">
              Wholesale / B2B
            </Link>
            {categories?.map((c) => (
              <Link
                key={c.id}
                to="/shop"
                search={{ category: c.slug }}
                className="py-2 pl-3 text-muted-foreground"
              >
                {c.name}
              </Link>
            ))}
            <div className="flex gap-2 py-2">
              <button
                className={`flex-1 rounded-md border py-2 ${currency === "BDT" ? "bg-brand text-brand-foreground" : ""}`}
                onClick={() => toggleCurrency("BDT")}
              >
                BDT ৳
              </button>
              <button
                className={`flex-1 rounded-md border py-2 ${currency === "USD" ? "bg-brand text-brand-foreground" : ""}`}
                onClick={() => toggleCurrency("USD")}
              >
                USD $
              </button>
            </div>
            {user ? (
              <>
                <Link to="/account" className="py-2">
                  My Account
                </Link>
                <Link to="/orders" className="py-2">
                  My Orders
                </Link>
              </>
            ) : (
              <Link to="/auth" className="py-2">
                <Button size="sm" variant="default" className="w-full">
                  Sign in
                </Button>
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
