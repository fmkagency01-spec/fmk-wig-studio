import { randomUUID } from "node:crypto";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { appendAnalytics, appendInquiry, listAnalytics, listInquiries, markInquiryJarvisSynced } from "./lib/store.ts";
import { getSupabaseAdmin, verifyBearerUser } from "./lib/supabase.ts";
import { requireJwt } from "./lib/jwt.ts";
import { pushToJarvis } from "./lib/jarvis.ts";

const PRODUCT_WHOLESALE: Record<
  string,
  { name: string; wholesale_price: number; moq: number; hair_type: string; texture: string }
> = {
  "silky-straight-human-hair-wig": {
    name: "Silky Straight Human Hair Wig",
    wholesale_price: 6800,
    moq: 5,
    hair_type: "human",
    texture: "straight",
  },
  "body-wave-lace-front-wig": {
    name: "Body Wave Lace Front Wig",
    wholesale_price: 9900,
    moq: 3,
    hair_type: "human",
    texture: "body-wave",
  },
  "curly-bob-synthetic-wig": {
    name: "Curly Bob Synthetic Wig",
    wholesale_price: 1800,
    moq: 10,
    hair_type: "synthetic",
    texture: "curly",
  },
  "deep-wave-bundles": {
    name: "Deep Wave Bundles (3pc)",
    wholesale_price: 12000,
    moq: 5,
    hair_type: "human",
    texture: "deep-wave",
  },
  "wig-cap-5pack": {
    name: "Wig Cap (Pack of 5)",
    wholesale_price: 220,
    moq: 20,
    hair_type: "accessory",
    texture: "n/a",
  },
  "kinky-curly-afro-wig": {
    name: "Kinky Curly Afro Wig",
    wholesale_price: 3200,
    moq: 8,
    hair_type: "synthetic",
    texture: "kinky-curly",
  },
};

function tierDiscount(qty: number): number {
  if (qty >= 50) return 0.18;
  if (qty >= 25) return 0.12;
  if (qty >= 10) return 0.07;
  if (qty >= 5) return 0.03;
  return 0;
}

function convertBdt(amount: number, currency: "BDT" | "USD") {
  const rate = Number(process.env.USD_PER_BDT || 1 / 122);
  if (currency === "USD") return Math.round(amount * rate * 100) / 100;
  return Math.round(amount);
}

export function createApiApp() {
  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "fmk-wig-api",
      jarvis: Boolean(process.env.JARVIS_WEBHOOK_URL),
      supabase: Boolean(getSupabaseAdmin()),
    });
  });

  app.post("/analytics/events", async (req, res) => {
    const schema = z.object({
      event_name: z.string().min(1).max(120),
      session_id: z.string().optional(),
      page_path: z.string().optional(),
      referrer: z.string().nullable().optional(),
      lead_origin: z.string().optional(),
      country: z.string().optional(),
      city: z.string().optional(),
      currency: z.string().optional(),
      product_id: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid event", details: parsed.error.flatten() });
      return;
    }

    const user = await verifyBearerUser(req.header("authorization"));
    const event = {
      id: randomUUID(),
      ...parsed.data,
      user_id: user?.id ?? null,
      created_at: new Date().toISOString(),
    };
    appendAnalytics(event);

    const sb = getSupabaseAdmin();
    if (sb) {
      void sb.from("analytics_events").insert({
        event_name: event.event_name,
        session_id: event.session_id,
        user_id: event.user_id,
        page_path: event.page_path,
        referrer: event.referrer,
        lead_origin: event.lead_origin,
        country: event.country,
        city: event.city,
        currency: event.currency,
        product_id: event.product_id,
        metadata: event.metadata || {},
      });
    }

    res.status(201).json({ ok: true, id: event.id });
  });

  app.get("/analytics/events", requireJwt, async (req, res) => {
    res.json({ events: listAnalytics(Number(req.query.limit) || 100) });
  });

  app.post("/quotes/instant", (req, res) => {
    const schema = z.object({
      currency: z.enum(["BDT", "USD"]).default("BDT"),
      items: z
        .array(
          z.object({
            slug: z.string(),
            quantity: z.number().int().positive(),
            wholesale_price_bdt: z.number().positive().optional(),
          }),
        )
        .min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid quote request", details: parsed.error.flatten() });
      return;
    }

    const currency = parsed.data.currency;
    const lines = parsed.data.items.map((item) => {
      const catalog = PRODUCT_WHOLESALE[item.slug];
      const unitBase = item.wholesale_price_bdt ?? catalog?.wholesale_price ?? 0;
      if (!unitBase) {
        return { slug: item.slug, error: "Unknown product" as const };
      }
      const discount = tierDiscount(item.quantity);
      const unitBdt = Math.round(unitBase * (1 - discount));
      const subtotalBdt = unitBdt * item.quantity;
      return {
        slug: item.slug,
        name: catalog?.name || item.slug,
        quantity: item.quantity,
        moq: catalog?.moq ?? 1,
        meets_moq: item.quantity >= (catalog?.moq ?? 1),
        discount_pct: Math.round(discount * 100),
        unit_price_bdt: unitBdt,
        unit_price: convertBdt(unitBdt, currency),
        subtotal_bdt: subtotalBdt,
        subtotal: convertBdt(subtotalBdt, currency),
      };
    });

    if (lines.some((l) => "error" in l)) {
      res.status(400).json({ error: "One or more products are unknown", lines });
      return;
    }

    const typed = lines as Array<{
      slug: string;
      name: string;
      quantity: number;
      moq: number;
      meets_moq: boolean;
      discount_pct: number;
      unit_price_bdt: number;
      unit_price: number;
      subtotal_bdt: number;
      subtotal: number;
    }>;

    const totalBdt = typed.reduce((s, l) => s + l.subtotal_bdt, 0);
    const quote = {
      quote_id: `FQ-${Date.now().toString(36).toUpperCase()}`,
      currency,
      generated_at: new Date().toISOString(),
      lines: typed,
      total_bdt: totalBdt,
      total: convertBdt(totalBdt, currency),
      valid_for_hours: 72,
      notes: "Wholesale pricing for salons & distributors. Final invoice may include shipping & duties.",
    };

    void pushToJarvis({
      type: "quote",
      source: "fmk-wig",
      occurred_at: quote.generated_at,
      data: quote as unknown as Record<string, unknown>,
    });

    res.json(quote);
  });

  app.post("/b2b/inquiries", async (req, res) => {
    const schema = z.object({
      company_name: z.string().min(2),
      contact_name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      country: z.string().optional(),
      city: z.string().optional(),
      business_type: z.string().optional(),
      lead_origin: z.string().optional(),
      notes: z.string().optional(),
      currency: z.enum(["BDT", "USD"]).default("BDT"),
      estimated_total: z.number().optional(),
      items: z.array(z.record(z.unknown())).default([]),
      session_id: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid inquiry", details: parsed.error.flatten() });
      return;
    }

    const inquiry = appendInquiry({
      id: randomUUID(),
      company_name: parsed.data.company_name,
      contact_name: parsed.data.contact_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      country: parsed.data.country || "Bangladesh",
      city: parsed.data.city,
      business_type: parsed.data.business_type,
      lead_origin: parsed.data.lead_origin,
      items: parsed.data.items,
      notes: parsed.data.notes,
      estimated_total: parsed.data.estimated_total,
      currency: parsed.data.currency,
      status: "new",
      jarvis_synced_at: null,
      created_at: new Date().toISOString(),
    });

    const sb = getSupabaseAdmin();
    if (sb) {
      void sb.from("b2b_inquiries").insert({
        company_name: inquiry.company_name,
        contact_name: inquiry.contact_name,
        email: inquiry.email,
        phone: inquiry.phone,
        country: inquiry.country,
        city: inquiry.city,
        business_type: inquiry.business_type,
        lead_origin: inquiry.lead_origin,
        items: inquiry.items,
        notes: inquiry.notes,
        estimated_total: inquiry.estimated_total,
        currency: inquiry.currency,
        status: inquiry.status,
      });
    }

    const jarvis = await pushToJarvis({
      type: "b2b_inquiry",
      source: "fmk-wig",
      occurred_at: inquiry.created_at,
      data: inquiry as unknown as Record<string, unknown>,
    });
    if (jarvis.ok && !jarvis.skipped) {
      markInquiryJarvisSynced(inquiry.id);
    }

    appendAnalytics({
      id: randomUUID(),
      event_name: "b2b_inquiry_submitted",
      session_id: parsed.data.session_id,
      lead_origin: parsed.data.lead_origin,
      city: parsed.data.city,
      country: parsed.data.country,
      currency: parsed.data.currency,
      metadata: { inquiry_id: inquiry.id, company: inquiry.company_name },
      created_at: new Date().toISOString(),
    });

    res.status(201).json({ ok: true, inquiry_id: inquiry.id, jarvis });
  });

  app.get("/b2b/inquiries", requireJwt, async (_req, res) => {
    res.json({ inquiries: listInquiries() });
  });

  app.post("/jarvis/sync-order", requireJwt, async (req, res) => {
    const user = (req as typeof req & { user: { id: string } }).user;
    const schema = z.object({
      order_id: z.string(),
      total: z.number().optional(),
      currency: z.string().optional(),
      items: z.array(z.record(z.unknown())).optional(),
      customer: z.record(z.unknown()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid order payload" });
      return;
    }
    const result = await pushToJarvis({
      type: "order",
      source: "fmk-wig",
      occurred_at: new Date().toISOString(),
      data: { ...parsed.data, user_id: user.id },
    });
    res.json(result);
  });

  app.get("/catalog/wholesale", (_req, res) => {
    const items = Object.entries(PRODUCT_WHOLESALE).map(([slug, p]) => ({
      slug,
      ...p,
      currency: "BDT",
    }));
    res.json({ items });
  });

  app.post("/jarvis/sync-catalog", requireJwt, async (_req, res) => {
    const items = Object.entries(PRODUCT_WHOLESALE).map(([slug, p]) => ({ slug, ...p }));
    const result = await pushToJarvis({
      type: "catalog",
      source: "fmk-wig",
      occurred_at: new Date().toISOString(),
      data: { items },
    });
    res.json({ ...result, count: items.length });
  });

  return app;
}

const PORT = Number(process.env.API_PORT || 3001);

if (import.meta.main) {
  const app = createApiApp();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[fmk-api] listening on http://0.0.0.0:${PORT}`);
  });
}

export default createApiApp;
