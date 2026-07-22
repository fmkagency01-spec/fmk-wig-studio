"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { attrsForSlug } from "@/lib/product-attributes";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { Minus, Plus, ShoppingBag } from "lucide-react";

export function ProductClient({ product }: { product: Product }) {
  const { add } = useCart();
  const { format, currency } = useCurrency();
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const attrs = attrsForSlug(product.slug);
  const images = product.images.length ? product.images : ["/products/wig-straight.jpg"];

  useEffect(() => {
    void trackEvent({
      event_name: "product_view",
      product_id: product.id,
      currency,
      metadata: { slug: product.slug },
    });
  }, [product, currency]);

  const handleAdd = () => {
    add(
      {
        product_id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: images[0],
      },
      qty,
    );
    void trackEvent({
      event_name: "add_to_cart",
      product_id: product.id,
      currency,
      metadata: { qty, slug: product.slug },
    });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-xs text-muted-foreground mb-4">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/shop" className="hover:text-brand">
          Shop
        </Link>{" "}
        / <span>{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div>
          <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
            <Image
              src={images[active]}
              alt={product.name}
              fill
              priority
              sizes="(max-width:768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.map((img, i) => (
                <button
                  key={img + i}
                  onClick={() => setActive(i)}
                  className={`relative aspect-square rounded overflow-hidden border-2 ${i === active ? "border-brand" : "border-transparent"}`}
                >
                  <Image src={img} alt="" fill sizes="96px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="text-3xl font-bold text-brand mt-3">{format(product.price)}</div>
          </div>

          {attrs && (
            <dl className="grid grid-cols-2 gap-3 text-sm border rounded-lg p-4">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Hair type</dt>
                <dd className="font-medium capitalize">{attrs.hair_type}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Cap size</dt>
                <dd className="font-medium capitalize">{attrs.cap_size}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Texture</dt>
                <dd className="font-medium capitalize">{attrs.texture.replace("-", " ")}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Density</dt>
                <dd className="font-medium">{attrs.density}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase text-muted-foreground">Custom dyeing</dt>
                <dd className="font-medium">{attrs.custom_dyeing ? "Available" : "Standard only"}</dd>
              </div>
            </dl>
          )}

          <p className="text-muted-foreground">{product.description}</p>

          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-lg">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2">
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-4 font-semibold">{qty}</span>
              <button
                onClick={() => setQty(Math.min(product.stock || 99, qty + 1))}
                className="p-2"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={product.stock === 0}
              className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand text-brand-foreground font-medium disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" /> Add to Cart
            </button>
          </div>

          <Link href="/wholesale" className="text-sm text-brand underline">
            Need wholesale pricing? Get an instant quote →
          </Link>
        </div>
      </div>
    </div>
  );
}
