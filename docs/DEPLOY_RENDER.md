# FMK WIG — Backend (Control Plane) on Render

The Express control-plane API (`api/`) powers monitoring, orders, server-side
conversion tracking, and payments. It runs on the **Bun** runtime (it uses
`.ts` imports and Bun APIs), so it deploys as a **Docker** service on Render.

Both frontends (Next.js on Vercel, and the Vite/Lovable build) and your **FAOS**
workstation talk to this one API. That gives you a single place to monitor and
control the whole business.

---

## 1. One-time deploy (Blueprint)

1. Push this repo to GitHub (already done).
2. Render Dashboard → **New → Blueprint** → select this repo. Render reads
   [`render.yaml`](../render.yaml) and creates the `fmk-wig-api` web service from
   [`api/Dockerfile`](../api/Dockerfile).
3. On first deploy, set the secret env vars (they are `sync:false`, so Render
   asks for them):
   - `SUPABASE_URL` = `https://culxhuqrrtjvnnwadhgf.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = *(from Supabase → Project Settings → API → service_role)* — **required for full order/analytics monitoring** (bypasses RLS).
   - `SUPABASE_PUBLISHABLE_KEY` = *(publishable key; optional if service role set)*
   - `ADMIN_API_KEY` — Render auto-generates one (`generateValue: true`). Copy it; this is your control-plane secret.
4. Deploy. Health check: `GET https://<your-service>.onrender.com/health`.

> Same Render account as your FAOS backend — deploy `fmk-wig-api` as a **separate
> service** in the same workspace so you monitor both side by side.

---

## 2. How you control / monitor it

All control-plane endpoints accept **either** header:
`x-admin-key: <ADMIN_API_KEY>` (server-to-server, e.g. FAOS) **or** a Supabase
admin `Authorization: Bearer <jwt>` (browser admin panel).

| Endpoint | Purpose |
|---|---|
| `GET /health` | Uptime + which integrations are live |
| `GET /admin/overview` | Business snapshot: orders, revenue, pending, inquiries, analytics, integration status |
| `GET /admin/orders?limit=` | All orders (newest first) |
| `GET /admin/analytics/summary` | Events by type / day / lead-origin / product |
| `GET /orders/:id` | Single order |
| `PATCH /orders/:id/status` | Update `status` / `payment_status` |
| `GET /b2b/inquiries` | Wholesale leads (JWT) |

Example:
```bash
curl -H "x-admin-key: $ADMIN_API_KEY" https://<service>.onrender.com/admin/overview
```

---

## 3. Point the frontends at it

- **Next.js (Vercel):** set `API_PROXY_TARGET=https://<service>.onrender.com`
  (used by `next.config.ts` rewrites) and `NEXT_PUBLIC_API_URL=/api`.
- **Vite/Lovable:** set `API_PROXY_TARGET` the same way (dev proxy), or
  `VITE_API_URL=https://<service>.onrender.com` for direct calls.

---

## 4. Turn features on later (no code change — just env vars)

**Pixels / server-side tracking** (add when you have the IDs):
`META_PIXEL_ID`, `META_CAPI_TOKEN`, `GA4_MEASUREMENT_ID`, `GA4_API_SECRET`,
`TIKTOK_PIXEL_ID`, `TIKTOK_ACCESS_TOKEN`. Public pixel IDs are then served to the
frontends at `GET /tracking/config`; server-side conversions forward automatically
from `POST /analytics/events`.

**Payments (Stripe, international)** — currently inert:
set `STRIPE_SECRET_KEY` (+ `STRIPE_WEBHOOK_SECRET`). Until then, `GET /payments/config`
returns `enabled:false` and `POST /payments/checkout` returns `202 {enabled:false}`
so checkout still captures orders as `unpaid` (COD/manual). No merchant gateway
is required to launch.

**Datadog** — repo already has `.github/workflows/datadog-synthetics.yml` for
synthetic uptime checks; point a test at `/health`. For APM/logs, add the Datadog
Agent as a Render add-on or use the Render↔Datadog integration (needs `DD_API_KEY`).
