import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchProductBySlug } from "@/lib/supabase";
import { absUrl, languageAlternates, SITE } from "@/lib/seo";
import { ProductClient } from "./product-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } };

  const image = product.images[0] ? absUrl(product.images[0]) : absUrl("/hero-model.jpg");
  const description =
    (product.description || `${product.name} — premium wig from FMK WIG. Worldwide shipping, BDT / USD pricing.`).slice(
      0,
      300,
    );
  return {
    title: product.name,
    description,
    alternates: {
      canonical: `/product/${product.slug}`,
      languages: languageAlternates(`/product/${product.slug}`),
    },
    openGraph: {
      type: "website",
      title: `${product.name} · FMK WIG`,
      description,
      url: `/product/${product.slug}`,
      images: [{ url: image, width: 1200, height: 1200, alt: product.name }],
    },
    twitter: { card: "summary_large_image", title: product.name, description, images: [image] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) notFound();

  const image = product.images[0] ? absUrl(product.images[0]) : absUrl("/hero-model.jpg");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || `${product.name} from FMK WIG`,
    image: [image],
    brand: { "@type": "Brand", name: SITE.name },
    sku: product.slug,
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: product.price,
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: absUrl(`/product/${product.slug}`),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductClient product={product} />
    </>
  );
}
