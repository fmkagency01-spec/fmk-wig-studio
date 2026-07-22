"use client";

import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/supabase";
import { useCurrency } from "@/lib/currency";
import { attrsForSlug } from "@/lib/product-attributes";

export function ProductCard({ product }: { product: Product }) {
  const { format } = useCurrency();
  const img = product.images[0] || "/products/wig-straight.jpg";
  const attrs = attrsForSlug(product.slug);
  const discount =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : 0;

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <Image
          src={img}
          alt={product.name}
          fill
          sizes="(max-width:768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority={product.featured}
        />
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-sale text-white text-xs font-bold px-2 py-1 rounded z-10">
            -{discount}%
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        {attrs && (
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {attrs.texture !== "n/a" ? attrs.texture.replace("-", " ") : attrs.hair_type}
            {attrs.density !== "n/a" ? ` · ${attrs.density}` : ""}
          </p>
        )}
        <h3 className="text-sm font-medium line-clamp-2 group-hover:text-brand">{product.name}</h3>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-brand">{format(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-xs text-muted-foreground line-through">
              {format(product.compare_at_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
