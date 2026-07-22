import { formatMoney, type CurrencyCode } from "@/lib/currency";

/** @deprecated Prefer useCurrency().format — kept for existing call sites. */
export function formatBDT(amount: number | string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return "৳0";
  return formatMoney(n, "BDT");
}

export function formatPrice(amount: number | string, currency: CurrencyCode = "BDT") {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return currency === "USD" ? "$0.00" : "৳0";
  return formatMoney(n, currency);
}
