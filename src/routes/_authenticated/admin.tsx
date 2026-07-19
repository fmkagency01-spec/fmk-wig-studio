import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useIsAdmin } from "@/lib/auth";
import { LayoutDashboard, Package, ShoppingCart, Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, loading, user } = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) return <div className="p-16 text-center text-muted-foreground">Checking access…</div>;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          This area is for administrators only.
        </p>
        <div className="mt-4 text-xs text-muted-foreground bg-muted p-3 rounded">
          To make yourself an admin, add a row to <code>user_roles</code> with your user id ({user?.id?.slice(0, 8)}…) and role <code>admin</code>.
        </div>
        <Button asChild variant="outline" className="mt-6"><Link to="/">Back to store</Link></Button>
      </div>
    );
  }

  const nav = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/products", label: "Products", icon: Package },
    { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
  ] as const;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 border-r bg-card p-4 flex flex-col gap-1 shrink-0 hidden md:flex">
        <div className="font-display text-xl font-bold text-brand mb-6 px-2">FMK Admin</div>
        {nav.map((n) => {
          const active = n.to === "/admin" ? pathname === "/admin" : pathname.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${active ? "bg-brand text-brand-foreground" : "hover:bg-accent"}`}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          );
        })}
        <Link to="/" className="mt-auto flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent">
          <ArrowLeft className="h-4 w-4" /> Back to store
        </Link>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="md:hidden border-b p-3 flex items-center gap-2 overflow-x-auto">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="text-xs whitespace-nowrap px-3 py-1.5 rounded-full border">{n.label}</Link>
          ))}
        </header>
        <Outlet />
      </div>
    </div>
  );
}
