# Public-key-only deployment pass (2026-09-22)

Use the existing Starter Blueprint with the founder-confirmed Supabase URL
`https://culxhuqrrtjvnnwadhgf.supabase.co` and publishable key entered in Render.
Leave `SUPABASE_SERVICE_ROLE_KEY` unset. Do not obtain elevated keys by alternate means.
Do not change Vercel, DNS, or the plan. Deployment is not yet verified.

## Live public REST evidence

- `GET /rest/v1/categories?select=id,slug,name`: HTTP 200, `Content-Range: 0-4/5`.
  Five actual database rows returned, not the local fallback.
- `GET /rest/v1/products?select=id,slug,name`: HTTP 401, PostgreSQL code `42501`,
  `permission denied for function has_role`. Six products are NOT verified.
- These results supersede the earlier DNS failure. They do not verify which
  database the deployed Next.js storefront is currently using.
- Existing migration `supabase/migrations/20260725091500_fix_anon_storefront_has_role_grants.sql`
  addresses this error. An authorized Lovable database operator must review/apply
  it in the confirmed project and rerun the public read; the publishable key cannot
  execute DDL. No migration or elevated-key lookup was attempted in this pass.

## Blocked on service_role

In production without a nonblank server credential, the API now returns HTTP 503,
`ok:false`, `code:blocked_on_service_role` and logs method/path (not customer data)
before running these handlers:

- `POST /orders`, `GET /orders/:id`, `PATCH /orders/:id/status`
- `POST /b2b/inquiries`, `GET /b2b/inquiries`
- `GET /admin/overview`, `/admin/orders`, `/admin/analytics/summary`
- `POST` and `GET /analytics/events`
- `POST /payments/checkout`
- `POST /jarvis/sync-order`, `/jarvis/sync-catalog`

No local JSON writes, fabricated admin results, payment calls, or notification
side effects are used to simulate completion on those blocked routes.
This guard is not a claim that providing a key alone fixes existing retail-order
durability, price validation, or local-store admin reporting.

`GET /health` is process liveness only and explicitly reports
`database_connectivity:not_checked`, credential presence and public-only mode.
It is not database readiness. Public tracking/payment configuration stays available.
`POST /quotes/instant` remains an explicitly indicative estimate from the static
server price list, not an approved quotation. `/catalog/wholesale` is also static,
not evidence of Supabase products. No quotation-approval endpoint is implemented.

## Logo

No identified FMK WIG logo asset is available in the repository public assets.
Do not rename a product photo or template favicon to `logo.png`; an approved
brand PNG/SVG is required. Organization JSON-LD's missing logo remains unresolved.
