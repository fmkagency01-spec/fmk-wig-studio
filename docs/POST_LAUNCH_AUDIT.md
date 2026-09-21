# FMK WIG post-launch audit — 2026-09-21

Scope: production fmkwig.com, backend wiring readiness, catalog provenance, optional integrations and basic browser QA. No domain, DNS, Vercel settings, secrets or production database changes were made during this audit.

## Verified live findings

| Check | Evidence / outcome |
| --- | --- |
| Storefront | fmkwig.com redirects to www.fmkwig.com; homepage, shop and one product detail page render. |
| Render inventory | Confirmed workspace `My Workspace` (`tea-d9cktq61a83c7399mf50`) contains only `faos-backend` and the suspended `faos-autonomous-tick`. No FMK WIG API service exists. Do not point FMK WIG at the unrelated FAOS backend. |
| Backend reachability | GET `/api/health` and `/api/tracking/config` return 404. Clicking **Get indicative estimate** on `/wholesale` shows **Failed to generate quote**. End-to-end inquiry/order success is NOT verified. No customer order or inquiry was submitted. |
| Live public Supabase configuration | The storefront's referenced public JavaScript bundles contain `https://qsaxnuattjjwmqnjjgka.supabase.co`. Its public key was used only for read-only catalog requests, never printed or committed. |
| Products and categories | Both public REST reads return HTTP 404 / `PGRST205`, “Could not find the table ... in the schema cache”. This proves these tables are unavailable to this storefront API, not that an administrator could find no physical tables anywhere. |
| Catalog source | Currently **fallback catalog**, not live Supabase catalog. The failed live API calls cause the paths in `next-app/src/lib/supabase.ts` to select `catalog-fallback.ts`; rendered six products, prices, category names and fallback product description match that file. Rows visible in the UI are not evidence of actual database inventory. |
| Project mismatch to resolve | `next-app/next.config.ts` and historical repo configuration also refer to `culxhuqrrtjvnnwadhgf`. Confirm the intended FMK WIG Supabase project before changing URLs or applying migrations. Do not apply WIG migrations to an unrelated FAOS project. |
| Organization logo | `/logo.png` returns 404 and no such asset is present in `next-app/public`. `next-app/src/lib/seo.ts` currently references it in Organization JSON-LD. An approved logo asset is required. |
| Open Graph / Twitter | These use `/hero-model.jpg`, **not** logo.png; that JPEG returns 200. See `next-app/src/app/layout.tsx`. |
| robots.txt | HTTP 200 text/plain; allows public pages, excludes account/admin/cart/checkout/auth and links the canonical sitemap. |
| sitemap.xml | HTTP 200 XML with 14 URLs: 3 static, 5 categories, 6 products. Product/category entries currently inherit the fallback catalog. Sitemap generation is not proof of database connectivity. |
| Browser console | No captured error/warn entries on homepage, shop and `/product/silky-straight-human-hair-wig` during this session. Caught API errors can still show UI failures without console output. This is a smoke test, not exhaustive browser/device coverage. |

## Environment variable / feature map

Vercel's environment page required login and the project connector returned a schema-validation error. Therefore the exact deployed key inventory and empty/nonempty state could not be independently read. “Blank” values below are user-reported; this table maps all corresponding repository variables to actual code. Values were not revealed, invented or filled.

**Critical placement:** Next.js executes on Vercel; `api/` Express executes on Render. Putting an Express-only secret in Vercel does not configure Render. Do not prefix server secrets with `NEXT_PUBLIC_`.

| Variable(s) | Where needed | Implementation and next requirement |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Vercel production build | Used by `next-app/src/lib/analytics.ts` and `orders.ts`; blank falls back to `/api`. Set to the verified HTTPS backend origin (no trailing slash) after deployment. Rebuild is required for client bundles to pick it up. This is the only Vercel env change authorized for backend wiring. |
| `API_PROXY_TARGET` | Vercel, only when intentionally using same-origin `/api` | `next.config.ts` rewrite destination; defaults to local `127.0.0.1:3001`, not a deployed Express server. Direct `NEXT_PUBLIC_API_URL` avoids this browser path. No change made. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel | Real Supabase client is wired in `next-app/src/lib/supabase.ts`. Must identify the intended project and expose populated catalog tables under correct RLS. Public credentials alone do not create tables. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Render | Wired in `api/lib/supabase.ts`. Production B2B inquiry requires a service-role key and acknowledged insert into `b2b_inquiries`. User must supply the key directly in Render after confirming the correct project. |
| `SUPABASE_PUBLISHABLE_KEY` | Render, optional public fallback | Client can authenticate/read permitted data; **not sufficient** for the production B2B inquiry guard. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | Lovable/Vite root frontend | Root frontend configuration, not Next.js public variable names. Backend supports the URL/key fallback names but these should not replace deliberate production config. |
| `ADMIN_API_KEY` | Render | Real control-plane guard in `api/lib/adminAuth.ts`; alternatively a verified Supabase user must have `user_roles.role=admin`. User must configure a strong server secret or verified admin operator. Never put this in frontend code. |
| `STRIPE_SECRET_KEY` | Render | Real Stripe Checkout Sessions REST adapter exists in `api/lib/payments.ts` and checkout UI calls it. **Not payment-ready merely by filling a key**: amount/order verification and secure settlement workflow require work. Keep blank for inquiry/order-request launch. |
| `STRIPE_WEBHOOK_SECRET` | Not currently consumed | Placeholder only: present in templates/Blueprint, but no signature-verifying Stripe webhook route or paid-order reconciliation implementation exists. A real value alone does nothing. |
| `DEFAULT_CURRENCY` | Render | Read by `paymentConfig()`; defaults to USD. Does not select the storefront currency or establish exchange rates. Not a secret. |
| `META_PIXEL_ID`, `META_CAPI_TOKEN` | Render | Actual Meta CAPI HTTP forwarder in `api/lib/tracking.ts`; both needed. Current code uses Graph v19.0, relative page URLs and only HTTP-level success checks. Validate supported API version, event data and receipt before enabling; not certified production-ready. |
| `GA4_MEASUREMENT_ID`, `GA4_API_SECRET` | Render | Actual GA4 Measurement Protocol forwarder; both needed for server events. HTTP response alone is not proof GA4 accepted the event. Verify with test/debug events before launch. |
| `TIKTOK_PIXEL_ID`, `TIKTOK_ACCESS_TOKEN` | Render | Actual TikTok Events API forwarder; both needed. Application-level response validation/delivery verification remains necessary. |
| `NEXT_PUBLIC_META_PIXEL_ID` | Vercel | Actual browser Meta script and event calls in `TrackingScripts.tsx` / `analytics.ts`; requires a real public Pixel ID and approved tracking/consent configuration. The unprefixed Render ID does not activate this component. |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Vercel | Actual browser gtag loader and route events. Supply the public G-ID only when ready to enable tracking. |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | Vercel | Actual browser TikTok script and route events. Supply the public pixel ID only when ready to enable tracking. |
| `JARVIS_WEBHOOK_URL`, `JARVIS_API_KEY` | Render | Actual HTTP POST transport in `api/lib/jarvis.ts`; URL and receiving endpoint contract required, bearer key optional in sender but should follow receiver auth. Requires HTTP success plus JSON `ok:true`; timeout/failure is not synced. No retries/durable delivery queue or proof of downstream orchestration completion. User must identify endpoint and supply required key. |
| `USD_PER_BDT` | Render | Backend quote conversion; defaults to approximately 1/122. Not a secret, and must match approved FX policy. |
| `NEXT_PUBLIC_USD_PER_BDT` | Vercel | Next storefront display conversion. Does not change BDT base cart calculations. |
| `VITE_USD_PER_BDT`, `VITE_API_URL` | Lovable/Vite | Equivalent root frontend settings, not Next.js environment names. |
| `NEXT_PUBLIC_SITE_URL` | Vercel | SEO canonical origin, already configured by user; leave unchanged. |
| `NODE_ENV`, `PORT`, `API_PORT` | Render | `NODE_ENV=production`; Render supplies PORT; server listens on `0.0.0.0`. Avoid overriding PORT unnecessarily. |
| `FMK_DATA_DIR` | Render/local API | Local JSON file storage path. Setting a path does not make Render filesystem durable. Retail orders/analytics still use local JSON paths and require durability work. |

## Do not enable payment/tracking blindly

- Checkout currently emits `purchase` immediately after order creation, before Stripe payment confirmation. This is not collected revenue.
- The product UI emits `product_view`, while server event mapping expects `view_product`; browser/server event mapping and deduplication need validation.
- Browser pixels are loaded from public env flags, not from `/tracking/config`. Server credentials in Vercel therefore do not switch them on.
- Retail `/orders` still trusts customer amounts and writes local JSON. This is separate from the guarded durable B2B inquiry path. Do not interpret successful order HTTP response as payment settlement or restart-safe storage.
- No live payment, advertising integration, database migration or external notification was enabled by this audit.

## Next steps and owners

1. Founder confirms Free initial test deployment versus the Blueprint's paid Starter recurring plan. No additional paid resource was created without this decision.
2. Deploy the existing `api/Dockerfile` from main in confirmed Render workspace; Docker creation is not supported by the currently exposed Render create-service tool, so use the Render Dashboard Blueprint flow if needed. Do not substitute the FAOS Python backend.
3. Founder confirms the intended Supabase project, then enters backend secret values directly in Render. Validate migrations and populated catalog before migration/write operations; no secrets in chat.
4. Once backend health and durable inquiry storage are ready, set only storefront `NEXT_PUBLIC_API_URL` to its actual URL and redeploy. Domain/DNS/project settings remain unchanged.
5. Perform one clearly labelled test inquiry/order request, verify its ID in durable storage and operator visibility. Until then, end-to-end business success remains blocked, not completed.
6. Supply the approved brand logo for `/logo.png`; separately address catalog provenance visibility and unfinished payment/tracking paths before enabling those features.
