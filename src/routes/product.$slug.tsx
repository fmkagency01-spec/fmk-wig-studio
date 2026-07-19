import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { productBySlugQuery } from "@/lib/queries";
import { formatBDT } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Minus, Plus, Truck, ShieldCheck, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({
  component: ProductPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => (
    <div className="p-16 text-center">
      <h1 className="text-2xl font-bold">Product not found</h1>
      <Link to="/shop" className="text-brand mt-4 inline-block underline">Back to shop</Link>
    </div>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product, isLoading } = useQuery(productBySlugQuery(slug));
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 grid md:grid-cols-2 gap-8">
        <div className="aspect-square bg-muted animate-pulse rounded-lg" />
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-6 bg-muted animate-pulse rounded w-1/3" />
          <div className="h-32 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!product) throw notFound();

  const images = product.images.length ? product.images : ["/products/placeholder.jpg"];
  const discount = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100) : 0;

  const handleAdd = () => {
    add({
      product_id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: images[0],
    }, qty);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-xs text-muted-foreground mb-4">
        <Link to="/" className="hover:text-brand">Home</Link> / <Link to="/shop" className="hover:text-brand">Shop</Link> / <span>{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div>
          <div className="aspect-square rounded-xl overflow-hidden bg-muted">
            <img src={images[activeImage]} alt={product.name} className="h-full w-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImage(i)} className={`aspect-square rounded overflow-hidden border-2 ${i === activeImage ? "border-brand" : "border-transparent"}`}>
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-3xl font-bold text-brand">{formatBDT(product.price)}</span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <>
                  <span className="text-lg text-muted-foreground line-through">{formatBDT(product.compare_at_price)}</span>
                  <span className="bg-sale text-white text-xs font-bold px-2 py-1 rounded">-{discount}%</span>
                </>
              )}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {product.stock > 0 ? <span className="text-green-600">✓ In stock ({product.stock} available)</span> : <span className="text-destructive">Out of stock</span>}
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center border rounded-lg">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2 hover:text-brand"><Minus className="h-4 w-4" /></button>
              <span className="px-4 font-semibold">{qty}</span>
              <button onClick={() => setQty(Math.min(product.stock || 99, qty + 1))} className="p-2 hover:text-brand"><Plus className="h-4 w-4" /></button>
            </div>
            <Button onClick={handleAdd} disabled={product.stock === 0} size="lg" className="flex-1 bg-brand text-brand-foreground hover:opacity-90">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t">
            {[
              { icon: Truck, label: "Free over ৳5000" },
              { icon: ShieldCheck, label: "Authentic" },
              { icon: RefreshCcw, label: "7-day returns" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-xs">
                <f.icon className="h-4 w-4 text-brand shrink-0" /> {f.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
