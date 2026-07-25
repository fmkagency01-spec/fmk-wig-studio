import { detectLeadOrigin } from "@/lib/analytics";

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "/api";
}

export type CreateOrderInput = {
  currency: "BDT" | "USD";
  subtotal: number;
  shipping: number;
  total: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  address_line1?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  items: Array<{
    slug?: string;
    product_id?: string | null;
    name?: string;
    quantity: number;
    unit_price?: number;
    subtotal?: number;
  }>;
  notes?: string;
  session_id?: string;
};

export type CreateOrderResult = { ok: true; order_id: string; order_number: string };

export async function createOrder(input: CreateOrderInput, accessToken?: string | null): Promise<CreateOrderResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${apiBase()}/orders`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...input, lead_origin: detectLeadOrigin() }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Could not place order");
  }
  return res.json();
}

export type PaymentConfig = {
  enabled: boolean;
  providers: { stripe: { enabled: boolean } };
  default_currency: string;
};

export async function getPaymentConfig(): Promise<PaymentConfig> {
  try {
    const res = await fetch(`${apiBase()}/payments/config`);
    if (!res.ok) throw new Error("config");
    return res.json();
  } catch {
    return { enabled: false, providers: { stripe: { enabled: false } }, default_currency: "USD" };
  }
}

export type CheckoutSession =
  | { enabled: false; message: string }
  | { enabled: true; provider: string; checkout_url: string; session_id: string };

export async function startPayment(input: {
  order_id: string;
  amount: number;
  currency: string;
  customer_email?: string;
  success_url: string;
  cancel_url: string;
  description?: string;
}): Promise<CheckoutSession> {
  const res = await fetch(`${apiBase()}/payments/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}
