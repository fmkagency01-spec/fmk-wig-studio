/**
 * Jarvis Common Center — push order logs & catalog / inquiry payloads.
 * Set JARVIS_WEBHOOK_URL (+ optional JARVIS_API_KEY) in the environment.
 */

export type JarvisPayload = {
  type: "order" | "catalog" | "b2b_inquiry" | "quote";
  source: "fmk-wig";
  occurred_at: string;
  data: Record<string, unknown>;
};

export async function pushToJarvis(payload: JarvisPayload): Promise<{ ok: boolean; skipped?: boolean; status?: number }> {
  const url = process.env.JARVIS_WEBHOOK_URL;
  if (!url) {
    return { ok: false, skipped: true };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Source": "fmk-wig-api",
  };
  const apiKey = process.env.JARVIS_API_KEY;
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  try {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok && body?.ok === true, status: res.status };
  } catch {
    // A saved inquiry must not become a failed submission when notification fails.
    return { ok: false };
  }
}
