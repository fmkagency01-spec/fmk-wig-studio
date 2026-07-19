import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBDT } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

type Order = {
  id: string;
  status: string;
  total: number;
  currency: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: any;
  payment_status: string | null;
  created_at: string;
  order_items: { product_name: string; quantity: number; unit_price: number }[];
};

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
    setOrders((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Order updated");
    load();
  };

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <div className="space-y-3">
        {orders.length === 0 && <div className="text-muted-foreground text-center py-12">No orders yet.</div>}
        {orders.map((o) => (
          <div key={o.id} className="border rounded-lg bg-card">
            <div className="p-4 flex flex-wrap items-center gap-4 cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{o.customer_name || "—"}</div>
                <div className="text-xs text-muted-foreground">{o.customer_email} · {o.customer_phone}</div>
              </div>
              <div className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</div>
              <div className="font-semibold text-brand">{formatBDT(o.total)}</div>
              <select
                value={o.status}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updateStatus(o.id, e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-background capitalize"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {expanded === o.id && (
              <div className="border-t p-4 grid md:grid-cols-2 gap-4 text-sm bg-muted/30">
                <div>
                  <div className="font-semibold mb-2">Items</div>
                  {o.order_items?.map((i, idx) => (
                    <div key={idx} className="flex justify-between py-1">
                      <span>{i.product_name} × {i.quantity}</span>
                      <span>{formatBDT(i.unit_price * i.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="font-semibold mb-2">Shipping</div>
                  {o.shipping_address ? (
                    <div className="text-muted-foreground">
                      {o.shipping_address.address_line1}<br />
                      {o.shipping_address.city} {o.shipping_address.postal_code}<br />
                      {o.shipping_address.country}
                    </div>
                  ) : "—"}
                  <div className="mt-2 text-xs">Payment: <span className="capitalize">{o.payment_status || "—"}</span></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
