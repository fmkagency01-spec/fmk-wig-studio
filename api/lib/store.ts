import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  ensureDir();
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

export type AnalyticsEvent = {
  id: string;
  event_name: string;
  session_id?: string;
  user_id?: string | null;
  page_path?: string;
  referrer?: string | null;
  lead_origin?: string;
  country?: string;
  city?: string;
  currency?: string;
  product_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type B2BInquiry = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  business_type?: string;
  lead_origin?: string;
  items: unknown[];
  notes?: string;
  estimated_total?: number;
  currency: string;
  status: string;
  jarvis_synced_at?: string | null;
  created_at: string;
};

export type OrderItem = {
  slug?: string;
  product_id?: string | null;
  name?: string;
  quantity: number;
  unit_price_bdt?: number;
  unit_price?: number;
  subtotal_bdt?: number;
  subtotal?: number;
};

export type Order = {
  id: string;
  order_number: string;
  user_id?: string | null;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  payment_status: "unpaid" | "paid" | "failed" | "refunded";
  payment_provider?: string | null;
  currency: string;
  subtotal: number;
  shipping: number;
  total: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  address_line1?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  items: OrderItem[];
  notes?: string;
  lead_origin?: string;
  created_at: string;
  updated_at: string;
};

export function appendOrder(order: Order) {
  const all = readJson<Order[]>("orders.json", []);
  all.push(order);
  writeJson("orders.json", all);
  return order;
}

export function listOrders(limit = 200) {
  return readJson<Order[]>("orders.json", []).slice(-limit).reverse();
}

export function getOrder(id: string) {
  return readJson<Order[]>("orders.json", []).find((o) => o.id === id) ?? null;
}

export function updateOrderStatus(
  id: string,
  patch: Partial<Pick<Order, "status" | "payment_status" | "payment_provider">>,
) {
  const all = readJson<Order[]>("orders.json", []);
  const idx = all.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
  writeJson("orders.json", all);
  return all[idx];
}

export function appendAnalytics(event: AnalyticsEvent) {
  const all = readJson<AnalyticsEvent[]>("analytics.json", []);
  all.push(event);
  // keep last 5k events on disk
  writeJson("analytics.json", all.slice(-5000));
  return event;
}

export function listAnalytics(limit = 100) {
  const all = readJson<AnalyticsEvent[]>("analytics.json", []);
  return all.slice(-limit).reverse();
}

export function appendInquiry(inquiry: B2BInquiry) {
  const all = readJson<B2BInquiry[]>("inquiries.json", []);
  all.push(inquiry);
  writeJson("inquiries.json", all);
  return inquiry;
}

export function listInquiries() {
  return readJson<B2BInquiry[]>("inquiries.json", []).reverse();
}

export function markInquiryJarvisSynced(id: string) {
  const all = readJson<B2BInquiry[]>("inquiries.json", []);
  const idx = all.findIndex((i) => i.id === id);
  if (idx >= 0) {
    all[idx].jarvis_synced_at = new Date().toISOString();
    writeJson("inquiries.json", all);
    return all[idx];
  }
  return null;
}
