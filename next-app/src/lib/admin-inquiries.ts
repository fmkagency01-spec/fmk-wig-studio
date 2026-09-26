export type InquiryStatus = "new" | "reviewing" | "approved" | "rejected";

export type InquiryTransition = {
  id: string;
  status: Exclude<InquiryStatus, "new">;
  quoteTotal?: number | null;
  currency?: "BDT" | "USD";
  reason?: string | null;
};

export type InquiryReceipt = {
  id: string;
  status: InquiryStatus;
  estimated_total: number | null;
  currency: string;
  decision_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  updated_at: string;
};

type RpcClient = {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

export async function transitionInquiry(
  client: RpcClient,
  input: InquiryTransition,
): Promise<InquiryReceipt> {
  const { data, error } = await client.rpc("transition_b2b_inquiry", {
    _inquiry_id: input.id,
    _next_status: input.status,
    _quote_total: input.quoteTotal ?? null,
    _quote_currency: input.currency ?? null,
    _reason: input.reason?.trim() || null,
  });
  if (error) throw new Error(error.message || "Inquiry update failed");
  const receipt = data as Partial<InquiryReceipt> | null;
  if (
    !receipt ||
    receipt.id !== input.id ||
    receipt.status !== input.status ||
    !receipt.updated_at
  ) {
    throw new Error("Inquiry update could not be confirmed");
  }
  return receipt as InquiryReceipt;
}
