import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Checkout — FMK WIG" }] }),
});

function CheckoutPage() {
  const { items, subtotal, clear, ready } = useCart();
  const { user, ready: authReady } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", address_line1: "", city: "", postal_code: "" });
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (authReady && !user) {
      toast.info("Please sign in to place your order");
      navigate({ to: "/auth", search: { next: "/checkout" } });
    }
  }, [authReady, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm((f) => ({
        ...f,
        full_name: data.full_name || "",
        phone: data.phone || "",
        email: user.email || "",
        address_line1: data.address_line1 || "",
        city: data.city || "",
        postal_code: data.postal_code || "",
      }));
      else setForm((f) => ({ ...f, email: user.email || "" }));
    });
  }, [user]);

  const shipping = subtotal >= 5000 ? 0 : 120;
  const total = subtotal + shipping;

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (items.length === 0) return;
    setPlacing(true);
    try {
      const { data: order, error } = await supabase.from("orders").insert({
        user_id: user.id,
        status: "pending",
        total,
        currency: "BDT",
        customer_email: form.email,
        customer_name: form.full_name,
        customer_phone: form.phone,
        shipping_address: {
          address_line1: form.address_line1,
          city: form.city,
          postal_code: form.postal_code,
          country: "Bangladesh",
        },
        payment_status: "cod_pending",
      }).select().single();
      if (error) throw error;

      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        product_name: i.name,
        unit_price: i.price,
        quantity: i.quantity,
        image_url: i.image,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      // Save profile
      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: form.full_name,
        phone: form.phone,
        address_line1: form.address_line1,
        city: form.city,
        postal_code: form.postal_code,
      });

      clear();
      toast.success("Order placed! We'll contact you shortly.");
      navigate({ to: "/orders" });
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (!ready || !authReady) return <div className="p-16 text-center text-muted-foreground">Loading…</div>;
  if (!user) return null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Nothing to check out</h1>
        <Button asChild className="mt-4 bg-brand text-brand-foreground"><Link to="/shop">Shop Now</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <form onSubmit={placeOrder} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="border rounded-lg p-6 bg-card space-y-4">
            <h2 className="font-semibold text-lg">Shipping Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Email</Label><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Address</Label><Input required value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} /></div>
              <div><Label>City</Label><Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Postal code</Label><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
            </div>
          </div>

          <div className="border rounded-lg p-6 bg-card">
            <h2 className="font-semibold text-lg mb-3">Payment</h2>
            <div className="border rounded-lg p-4 bg-brand-soft flex items-start gap-3">
              <input type="radio" checked readOnly className="mt-1" />
              <div>
                <div className="font-semibold">Cash on Delivery</div>
                <div className="text-sm text-muted-foreground">Pay when you receive your order. Available nationwide.</div>
              </div>
            </div>
          </div>
        </div>

        <aside className="border rounded-lg p-6 bg-card h-fit space-y-3 sticky top-24">
          <h2 className="font-semibold text-lg">Order Summary</h2>
          <div className="space-y-2 max-h-64 overflow-auto text-sm">
            {items.map((i) => (
              <div key={i.product_id} className="flex justify-between gap-2">
                <span className="line-clamp-1">{i.name} × {i.quantity}</span>
                <span>{formatBDT(i.price * i.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatBDT(subtotal)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "Free" : formatBDT(shipping)}</span></div>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-3">
            <span>Total</span><span className="text-brand">{formatBDT(total)}</span>
          </div>
          <Button type="submit" disabled={placing} size="lg" className="w-full bg-brand text-brand-foreground hover:opacity-90">
            {placing ? "Placing order…" : "Place Order"}
          </Button>
        </aside>
      </form>
    </div>
  );
}
