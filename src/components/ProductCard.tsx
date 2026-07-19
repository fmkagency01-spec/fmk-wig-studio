import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/queries";
import { formatBDT } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  const img = product.images[0] || "/products/placeholder.jpg";
  const discount = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;
  return (
    <Link to="/product/$slug" params={{ slug: product.slug }} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <img
          src={img}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-sale text-white text-xs font-bold px-2 py-1 rounded">
            -{discount}%
          </span>
        )}
        {product.stock === 0 && (
          <span className="absolute inset-0 bg-black/50 text-white flex items-center justify-center font-semibold">
            Out of stock
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="text-sm font-medium line-clamp-2 group-hover:text-brand transition-colors">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-brand">{formatBDT(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-xs text-muted-foreground line-through">
              {formatBDT(product.compare_at_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
