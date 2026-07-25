import { randomUUID } from "node:crypto";
import express from "express";
import cors from "cors";
import { z } from "zod";
import {
  appendAnalytics,
  appendInquiry,
  appendOrder,
  getOrder,
  listAnalytics,
  listInquiries,
  listOrders,
  markInquiryJarvisSynced,
  updateOrderStatus,
  type Order,
} from "./lib/store.ts";
import { getSupabaseAdmin, verifyBearerUser } from "./lib/supabase.ts";
import { requireJwt } from "./lib/jwt.ts";
import { requireAdminKey } from "./lib/adminAuth.ts";
import { pushToJarvis } from "./lib/jarvis.ts";
import { forwardEvent, publicTrackingConfig } from "./lib/tracking.ts";
import { createCheckoutSession, paymentConfig } from "./lib/payments.ts";

function clientIp(req: express.Request): string | undefined {
  const fwd = req.header("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.socket?.remoteAddress || undefined;
}

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

    // Fire-and-forget server-side conversion forwarding (no-op until pixels configured).
    void forwardEvent(event, {
      ip: clientIp(req),
      userAgent: req.header("user-agent") || undefined,
      email:
        typeof parsed.data.metadata?.email === "string" ? parsed.data.metadata.email : undefined,
    });

    res.status(201).json({ ok: true, id: event.id });
  });

  // Public tracking config — lets both frontends init pixels from one source of truth.
  app.get("/tracking/config", (_req, res) => {
    res.json(publicTrackingConfig());
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
      notes:
        "Wholesale pricing for salons & distributors. Final invoice may include shipping & duties.",
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

  // ---------------------------------------------------------------------------
  // Orders (headless capture — usable by any frontend, COD/manual until payments on)
  // ---------------------------------------------------------------------------
  app.post("/orders", async (req, res) => {
    const itemSchema = z.object({
      slug: z.string().optional(),
      product_id: z.string().nullable().optional(),
      name: z.string().optional(),
      quantity: z.number().int().positive(),
      unit_price_bdt: z.number().optional(),
      unit_price: z.number().optional(),
      subtotal_bdt: z.number().optional(),
      subtotal: z.number().optional(),
    });
    const schema = z.object({
      currency: z.enum(["BDT", "USD"]).default("BDT"),
      subtotal: z.number().nonnegative(),
      shipping: z.number().nonnegative().default(0),
      total: z.number().nonnegative(),
      customer_name: z.string().min(1),
      customer_email: z.string().email(),
      customer_phone: z.string().optional(),
      address_line1: z.string().optional(),
      city: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
      items: z.array(itemSchema).min(1),
      notes: z.string().optional(),
      lead_origin: z.string().optional(),
      session_id: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid order", details: parsed.error.flatten() });
      return;
    }

    const user = await verifyBearerUser(req.header("authorization"));
    const now = new Date().toISOString();
    const order: Order = {
      id: randomUUID(),
      order_number: `FMK-${Date.now().toString(36).toUpperCase()}`,
      user_id: user?.id ?? null,
      status: "pending",
      payment_status: "unpaid",
      payment_provider: null,
      currency: parsed.data.currency,
      subtotal: parsed.data.subtotal,
      shipping: parsed.data.shipping,
      total: parsed.data.total,
      customer_name: parsed.data.customer_name,
      customer_email: parsed.data.customer_email,
      customer_phone: parsed.data.customer_phone,
      address_line1: parsed.data.address_line1,
      city: parsed.data.city,
      postal_code: parsed.data.postal_code,
      country: parsed.data.country || "Bangladesh",
      items: parsed.data.items,
      notes: parsed.data.notes,
      lead_origin: parsed.data.lead_origin,
      created_at: now,
      updated_at: now,
    };
    appendOrder(order);

    const sb = getSupabaseAdmin();
    if (sb) {
      void sb.from("orders").insert({
        user_id: order.user_id,
        status: order.status,
        payment_status: order.payment_status,
        total: order.total,
        currency: order.currency,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
      });
    }

    appendAnalytics({
      id: randomUUID(),
      event_name: "order_created",
      session_id: parsed.data.session_id,
      user_id: order.user_id,
      currency: order.currency,
      metadata: { order_id: order.id, order_number: order.order_number, total: order.total },
      created_at: now,
    });

    void pushToJarvis({
      type: "order",
      source: "fmk-wig",
      occurred_at: now,
      data: order as unknown as Record<string, unknown>,
    });

    res.status(201).json({ ok: true, order_id: order.id, order_number: order.order_number });
  });

  app.get("/orders/:id", requireAdminKey, (req, res) => {
    const order = getOrder(req.params.id);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({ order });
  });

  app.patch("/orders/:id/status", requireAdminKey, (req, res) => {
    const schema = z.object({
      status: z
        .enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"])
        .optional(),
      payment_status: z.enum(["unpaid", "paid", "failed", "refunded"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success || (!parsed.data.status && !parsed.data.payment_status)) {
      res.status(400).json({ error: "Provide status and/or payment_status" });
      return;
    }
    const updated = updateOrderStatus(req.params.id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({ ok: true, order: updated });
  });

  // ---------------------------------------------------------------------------
  // Payments (provider-agnostic; inert until STRIPE_SECRET_KEY is set)
  // ---------------------------------------------------------------------------
  app.get("/payments/config", (_req, res) => {
    res.json(paymentConfig());
  });

  app.post("/payments/checkout", async (req, res) => {
    const schema = z.object({
      order_id: z.string(),
      amount: z.number().positive(),
      currency: z.string().default("USD"),
      customer_email: z.string().email().optional(),
      success_url: z.string().url(),
      cancel_url: z.string().url(),
      description: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid checkout request", details: parsed.error.flatten() });
      return;
    }
    try {
      const result = await createCheckoutSession(parsed.data);
      res.status(result.enabled ? 200 : 202).json(result);
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : "Checkout failed" });
    }
  });

  // ---------------------------------------------------------------------------
  // Monitoring / control plane (FAOS + admin). Guarded by x-admin-key OR admin JWT.
  // ---------------------------------------------------------------------------
  app.get("/admin/overview", requireAdminKey, (_req, res) => {
    const orders = listOrders(1000);
    const inquiries = listInquiries();
    const events = listAnalytics(5000);

    const revenue = orders
      .filter((o) => o.payment_status === "paid")
      .reduce((s, o) => s + o.total, 0);
    const grossPipeline = orders.reduce((s, o) => s + o.total, 0);

    const byEvent: Record<string, number> = {};
    for (const e of events) byEvent[e.event_name] = (byEvent[e.event_name] || 0) + 1;

    res.json({
      generated_at: new Date().toISOString(),
      orders: {
        total: orders.length,
        pending: orders.filter((o) => o.status === "pending").length,
        paid_revenue: revenue,
        gross_pipeline: grossPipeline,
        recent: orders.slice(0, 10),
      },
      inquiries: {
        total: inquiries.length,
        new: inquiries.filter((i) => i.status === "new").length,
        recent: inquiries.slice(0, 10),
      },
      analytics: { total_events: events.length, by_event: byEvent },
      integrations: {
        supabase: Boolean(getSupabaseAdmin()),
        jarvis: Boolean(process.env.JARVIS_WEBHOOK_URL),
        payments: paymentConfig(),
        pixels: publicTrackingConfig(),
      },
    });
  });

  app.get("/admin/orders", requireAdminKey, (req, res) => {
    res.json({ orders: listOrders(Number(req.query.limit) || 200) });
  });

  app.get("/admin/analytics/summary", requireAdminKey, (req, res) => {
    const events = listAnalytics(Number(req.query.limit) || 5000);
    const byEvent: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const byLeadOrigin: Record<string, number> = {};
    const byProduct: Record<string, number> = {};
    for (const e of events) {
      byEvent[e.event_name] = (byEvent[e.event_name] || 0) + 1;
      const day = e.created_at.slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
      if (e.lead_origin) byLeadOrigin[e.lead_origin] = (byLeadOrigin[e.lead_origin] || 0) + 1;
      if (e.product_id) byProduct[e.product_id] = (byProduct[e.product_id] || 0) + 1;
    }
    res.json({
      total: events.length,
      by_event: byEvent,
      by_day: byDay,
      by_lead_origin: byLeadOrigin,
      by_product: byProduct,
    });
  });

  return app;
}

const PORT = Number(process.env.API_PORT || process.env.PORT || 3001);

if (import.meta.main) {
  const app = createApiApp();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[fmk-api] listening on http://0.0.0.0:${PORT}`);
  });
}

export default createApiApp;
