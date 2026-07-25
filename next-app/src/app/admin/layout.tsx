"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useIsAdmin } from "@/lib/admin";
import { LayoutDashboard, ShoppingCart, BarChart3, Building2, ShieldAlert } from "lucide-react";

const TABS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/inquiries", label: "B2B Leads", icon: Building2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, ready, user } = useIsAdmin();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace("/auth?next=/admin");
  }, [ready, user, router]);

  if (!ready) return <div className="p-16 text-center text-muted-foreground">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShieldAlert className="h-14 w-14 mx-auto text-muted-foreground/60" />
        <h1 className="text-2xl font-bold mt-4">Admin access required</h1>
        <p className="text-muted-foreground mt-2">
          Your account doesn&apos;t have the <code>admin</code> role. Ask an owner to grant it, then reload.
        </p>
        <Link href="/" className="mt-6 inline-flex rounded-md border px-5 py-2.5 text-sm font-medium">
          Back to store
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Admin</h1>
      <nav className="flex flex-wrap gap-2 mb-6 border-b pb-3">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${
                active ? "bg-brand text-brand-foreground" : "border hover:bg-accent"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
