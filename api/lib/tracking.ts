import { createHash } from "node:crypto";
import type { AnalyticsEvent } from "./store.ts";

/**
 * Server-side conversion tracking.
 *
 * Forwards first-party analytics events to ad-platform server-side APIs
 * (Meta Conversions API, GA4 Measurement Protocol, TikTok Events API).
 *
 * Everything here is ENV-GATED: with no credentials set, every forwarder is a
 * no-op and returns `{ skipped: true }`. Add the IDs/tokens in the environment
 * (Render / .env) to go live — no code change required.
 *
 * Public pixel IDs are safe to expose to the browser via `publicTrackingConfig()`.
 */

export type PublicTrackingConfig = {
  meta_pixel_id: string | null;
  ga4_measurement_id: string | null;
  tiktok_pixel_id: string | null;
};

export function publicTrackingConfig(): PublicTrackingConfig {
  return {
    meta_pixel_id: process.env.META_PIXEL_ID || null,
    ga4_measurement_id: process.env.GA4_MEASUREMENT_ID || null,
    tiktok_pixel_id: process.env.TIKTOK_PIXEL_ID || null,
  };
}

/** Map our internal event names to standard ad-platform event names. */
const STANDARD_EVENTS: Record<string, { meta?: string; ga4?: string; tiktok?: string }> = {
  page_view: { meta: "PageView", ga4: "page_view", tiktok: "Pageview" },
  view_product: { meta: "ViewContent", ga4: "view_item", tiktok: "ViewContent" },
  add_to_cart: { meta: "AddToCart", ga4: "add_to_cart", tiktok: "AddToCart" },
  begin_checkout: { meta: "InitiateCheckout", ga4: "begin_checkout", tiktok: "InitiateCheckout" },
  purchase: { meta: "Purchase", ga4: "purchase", tiktok: "CompletePayment" },
  b2b_inquiry_submitted: { meta: "Lead", ga4: "generate_lead", tiktok: "SubmitForm" },
  b2b_quote_generated: { meta: "Lead", ga4: "generate_lead", tiktok: "SubmitForm" },
};

function sha256Lower(v?: string | null): string | undefined {
  if (!v) return undefined;
  return createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
}

type ForwardResult = { destination: string; ok: boolean; skipped?: boolean; status?: number };

/**
 * Fire-and-forget forwarding of a single event to all configured destinations.
 * Never throws; individual failures are isolated and logged.
 */
export async function forwardEvent(
  event: AnalyticsEvent,
  ctx?: { ip?: string; userAgent?: string; email?: string },
): Promise<ForwardResult[]> {
  const results = await Promise.allSettled([
    forwardMeta(event, ctx),
    forwardGa4(event),
    forwardTiktok(event, ctx),
  ]);
  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { destination: "unknown", ok: false, status: 0 },
  );
}

async function forwardMeta(
  event: AnalyticsEvent,
  ctx?: { ip?: string; userAgent?: string; email?: string },
): Promise<ForwardResult> {
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !token) return { destination: "meta", ok: true, skipped: true };

  const name = STANDARD_EVENTS[event.event_name]?.meta || "CustomEvent";
  const body = {
    data: [
      {
        event_name: name,
        event_time: Math.floor(new Date(event.created_at).getTime() / 1000),
        event_id: event.id,
        action_source: "website",
        event_source_url: event.page_path,
        user_data: {
          em: sha256Lower(ctx?.email) ? [sha256Lower(ctx?.email)] : undefined,
          client_ip_address: ctx?.ip,
          client_user_agent: ctx?.userAgent,
          external_id: event.user_id ? sha256Lower(event.user_id) : undefined,
        },
        custom_data: {
          currency: event.currency,
          content_ids: event.product_id ? [event.product_id] : undefined,
          ...(event.metadata || {}),
        },
      },
    ],
  };
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return { destination: "meta", ok: res.ok, status: res.status };
  } catch {
    return { destination: "meta", ok: false, status: 0 };
  }
}

async function forwardGa4(event: AnalyticsEvent): Promise<ForwardResult> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) return { destination: "ga4", ok: true, skipped: true };

  const name =
    STANDARD_EVENTS[event.event_name]?.ga4 || event.event_name.replace(/[^a-z0-9_]/gi, "_");
  const body = {
    client_id: event.session_id || event.id,
    events: [
      {
        name,
        params: {
          page_location: event.page_path,
          currency: event.currency,
          items: event.product_id ? [{ item_id: event.product_id }] : undefined,
          ...(event.metadata || {}),
        },
      },
    ],
  };
  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return { destination: "ga4", ok: res.ok, status: res.status };
  } catch {
    return { destination: "ga4", ok: false, status: 0 };
  }
}

async function forwardTiktok(
  event: AnalyticsEvent,
  ctx?: { ip?: string; userAgent?: string; email?: string },
): Promise<ForwardResult> {
  const pixelId = process.env.TIKTOK_PIXEL_ID;
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!pixelId || !token) return { destination: "tiktok", ok: true, skipped: true };

  const name = STANDARD_EVENTS[event.event_name]?.tiktok || event.event_name;
  const body = {
    event_source: "web",
    event_source_id: pixelId,
    data: [
      {
        event: name,
        event_time: Math.floor(new Date(event.created_at).getTime() / 1000),
        event_id: event.id,
        user: {
          email: sha256Lower(ctx?.email),
          ip: ctx?.ip,
          user_agent: ctx?.userAgent,
        },
        properties: {
          currency: event.currency,
          content_id: event.product_id,
          ...(event.metadata || {}),
        },
        page: { url: event.page_path },
      },
    ],
  };
  try {
    const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Access-Token": token },
      body: JSON.stringify(body),
    });
    return { destination: "tiktok", ok: res.ok, status: res.status };
  } catch {
    return { destination: "tiktok", ok: false, status: 0 };
  }
}
