import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT_ATTRS_BY_SLUG, computeWholesaleQuote } from "@/lib/product-attributes";
import { useCurrency } from "@/lib/currency";
import { requestQuote, submitB2BInquiry, trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { Building2, Calculator, CheckCircle2 } from "lucide-react";

const CATALOG = Object.entries(PRODUCT_ATTRS_BY_SLUG).map(([slug, attrs]) => ({
  slug,
  ...attrs,
  name: slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" "),
}));

export const Route = createFileRoute("/wholesale")({
  component: WholesalePage,
  head: () => ({
    meta: [
      { title: "Wholesale & B2B — FMK WIG" },
      {
        name: "description",
        content:
          "Wholesale human hair wigs for salons and distributors. Instant quotes, bulk MOQs, and B2B inquiry support.",
      },
    ],
  }),
});

function WholesalePage() {
  const { format, currency, setCurrency } = useCurrency();
  const [qtyBySlug, setQtyBySlug] = useState<Record<string, number>>(() =>
    Object.fromEntries(CATALOG.map((c) => [c.slug, c.wholesale_moq])),
  );
  const [quote, setQuote] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    city: "",
    country: "Bangladesh",
    business_type: "salon",
    notes: "",
  });

  const preview = useMemo(() => {
    return CATALOG.map((c) => {
      const q = computeWholesaleQuote(c.wholesale_price, qtyBySlug[c.slug] || c.wholesale_moq);
      return { ...c, ...q };
    });
  }, [qtyBySlug]);

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
      void trackEvent({ event_name: "b2b_quote_generated", currency, metadata: { quote_id: result.quote_id } });
      toast.success(`Estimate ${result.quote_id} ready — team approval required`);
    } catch (e: any) {
      toast.error(e.message || "Quote failed");
    }
  };

  const submitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const items = preview.map((p) => ({
        slug: p.slug,
        name: p.name,
        quantity: p.quantity,
        unit_price_bdt: p.unit_price_bdt,
        subtotal_bdt: p.subtotal_bdt,
      }));
      const res = await submitB2BInquiry({
        ...form,
        currency,
        estimated_total: previewTotal,
        items,
        notes: form.notes || (quote ? `Attached quote ${quote.quote_id}` : undefined),
      });
      toast.success("Inquiry sent — our B2B team will respond shortly.");
      void trackEvent({
        event_name: "b2b_inquiry_ui_success",
        metadata: { inquiry_id: res.inquiry_id },
      });
      setForm((f) => ({ ...f, notes: "" }));
    } catch (err: any) {
      toast.error(err.message || "Could not submit inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-brand-soft via-background to-secondary">
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
              <Building2 className="h-3.5 w-3.5" /> Wholesale / B2B
            </span>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Factory-direct wigs for salons & distributors
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg">
              Competitive MOQs, volume tiers, and an instant quote generator — inspired by premium
              manufacturers like Wig Bangladesh, tailored for FMK partners.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-brand text-brand-foreground">
                <a href="#quote">Instant Quote</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/shop">Retail catalog</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
            {[
              "Volume discounts from 5+ units",
              "Human hair & synthetic wholesale lines",
              "Custom dyeing available on select SKUs",
              "Orders synced to Jarvis Common Center",
            ].map((t) => (
              <div key={t} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="quote" className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="h-6 w-6 text-brand" /> Instant Quote Generator
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Adjust quantities — prices update with wholesale tiers (BDT base, display in {currency}).
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
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
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="p-3 font-semibold">Product</th>
                <th className="p-3 font-semibold">MOQ</th>
                <th className="p-3 font-semibold">Qty</th>
                <th className="p-3 font-semibold">Unit</th>
                <th className="p-3 font-semibold">Discount</th>
                <th className="p-3 font-semibold text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr key={row.slug} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {row.hair_type} · {row.texture.replace("-", " ")}
                    </div>
                  </td>
                  <td className="p-3">{row.wholesale_moq}</td>
                  <td className="p-3">
                    <Input
                      type="number"
                      min={1}
                      className="w-24"
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

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={generateQuote} className="bg-brand text-brand-foreground">
            Get indicative estimate
          </Button>
          {quote && (
            <span className="text-sm text-muted-foreground self-center">
              Estimate <strong>{quote.quote_id}</strong> · team confirmation required · API total{" "}
              {currency === "USD" ? `$${quote.total}` : `৳${quote.total}`}
            </span>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="text-2xl font-bold mb-2">Bulk Inquiry</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Submit your wholesale request. We track lead origin (Google / LinkedIn / referral) and sync
          to Jarvis when configured.
        </p>
        <form onSubmit={submitInquiry} className="space-y-4 rounded-xl border bg-card p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Company</Label>
              <Input
                required
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Contact name</Label>
              <Input
                required
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>Business type</Label>
              <select
                className="mt-0 w-full rounded-md border bg-background px-3 py-2 text-sm h-10"
                value={form.business_type}
                onChange={(e) => setForm({ ...form, business_type: e.target.value })}
              >
                <option value="salon">Salon</option>
                <option value="distributor">Distributor</option>
                <option value="ecommerce">E-commerce</option>
                <option value="clinic">Hair clinic</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <textarea
              className="mt-1 w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Target styles, dye colors, delivery window…"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            size="lg"
            className="w-full bg-brand text-brand-foreground"
          >
            {submitting ? "Sending…" : "Submit B2B inquiry"}
          </Button>
        </form>
      </section>
    </div>
  );
}
