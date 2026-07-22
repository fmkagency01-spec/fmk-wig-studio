import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Your Cart — FMK WIG" }] }),
});

function CartPage() {
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
        <p className="text-muted-foreground mt-2">Discover our beautiful wigs and start shopping.</p>
        <Button asChild className="mt-6 bg-brand text-brand-foreground hover:opacity-90">
          <Link to="/shop">Shop Now</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Cart ({items.length})</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.product_id} className="flex gap-4 border rounded-lg p-3 bg-card">
              <Link
                to="/product/$slug"
                params={{ slug: item.slug }}
                className="w-24 h-24 rounded-md overflow-hidden bg-muted shrink-0"
              >
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to="/product/$slug"
                  params={{ slug: item.slug }}
                  className="font-medium line-clamp-2 hover:text-brand"
                >
                  {item.name}
                </Link>
                <div className="text-brand font-semibold mt-1">{format(item.price)}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center border rounded">
                    <button
                      onClick={() => setQty(item.product_id, item.quantity - 1)}
                      className="p-1.5 hover:text-brand"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-3 text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => setQty(item.product_id, item.quantity + 1)}
                      className="p-1.5 hover:text-brand"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      remove(item.product_id);
                      void trackEvent({
                        event_name: "remove_from_cart",
                        product_id: item.product_id,
                        currency,
                      });
                    }}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-right font-semibold shrink-0">
                {format(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>

        <aside className="border rounded-lg p-6 bg-card h-fit space-y-4 sticky top-24">
          <h2 className="font-semibold text-lg">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{format(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span>
              <span>{subtotal >= 5000 ? "Free" : "Calculated at checkout"}</span>
            </div>
          </div>
          <div className="border-t pt-3 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-brand">{format(subtotal)}</span>
          </div>
          <Button asChild size="lg" className="w-full bg-brand text-brand-foreground hover:opacity-90">
            <Link to="/checkout">Proceed to Checkout</Link>
          </Button>
          <Link to="/shop" className="block text-center text-sm text-muted-foreground hover:text-brand">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
