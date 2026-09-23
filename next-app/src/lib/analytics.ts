const SESSION_KEY = "fmk_session_v1";

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "/api";
}

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function detectLeadOrigin(referrer?: string | null): string {
  const ref = (referrer || (typeof document !== "undefined" ? document.referrer : "") || "").toLowerCase();
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const utm = params?.get("utm_source")?.toLowerCase();
  if (utm) return utm;
  if (ref.includes("google.")) return "google";
  if (ref.includes("linkedin.")) return "linkedin";
  if (ref.includes("facebook.") || ref.includes("fb.")) return "facebook";
  if (ref.includes("instagram.")) return "instagram";
  if (!ref) return "direct";
  return "referral";
}

/** Map internal event names to ad-platform standard events and fire browser pixels. */
function firePixel(eventName: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    fbq?: (...a: unknown[]) => void;
    gtag?: (...a: unknown[]) => void;
    ttq?: { track?: (e: string, d?: unknown) => void };
  };
  const map: Record<string, { meta?: string; ga4?: string; tiktok?: string }> = {
    product_view: { meta: "ViewContent", ga4: "view_item", tiktok: "ViewContent" },
    add_to_cart: { meta: "AddToCart", ga4: "add_to_cart", tiktok: "AddToCart" },
    begin_checkout: { meta: "InitiateCheckout", ga4: "begin_checkout", tiktok: "InitiateCheckout" },
    purchase: { meta: "Purchase", ga4: "purchase", tiktok: "CompletePayment" },
    b2b_inquiry_submitted: { meta: "Lead", ga4: "generate_lead", tiktok: "SubmitForm" },
    b2b_quote_generated: { meta: "Lead", ga4: "generate_lead", tiktok: "SubmitForm" },
  };
  const std = map[eventName];
  if (!std) return;
  try {
    if (std.meta && w.fbq) w.fbq("track", std.meta, data);
    if (std.ga4 && w.gtag) w.gtag("event", std.ga4, data);
    if (std.tiktok && w.ttq?.track) w.ttq.track(std.tiktok, data);
  } catch {
    /* ignore */
  }
}

/** Best-effort telemetry only; never use as a receipt for a customer submission. */
export async function trackEvent(payload: {
  event_name: string;
  page_path?: string;
  product_id?: string;
  currency?: string;
  metadata?: Record<string, unknown>;
  city?: string;
  country?: string;
}): Promise<void> {
  if (typeof window === "undefined") return;
  firePixel(payload.event_name, { currency: payload.currency, ...payload.metadata });
  try {
    await fetch(`${apiBase()}/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        session_id: getSessionId(),
        page_path: payload.page_path || window.location.pathname,
        referrer: document.referrer || null,
        lead_origin: detectLeadOrigin(),
      }),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

export async function submitB2BInquiry(body: Record<string, unknown>) {
  const res = await fetch(`${apiBase()}/b2b/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      lead_origin: detectLeadOrigin(),
      session_id: getSessionId(),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to submit inquiry");
  }
  const result = await res.json();
  if (result?.ok !== true || typeof result.inquiry_id !== "string" || !result.inquiry_id.trim()) {
    throw new Error("Your message could not be confirmed as saved. Please try again later.");
  }
  return result;
}

export async function requestQuote(body: {
  items: Array<{ slug: string; quantity: number; wholesale_price_bdt?: number }>;
  currency?: string;
}) {
  const res = await fetch(`${apiBase()}/quotes/instant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to generate quote");
  }
  return res.json();
}
