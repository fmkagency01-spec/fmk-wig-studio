"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/currency";
import { transitionInquiry, type InquiryReceipt, type InquiryStatus } from "@/lib/admin-inquiries";
import { toast } from "sonner";

type InquiryRow = {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  business_type: string | null;
  lead_origin: string | null;
  items: Array<{ slug: string; quantity: number }> | null;
  notes: string | null;
  estimated_total: number | null;
  currency: string | null;
  status: InquiryStatus | null;
  decision_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type Draft = { total: string; currency: "BDT" | "USD"; reason: string };
const FILTERS: Array<"all" | InquiryStatus> = ["all", "new", "reviewing", "approved", "rejected"];

export default function AdminInquiries() {
  const [rows, setRows] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const { data, error } = await supabase
      .from("b2b_inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      setRows([]);
      setLoadError(error.message);
    } else {
      setRows((data as InquiryRow[] | null) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const draftFor = (row: InquiryRow): Draft =>
    drafts[row.id] || {
      total: row.estimated_total == null ? "" : String(row.estimated_total),
      currency: row.currency === "USD" ? "USD" : "BDT",
      reason: row.decision_reason || "",
    };
  const patchDraft = (row: InquiryRow, patch: Partial<Draft>) =>
    setDrafts((current) => {
      const existing = current[row.id] || {
        total: row.estimated_total == null ? "" : String(row.estimated_total),
        currency: row.currency === "USD" ? "USD" : "BDT",
        reason: row.decision_reason || "",
      };
      return { ...current, [row.id]: { ...existing, ...patch } };
    });

  const apply = async (row: InquiryRow, status: Exclude<InquiryStatus, "new">) => {
    const draft = draftFor(row);
    setPendingId(row.id);
    try {
      const receipt = await transitionInquiry(supabase, {
        id: row.id,
        status,
        quoteTotal: status === "approved" ? Number(draft.total) : null,
        currency: draft.currency,
        reason: status === "rejected" ? draft.reason : null,
      });
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, ...(receipt as InquiryReceipt) } : item,
        ),
      );
      toast.success(`Inquiry marked ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inquiry update failed");
    } finally {
      setPendingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading leads…</div>;
  if (loadError)
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-5 text-sm text-red-800">
        Could not load inquiries: {loadError}
      </div>
    );

  const visible = filter === "all" ? rows : rows.filter((row) => (row.status || "new") === filter);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" aria-label="Inquiry status filters">
        {FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-md border px-3 py-1.5 text-sm capitalize ${filter === status ? "bg-brand text-brand-foreground" : ""}`}
          >
            {status}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No {filter === "all" ? "B2B" : filter} leads.
        </div>
      ) : (
        visible.map((row) => {
          const status = row.status || "new";
          const draft = draftFor(row);
          const busy = pendingId === row.id;
          return (
            <article key={row.id} className="space-y-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{row.company_name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {row.contact_name} ·{" "}
                    <a className="underline" href={`mailto:${row.email}`}>
                      {row.email}
                    </a>
                    {row.phone ? (
                      <>
                        {" "}
                        ·{" "}
                        <a className="underline" href={`tel:${row.phone}`}>
                          {row.phone}
                        </a>
                      </>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[row.city, row.country].filter(Boolean).join(", ")} ·{" "}
                    {row.business_type || "—"} · via {row.lead_origin || "direct"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-full border px-2 py-0.5 text-xs capitalize">
                    {status}
                  </span>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="rounded-md bg-secondary/50 p-3 text-sm">
                <strong>Requested items</strong>
                <ul className="mt-1 list-disc pl-5">
                  {(row.items || []).map((item) => (
                    <li key={item.slug}>
                      {item.slug.replace(/-/g, " ")} × {item.quantity}
                    </li>
                  ))}
                </ul>
                {row.notes ? (
                  <p className="mt-2 whitespace-pre-wrap">
                    <strong>Notes:</strong> {row.notes}
                  </p>
                ) : null}
              </div>
              {status === "approved" && row.estimated_total != null ? (
                <p className="font-semibold text-brand">
                  Approved quote:{" "}
                  {formatMoney(Number(row.estimated_total), row.currency === "USD" ? "USD" : "BDT")}
                </p>
              ) : null}
              {status === "rejected" ? (
                <p className="text-sm text-red-700">
                  <strong>Rejection reason:</strong> {row.decision_reason}
                </p>
              ) : null}
              <div className="grid gap-3 md:grid-cols-[1fr_130px_2fr_auto]">
                <label className="text-xs">
                  Final quote
                  <input
                    aria-label={`Final quote for ${row.company_name}`}
                    value={draft.total}
                    onChange={(e) => patchDraft(row, { total: e.target.value })}
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="mt-1 w-full rounded-md border px-2 py-2"
                  />
                </label>
                <label className="text-xs">
                  Currency
                  <select
                    value={draft.currency}
                    onChange={(e) => patchDraft(row, { currency: e.target.value as "BDT" | "USD" })}
                    className="mt-1 w-full rounded-md border px-2 py-2"
                  >
                    <option>BDT</option>
                    <option>USD</option>
                  </select>
                </label>
                <label className="text-xs">
                  Rejection reason
                  <input
                    aria-label={`Rejection reason for ${row.company_name}`}
                    value={draft.reason}
                    onChange={(e) => patchDraft(row, { reason: e.target.value })}
                    className="mt-1 w-full rounded-md border px-2 py-2"
                  />
                </label>
                <div className="flex items-end gap-2">
                  {status === "new" ? (
                    <button
                      disabled={busy}
                      onClick={() => apply(row, "reviewing")}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      Review
                    </button>
                  ) : null}
                  {status === "new" || status === "reviewing" ? (
                    <>
                      <button
                        disabled={busy || !draft.total || Number(draft.total) <= 0}
                        onClick={() => apply(row, "approved")}
                        className="rounded-md bg-brand px-3 py-2 text-sm text-brand-foreground"
                      >
                        Approve
                      </button>
                      <button
                        disabled={busy || !draft.reason.trim()}
                        onClick={() => apply(row, "rejected")}
                        className="rounded-md bg-red-700 px-3 py-2 text-sm text-white"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() => apply(row, "reviewing")}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
