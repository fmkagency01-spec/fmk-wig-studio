"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/currency";
import { Package, ShoppingCart, DollarSign, TrendingUp, Building2, Activity } from "lucide-react";

type Stats = {
  orders: number;
  revenue: number;
  pending: number;
  products: number;
  inquiries: number;
  events: number;
};

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats>({
    orders: 0,
    revenue: 0,
    pending: 0,
    products: 0,
    inquiries: 0,
    events: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [orders, revData, pending, products, inquiries, events] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("b2b_inquiries").select("*", { count: "exact", head: true }),
        supabase.from("analytics_events").select("*", { count: "exact", head: true }),
      ]);
      const revenue = ((revData.data as Array<{ total: number }> | null) || []).reduce(
        (s, r) => s + Number(r.total || 0),
        0,
      );
      setStats({
        orders: orders.count || 0,
        revenue,
        pending: pending.count || 0,
        products: products.count || 0,
        inquiries: inquiries.count || 0,
        events: events.count || 0,
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Total Orders", value: String(stats.orders), icon: ShoppingCart },
    { label: "Revenue (BDT)", value: formatMoney(stats.revenue, "BDT"), icon: DollarSign },
    { label: "Pending", value: String(stats.pending), icon: TrendingUp },
    { label: "Products", value: String(stats.products), icon: Package },
    { label: "B2B Leads", value: String(stats.inquiries), icon: Building2 },
    { label: "Analytics Events", value: String(stats.events), icon: Activity },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="border rounded-lg p-5 bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</span>
              <c.icon className="h-5 w-5 text-brand" />
            </div>
            <div className="text-2xl font-bold mt-2">{loading ? "…" : c.value}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-6">
        Data is read live from Supabase (admin RLS). For server-to-server monitoring (FAOS), use the API
        control plane: <code>GET /admin/overview</code> with the <code>x-admin-key</code> header.
      </p>
    </div>
  );
}
