import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBDT } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orders")({
  component: OrdersPage,
});

type Order = {
  id: string;
  status: string;
  total: number;
  created_at: string;
  payment_status: string | null;
  order_items: { product_name: string; quantity: number; unit_price: number; image_url: string | null }[];
};

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id,status,total,created_at,payment_status,order_items(product_name,quantity,unit_price,image_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data as any) || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>
      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="border rounded-lg p-12 text-center bg-card">
          <p className="text-muted-foreground">You haven't placed any orders yet.</p>
          <Link to="/shop" className="text-brand underline mt-2 inline-block">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="border rounded-lg p-5 bg-card">
              <div className="flex flex-wrap justify-between gap-2 pb-3 border-b">
                <div>
                  <div className="text-xs text-muted-foreground">Order #{o.id.slice(0, 8)}</div>
                  <div className="text-sm">{new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <span className="inline-block text-xs font-semibold px-2 py-1 rounded-full bg-brand-soft text-brand capitalize">{o.status}</span>
                  <div className="font-bold text-brand mt-1">{formatBDT(o.total)}</div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {o.order_items?.map((i, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    {i.image_url && <img src={i.image_url} alt="" className="h-12 w-12 rounded object-cover" />}
                    <div className="flex-1">{i.product_name} × {i.quantity}</div>
                    <div>{formatBDT(i.unit_price * i.quantity)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
