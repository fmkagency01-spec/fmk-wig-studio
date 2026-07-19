export function formatBDT(amount: number | string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return "৳0";
  return "৳" + n.toLocaleString("en-BD", { maximumFractionDigits: 0 });
}
