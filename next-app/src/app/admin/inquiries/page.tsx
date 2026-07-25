"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/currency";

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
  estimated_total: number | null;
  currency: string | null;
  status: string | null;
  created_at: string;
};

export default function AdminInquiries() {
  const [rows, setRows] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("b2b_inquiries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data as InquiryRow[] | null) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading leads…</div>;
  if (rows.length === 0)
    return <div className="p-8 text-center text-muted-foreground">No B2B leads yet.</div>;

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="border rounded-lg p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="font-semibold">{r.company_name}</div>
              <div className="text-sm text-muted-foreground">
                {r.contact_name} · {r.email} {r.phone ? `· ${r.phone}` : ""}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {[r.city, r.country].filter(Boolean).join(", ")} · {r.business_type || "—"} · via{" "}
                {r.lead_origin || "direct"}
              </div>
            </div>
            <div className="text-right">
              {r.estimated_total != null && (
                <div className="font-semibold text-brand">
                  {formatMoney(Number(r.estimated_total), (r.currency as "BDT" | "USD") || "BDT")}
                </div>
              )}
              <span className="text-xs rounded-full border px-2 py-0.5">{r.status || "new"}</span>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(r.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
