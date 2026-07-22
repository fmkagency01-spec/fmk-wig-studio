import { notFound } from "next/navigation";
import { fetchProductBySlug } from "@/lib/supabase";
import { ProductClient } from "./product-client";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) notFound();
  return <ProductClient product={product} />;
}
