"use client";

import { useMemo, useState } from "react";
import { PRODUCT_ATTRS_BY_SLUG, computeWholesaleQuote } from "@/lib/product-attributes";
import { useCurrency } from "@/lib/currency";
import { requestQuote, submitB2BInquiry, trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { Building2, Calculator } from "lucide-react";
import Link from "next/link";

const CATALOG = Object.entries(PRODUCT_ATTRS_BY_SLUG).map(([slug, attrs]) => ({
  slug,
  ...attrs,
  name: slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" "),
}));

export default function WholesalePage() {
  const { format, currency, setCurrency } = useCurrency();
  const [qtyBySlug, setQtyBySlug] = useState<Record<string, number>>(() =>
    Object.fromEntries(CATALOG.map((c) => [c.slug, c.wholesale_moq])),
  );
  const [quote, setQuote] = useState<{ quote_id: string; total: number; valid_for_hours: number } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    city: "",
    business_type: "salon",
    notes: "",
  });

  const preview = useMemo(
    () =>
      CATALOG.map((c) => {
        const q = computeWholesaleQuote(c.wholesale_price, qtyBySlug[c.slug] || c.wholesale_moq);
        return { ...c, ...q };
      }),
    [qtyBySlug],
  );
  const previewTotal = preview.reduce((s, p) => s + p.subtotal_bdt, 0);

  const generateQuote = async () => {
    try {
      const result = await requestQuote({
        currency,
        items: CATALOG.map((c) => ({
          slug: c.slug,
          quantity: qtyBySlug[c.slug] || c.wholesale_moq,
          wholesale_price_bdt: c.wholesale_price,
        })),
      });
      setQuote(result);
      void trackEvent({
        event_name: "b2b_quote_generated",
        currency,
        metadata: { quote_id: result.quote_id },
      });
      toast.success(`Quote ${result.quote_id} ready`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Quote failed");
    }
  };

  const submitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await submitB2BInquiry({
        ...form,
        currency,
        estimated_total: previewTotal,
        items: preview.map((p) => ({
          slug: p.slug,
          quantity: p.quantity,
          unit_price_bdt: p.unit_price_bdt,
          subtotal_bdt: p.subtotal_bdt,
        })),
      });
      toast.success("Inquiry sent — our B2B team will respond shortly.");
      void trackEvent({
        event_name: "b2b_inquiry_ui_success",
        metadata: { inquiry_id: res.inquiry_id },
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not submit inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <section className="border-b bg-gradient-to-br from-brand-soft via-background to-secondary">
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
              <Building2 className="h-3.5 w-3.5" /> Wholesale / B2B
            </span>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Factory-direct wigs for salons & distributors
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg">
              Instant quotes with volume tiers — benchmarked against premium manufacturers like Wig
              Bangladesh.
            </p>
            <Link
              href="/shop"
              className="inline-flex h-11 items-center rounded-md border px-8 text-sm font-medium"
            >
              Retail catalog
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-brand" /> Instant Quote Generator
          </h2>
          <div className="flex gap-2 text-sm">
            <button
              className={`px-3 py-1.5 rounded-full border ${currency === "BDT" ? "bg-brand text-brand-foreground border-brand" : ""}`}
              onClick={() => setCurrency("BDT")}
            >
              BDT
            </button>
            <button
              className={`px-3 py-1.5 rounded-full border ${currency === "USD" ? "bg-brand text-brand-foreground border-brand" : ""}`}
              onClick={() => setCurrency("USD")}
            >
              USD
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">MOQ</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Unit</th>
                <th className="p-3">Discount</th>
                <th className="p-3 text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr key={row.slug} className="border-t">
                  <td className="p-3 font-medium">{row.name}</td>
                  <td className="p-3">{row.wholesale_moq}</td>
                  <td className="p-3">
                    <input
                      type="number"
                      min={1}
                      className="w-24 rounded-md border px-2 py-1"
                      value={qtyBySlug[row.slug]}
                      onChange={(e) =>
                        setQtyBySlug((s) => ({
                          ...s,
                          [row.slug]: Math.max(1, Number(e.target.value) || 1),
                        }))
                      }
                    />
                  </td>
                  <td className="p-3">{format(row.unit_price_bdt)}</td>
                  <td className="p-3">{row.discount_pct}%</td>
                  <td className="p-3 text-right font-semibold">{format(row.subtotal_bdt)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-brand-soft/40">
                <td className="p-3 font-bold" colSpan={5}>
                  Estimated wholesale total
                </td>
                <td className="p-3 text-right font-bold text-brand text-lg">{format(previewTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <button
            onClick={generateQuote}
            className="h-11 rounded-md bg-brand px-6 text-sm font-medium text-brand-foreground"
          >
            Generate formal quote
          </button>
          {quote && (
            <span className="text-sm text-muted-foreground">
              Quote <strong>{quote.quote_id}</strong> · valid {quote.valid_for_hours}h
            </span>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="text-2xl font-bold mb-2">Bulk Inquiry</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Lead origin (Google / LinkedIn / referral) is tracked automatically and synced to Jarvis when
          configured.
        </p>
        <form onSubmit={submitInquiry} className="space-y-4 rounded-xl border p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                ["company_name", "Company"],
                ["contact_name", "Contact name"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["city", "City"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm block">
                <span className="font-medium">{label}</span>
                <input
                  required={key !== "phone"}
                  type={key === "email" ? "email" : "text"}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <label className="text-sm block">
            <span className="font-medium">Notes</span>
            <textarea
              className="mt-1 w-full min-h-24 rounded-md border px-3 py-2"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-md bg-brand text-brand-foreground font-medium disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Submit B2B inquiry"}
          </button>
        </form>
      </section>
    </div>
  );
}
