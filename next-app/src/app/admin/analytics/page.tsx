"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type EventRow = { event_name: string; lead_origin: string | null; created_at: string };

function tally(rows: EventRow[], key: (r: EventRow) => string | null | undefined) {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = key(r);
    if (k) out[k] = (out[k] || 0) + 1;
  }
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}

function Panel({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = rows.reduce((m, [, v]) => Math.max(m, v), 1);
  return (
    <div className="border rounded-lg p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="text-sm">
              <div className="flex justify-between">
                <span className="capitalize">{label.replace(/_/g, " ")}</span>
                <span className="font-semibold">{value}</span>
              </div>
              <div className="h-1.5 rounded bg-secondary mt-1">
                <div className="h-1.5 rounded bg-brand" style={{ width: `${(value / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminAnalytics() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("analytics_events")
        .select("event_name, lead_origin, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      setRows((data as EventRow[] | null) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading analytics…</div>;

  const byEvent = tally(rows, (r) => r.event_name);
  const byLeadOrigin = tally(rows, (r) => r.lead_origin);
  const byDay = tally(rows, (r) => r.created_at.slice(0, 10));

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Panel title="Events by type" rows={byEvent} />
      <Panel title="Lead origin" rows={byLeadOrigin} />
      <Panel title="Events by day" rows={byDay} />
    </div>
  );
}
