import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";
import { Instagram, Facebook, Mail, Phone } from "lucide-react";

export function Footer() {
  const { data: settings } = useQuery(settingsQuery);
  const brand = settings?.name || "FMK WIG";
  return (
    <footer className="mt-20 bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <h3 className="font-display text-xl font-bold text-brand">{brand}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{settings?.tagline || "Own Your Look"}</p>
          <div className="flex gap-3 mt-4">
            <a href="#" aria-label="Instagram" className="p-2 rounded-full bg-background hover:text-brand"><Instagram className="h-4 w-4" /></a>
            <a href="#" aria-label="Facebook" className="p-2 rounded-full bg-background hover:text-brand"><Facebook className="h-4 w-4" /></a>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3">Shop</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/shop">All Wigs</Link></li>
            <li><Link to="/shop" search={{ category: "human-hair-wigs" }}>Human Hair</Link></li>
            <li><Link to="/shop" search={{ category: "lace-front-wigs" }}>Lace Front</Link></li>
            <li><Link to="/wholesale">Wholesale / B2B</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3">Help</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/account">My Account</Link></li>
            <li><Link to="/orders">Track Order</Link></li>
            <li><a href="#">Shipping</a></li>
            <li><a href="#">Returns</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3">Contact</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +880 1XXX-XXXXXX</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@fmkwig.com</li>
            <li>Dhaka, Bangladesh</li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted-foreground flex flex-wrap justify-between gap-2">
          <span>© {new Date().getFullYear()} {brand}. All rights reserved.</span>
          <span>Cash on delivery available across Bangladesh</span>
        </div>
      </div>
    </footer>
  );
}
