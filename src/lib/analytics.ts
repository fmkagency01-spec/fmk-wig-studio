/** Client analytics → Express API (with graceful no-op if API is down). */

const SESSION_KEY = "fmk_session_v1";

function apiBase(): string {
  return import.meta.env.VITE_API_URL || "/api";
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

export type TrackPayload = {
  event_name: string;
  page_path?: string;
  product_id?: string;
  currency?: string;
  metadata?: Record<string, unknown>;
  city?: string;
  country?: string;
};

export async function trackEvent(payload: TrackPayload): Promise<void> {
  if (typeof window === "undefined") return;
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
        country: payload.country || undefined,
        city: payload.city || undefined,
      }),
      keepalive: true,
    });
  } catch {
    /* analytics must never break UX */
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
    throw new Error(err.error || "Failed to submit inquiry");
  }
  return res.json();
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
    throw new Error(err.error || "Failed to generate quote");
  }
  return res.json();
}
