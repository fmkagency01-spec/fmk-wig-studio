import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBDT } from "@/lib/format";
import { Package, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, products: 0, pending: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: orders }, { data: revData }, { count: products }, { count: pending }] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total"),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      const revenue = (revData || []).reduce((s: number, r: any) => s + Number(r.total), 0);
      setStats({ orders: orders || 0, revenue, products: products || 0, pending: pending || 0 });
    })();
  }, []);

  const cards = [
    { label: "Total Orders", value: stats.orders.toString(), icon: ShoppingCart },
    { label: "Revenue", value: formatBDT(stats.revenue), icon: DollarSign },
    { label: "Products", value: stats.products.toString(), icon: Package },
    { label: "Pending", value: stats.pending.toString(), icon: TrendingUp },
  ];

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="border rounded-lg p-5 bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</span>
              <c.icon className="h-5 w-5 text-brand" />
            </div>
            <div className="text-2xl font-bold mt-2">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
