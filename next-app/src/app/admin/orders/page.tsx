"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/currency";
import { toast } from "sonner";

type OrderRow = {
  id: string;
  status: string | null;
  payment_status: string | null;
  total: number | null;
  currency: string | null;
  customer_name: string | null;
  customer_email: string | null;
  created_at: string;
};

const STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setOrders((data as OrderRow[] | null) || []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Order marked ${status}`);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading orders…</div>;
  if (orders.length === 0)
    return <div className="p-8 text-center text-muted-foreground">No orders yet.</div>;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left">
          <tr>
            <th className="p-3">Date</th>
            <th className="p-3">Customer</th>
            <th className="p-3">Total</th>
            <th className="p-3">Payment</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="p-3 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</td>
              <td className="p-3">
                <div className="font-medium">{o.customer_name || "—"}</div>
                <div className="text-xs text-muted-foreground">{o.customer_email}</div>
              </td>
              <td className="p-3 font-semibold">
                {formatMoney(Number(o.total || 0), (o.currency as "BDT" | "USD") || "BDT")}
              </td>
              <td className="p-3">
                <span className="text-xs rounded-full border px-2 py-0.5">{o.payment_status || "unpaid"}</span>
              </td>
              <td className="p-3">
                <select
                  value={o.status || "pending"}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                  className="rounded-md border px-2 py-1 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
