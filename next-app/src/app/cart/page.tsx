"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { trackEvent } from "@/lib/analytics";
import { useEffect } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

export default function CartPage() {
  const { items, setQty, remove, subtotal, ready } = useCart();
  const { format, currency } = useCurrency();

  useEffect(() => {
    if (ready) {
      void trackEvent({
        event_name: "cart_view",
        currency,
        metadata: { item_count: items.length, subtotal },
      });
    }
  }, [ready, items.length, subtotal, currency]);

  if (!ready) return <div className="p-16 text-center text-muted-foreground">Loading…</div>;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/50" />
        <h1 className="text-2xl font-bold mt-4">Your cart is empty</h1>
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
      <h1 className="text-3xl font-bold mb-8">Your Cart ({items.length})</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.product_id} className="flex gap-4 border rounded-lg p-3">
              <Link
                href={`/product/${item.slug}`}
                className="relative w-24 h-24 rounded-md overflow-hidden bg-muted shrink-0"
              >
                <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/product/${item.slug}`} className="font-medium hover:text-brand">
                  {item.name}
                </Link>
                <div className="text-brand font-semibold mt-1">{format(item.price)}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center border rounded">
                    <button onClick={() => setQty(item.product_id, item.quantity - 1)} className="p-1.5">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-3 text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => setQty(item.product_id, item.quantity + 1)} className="p-1.5">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button onClick={() => remove(item.product_id)} className="p-1 text-muted-foreground">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="font-semibold">{format(item.price * item.quantity)}</div>
            </div>
          ))}
        </div>
        <aside className="border rounded-lg p-6 h-fit space-y-4">
          <h2 className="font-semibold text-lg">Order Summary</h2>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-brand">{format(subtotal)}</span>
          </div>
          <Link
            href="/auth?next=/checkout"
            className="block text-center h-11 leading-11 rounded-md bg-brand text-brand-foreground font-medium py-3"
          >
            Proceed to Checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}
