import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t bg-[oklch(0.14_0.02_340)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1 space-y-3">
          <div className="font-display text-2xl font-bold tracking-tight">FMK WIG</div>
          <p className="text-sm text-white/70 leading-relaxed">
            Premium human hair & synthetic systems for retail clients and global wholesale partners.
          </p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-[0.18em] text-white/50 mb-3">Shop</h3>
          <ul className="space-y-2 text-sm text-white/85">
            <li>
              <Link href="/shop" className="hover:text-white">
                All wigs
              </Link>
            </li>
            <li>
              <Link href="/shop?hair_type=human" className="hover:text-white">
                Human hair
              </Link>
            </li>
            <li>
              <Link href="/shop?hair_type=synthetic" className="hover:text-white">
                Synthetic
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-white">
                Cart
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-[0.18em] text-white/50 mb-3">Wholesale</h3>
          <ul className="space-y-2 text-sm text-white/85">
            <li>
              <Link href="/wholesale" className="hover:text-white">
                Instant quotes
              </Link>
            </li>
            <li>
              <Link href="/wholesale#inquiry" className="hover:text-white">
                B2B inquiry
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white">
                About FMK
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-[0.18em] text-white/50 mb-3">Support</h3>
          <ul className="space-y-2 text-sm text-white/85">
            <li>
              <Link href="/contact" className="hover:text-white">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/auth" className="hover:text-white">
                Sign in
              </Link>
            </li>
            <li>
              <span className="text-white/60">BDT / USD display · Worldwide shipping</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs text-white/50 flex flex-wrap justify-between gap-2">
          <span>© {year} FMK WIG. All rights reserved.</span>
          <span>Retail + Wholesale · FAOS-connected operations</span>
        </div>
      </div>
    </footer>
  );
}
