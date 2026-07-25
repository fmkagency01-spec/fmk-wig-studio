"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { useAuth, getAccessToken } from "@/lib/auth";
import { useCurrency, convertFromBdt } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import { createOrder, getPaymentConfig, startPayment } from "@/lib/orders";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

const FREE_SHIPPING_BDT = 5000;
const SHIPPING_BDT = 120;

export default function CheckoutPage() {
  const { items, subtotal, clear, ready } = useCart();
  const { user, ready: authReady } = useAuth();
  const { format, currency } = useCurrency();
  const router = useRouter();

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address_line1: "",
    city: "",
    postal_code: "",
  });
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState<{ order_number: string } | null>(null);

  useEffect(() => {
    if (authReady && !user) {
      toast.info("Please sign in to place your order");
      router.replace("/auth?next=/checkout");
    }
  }, [authReady, user, router]);

  useEffect(() => {
    if (ready && items.length > 0) {
      void trackEvent({ event_name: "begin_checkout", currency, metadata: { subtotal, item_count: items.length } });
    }
  }, [ready, items.length, subtotal, currency]);

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, email: user.email || "" }));
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm((f) => ({
            ...f,
            full_name: (data.full_name as string) || "",
            phone: (data.phone as string) || "",
            address_line1: (data.address_line1 as string) || "",
            city: (data.city as string) || "",
            postal_code: (data.postal_code as string) || "",
          }));
        }
      });
  }, [user]);

  const shipping = subtotal >= FREE_SHIPPING_BDT ? 0 : SHIPPING_BDT;
  const total = subtotal + shipping;

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || items.length === 0) return;
    setPlacing(true);
    try {
      const token = await getAccessToken();
      const result = await createOrder(
        {
          currency,
          subtotal,
          shipping,
          total,
          customer_name: form.full_name,
          customer_email: form.email,
          customer_phone: form.phone,
          address_line1: form.address_line1,
          city: form.city,
          postal_code: form.postal_code,
          items: items.map((i) => ({
            product_id: i.product_id,
            slug: i.slug,
            name: i.name,
            quantity: i.quantity,
            unit_price: i.price,
            subtotal: i.price * i.quantity,
          })),
        },
        token,
      );

      void trackEvent({
        event_name: "purchase",
        currency,
        metadata: { order_id: result.order_id, order_number: result.order_number, value: total },
      });

      // If online payment is enabled, redirect to the provider; otherwise COD/manual.
      const pay = await getPaymentConfig();
      if (pay.enabled) {
        const origin = window.location.origin;
        const session = await startPayment({
          order_id: result.order_id,
          amount: Number(convertFromBdt(total, currency).toFixed(2)),
          currency,
          customer_email: form.email,
          success_url: `${origin}/checkout?success=1&order=${result.order_number}`,
          cancel_url: `${origin}/cart`,
          description: `FMK WIG Order ${result.order_number}`,
        });
        if (session.enabled && "checkout_url" in session) {
          clear();
          window.location.href = session.checkout_url;
          return;
        }
      }

      clear();
      setDone({ order_number: result.order_number });
      toast.success("Order placed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setPlacing(false);
    }
  };

  if (!ready || !authReady) return <div className="p-16 text-center text-muted-foreground">Loading…</div>;

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
        <h1 className="text-2xl font-bold mt-4">Thank you! Order placed</h1>
        <p className="text-muted-foreground mt-2">
          Your order <strong>{done.order_number}</strong> has been received. We&apos;ll contact you shortly to
          confirm delivery. Payment: Cash on Delivery / manual (online payments coming soon).
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/shop" className="rounded-md border px-5 py-2.5 text-sm font-medium">
            Continue shopping
          </Link>
          <Link href="/account" className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground">
            My account
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-8 text-sm font-medium text-brand-foreground"
        >
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <form onSubmit={placeOrder} className="lg:col-span-2 space-y-4 border rounded-xl p-6">
          <h2 className="font-semibold text-lg">Shipping details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                ["full_name", "Full name", true],
                ["phone", "Phone", true],
                ["email", "Email", true],
                ["city", "City", true],
                ["address_line1", "Address", true],
                ["postal_code", "Postal code", false],
              ] as const
            ).map(([key, label, required]) => (
              <label key={key} className={`text-sm block ${key === "address_line1" ? "sm:col-span-2" : ""}`}>
                <span className="font-medium">{label}</span>
                <input
                  required={required}
                  type={key === "email" ? "email" : "text"}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={placing}
            className="w-full h-11 rounded-md bg-brand text-brand-foreground font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {placing && <Loader2 className="h-4 w-4 animate-spin" />}
            {placing ? "Placing order…" : `Place order · ${format(total)}`}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Online card payments (Stripe, international) activate automatically once configured. Until then orders
            are captured as Cash on Delivery / manual.
          </p>
        </form>

        <aside className="border rounded-lg p-6 h-fit space-y-3">
          <h2 className="font-semibold text-lg">Order Summary</h2>
          {items.map((i) => (
            <div key={i.product_id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {i.name} × {i.quantity}
              </span>
              <span>{format(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="border-t pt-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{format(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span>{shipping === 0 ? "Free" : format(shipping)}</span>
          </div>
          <div className="border-t pt-3 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-brand">{format(total)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
