# FMK WIG × FAOS — Agent Playbook (Jarvis / Hermes / DevOps)

This is the operating manual for **FAOS workstation agents** that monitor and run
day-to-day workflows on the FMK WIG brand website. Give this file + the connection
JSON below to Jarvis when assigning the FMK WIG agent team.

---

## 1. Connection (one-time)

| Item | Value |
|---|---|
| API base URL | `https://<fmk-wig-api>.onrender.com` *(set after Render deploy)* |
| Auth header | `x-admin-key: <ADMIN_API_KEY>` |
| Health | `GET {API}/health` → `{ ok: true, service: "fmk-wig-api" }` |
| Jarvis webhook | Set `JARVIS_WEBHOOK_URL` (+ optional `JARVIS_API_KEY`) on the Render service so orders / quotes / inquiries auto-push into FAOS |

Machine-readable config: [`docs/faos-connection.example.json`](./faos-connection.example.json)

**Test the wire:**
```bash
curl -s -H "x-admin-key: $ADMIN_API_KEY" https://<API>/admin/overview | jq .
```

---

## 2. Agent roles & daily workflows

### A. Ops Monitor Agent (Hermes / monitoring)
**Schedule:** every 15–30 minutes (or on webhook).

1. `GET /admin/overview` — snapshot: orders, paid_revenue, pending, inquiries, analytics, integrations.
2. Alert if:
   - `orders.pending` grows for > 24h without status change
   - `integrations.supabase` or `integrations.jarvis` flips to false
   - `health` fails 2× in a row
3. `GET /admin/analytics/summary` — traffic / lead-origin trends for daily standup report.

### B. Order Tracker Agent
**Trigger:** new order event (Jarvis webhook type `order`) or poll `GET /admin/orders`.

1. Read new orders (`status=pending`, `payment_status=unpaid|paid`).
2. Update fulfillment in FAOS board.
3. When shipped/delivered: `PATCH /orders/:id/status` with `{ "status": "shipped" }` (or `delivered` / `cancelled`).
4. Escalate COD confirmations older than 48h.

### C. Lead / Wholesale Agent
**Trigger:** Jarvis webhook type `b2b_inquiry` or `quote`, or poll `GET /b2b/inquiries` (JWT) / overview `inquiries.recent`.

1. Qualify lead (company, country, estimated_total, items).
2. Open CRM task in FAOS; assign sales owner.
3. Respond within SLA (recommend: 4 business hours for international).

### D. Ads / Growth Agent
**Inputs:** `/admin/analytics/summary` + pixel destinations (Meta / GA4 / TikTok).

1. Watch `by_event` for `purchase`, `b2b_inquiry_submitted`, `add_to_cart`, `product_view`.
2. Watch `by_lead_origin` (google / facebook / linkedin / direct / utm_*).
3. Pause underperforming ad sets; boost creatives that convert to inquiry/purchase.
4. Server-side conversions already forward from `POST /analytics/events` when pixel tokens are set — do **not** double-count client + server unless using dedupe `event_id`.

### E. Content / Catalog Agent
1. Product CRUD stays in Supabase (admin role) or admin UI at `/admin` on the Next.js site.
2. After catalog changes: authenticated `POST /jarvis/sync-catalog` pushes wholesale catalog to FAOS.
3. Keep SEO fields (title/description/images) filled — sitemap regenerates hourly.

### F. DevOps / Reliability Agent
1. Uptime: hit `/health` from Datadog synthetics (tag `e2e-tests`) or FAOS cron.
2. Secrets: never commit; rotate `ADMIN_API_KEY` via Render env + update FAOS vault.
3. Datadog: set GitHub Actions secrets `DD_API_KEY` + `DD_APP_KEY` so `.github/workflows/datadog-synthetics.yml` passes.
4. On deploy: verify `/health`, `/tracking/config`, `/payments/config`, `/admin/overview`.

---

## 3. API cheat sheet

```
GET  /health
GET  /tracking/config
GET  /payments/config
GET  /catalog/wholesale
POST /analytics/events
POST /quotes/instant
POST /b2b/inquiries
POST /orders
GET  /admin/overview              # x-admin-key OR admin JWT
GET  /admin/orders
GET  /admin/analytics/summary
GET  /orders/:id
PATCH /orders/:id/status          # { status?, payment_status? }
POST /jarvis/sync-order           # JWT
POST /jarvis/sync-catalog         # JWT
```

---

## 4. Frontend surfaces agents should know

| URL | Purpose |
|---|---|
| `/` `/shop` `/product/[slug]` | Retail storefront |
| `/wholesale` | Instant quote + B2B inquiry |
| `/checkout` | Order capture (COD until Stripe on) |
| `/admin` | Human ops dashboard (admin role) |
| `/contact` | General + wholesale contact |

---

## 5. Jarvis command template (paste to assign team)

> Assign FMK WIG agent team:
> - Ops Monitor: poll `{API}/admin/overview` every 15m with `x-admin-key`, alert on pending backlog / health fail.
> - Order Tracker: process Jarvis `order` webhooks; update status via `PATCH /orders/:id/status`.
> - Lead Agent: process `b2b_inquiry` + `quote` webhooks; CRM follow-up within 4h.
> - Ads Agent: use analytics summary + Meta/GA4/TikTok; optimize to inquiry & purchase.
> - DevOps: keep Render API + Vercel frontend green; Datadog synthetics on `/health`.
>
> Connection pack: `docs/FAOS_AGENT_PLAYBOOK.md` + `docs/faos-connection.example.json`.
