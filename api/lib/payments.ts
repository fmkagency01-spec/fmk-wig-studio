/**
 * Provider-agnostic payment layer.
 *
 * International payments are the target. Stripe is wired as the first adapter but
 * stays INERT until `STRIPE_SECRET_KEY` is present (your Stripe US payment method
 * is not active yet). No merchant gateway is required to run the site — checkout
 * falls back to "unpaid" order capture (COD / manual) so you can launch and start
 * collecting leads/orders immediately, then flip payments on later.
 *
 * To enable Stripe later: set STRIPE_SECRET_KEY (+ STRIPE_WEBHOOK_SECRET) and,
 * optionally, add the `stripe` npm dependency for richer types. This module uses
 * the raw REST API so it works with zero extra dependencies.
 */

export type PaymentConfig = {
  enabled: boolean;
  providers: {
    stripe: { enabled: boolean };
  };
  default_currency: string;
};

export function paymentConfig(): PaymentConfig {
  const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);
  return {
    enabled: stripeEnabled,
    providers: { stripe: { enabled: stripeEnabled } },
    default_currency: process.env.DEFAULT_CURRENCY || "USD",
  };
}

export type CheckoutRequest = {
  order_id: string;
  amount: number; // major currency units (e.g. dollars)
  currency: string;
  customer_email?: string;
  success_url: string;
  cancel_url: string;
  description?: string;
};

export type CheckoutResult =
  | { enabled: false; message: string }
  | { enabled: true; provider: "stripe"; checkout_url: string; session_id: string };

export async function createCheckoutSession(req: CheckoutRequest): Promise<CheckoutResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return {
      enabled: false,
      message:
        "Payments are not enabled yet. Set STRIPE_SECRET_KEY to activate Stripe Checkout. Order captured as unpaid.",
    };
  }

  // Stripe Checkout Session via REST (x-www-form-urlencoded).
  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", req.success_url);
  form.set("cancel_url", req.cancel_url);
  if (req.customer_email) form.set("customer_email", req.customer_email);
  form.set("client_reference_id", req.order_id);
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", req.currency.toLowerCase());
  form.set(
    "line_items[0][price_data][product_data][name]",
    req.description || `FMK WIG Order ${req.order_id}`,
  );
  form.set("line_items[0][price_data][unit_amount]", String(Math.round(req.amount * 100)));

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Stripe checkout failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  const session = (await res.json()) as { id: string; url: string };
  return { enabled: true, provider: "stripe", checkout_url: session.url, session_id: session.id };
}
