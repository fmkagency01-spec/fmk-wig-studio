# W3 migration evidence — 26 September 2026 (Dhaka)

## Scope and status

Live requests were run after the Render migration to `cxmkzzcgkvhfnqtmuxam`.
Database evidence was obtained by executing SELECTs in the signed-in Supabase SQL
Editor for **fmk-wig-production**, not from the API's success response.
Three labelled smoke-test order headers remain pending in production. Do not fulfil
them. No payment was made, existing customer records were not changed, and no
production schema/env changes or deployments were performed in this task.

## Health

`GET https://fmk-wig-api.onrender.com/health`:

```json
{"ok":true,"service":"fmk-wig-api","jarvis":false,"supabase":true,"database_connectivity":"not_checked","service_role_configured":true,"mode":"server_credentials_configured"}
```

Credentials configured does not itself verify database connectivity.

## Order requests and responses

Same request body for each POST (Content-Type: application/json):

```json
{"currency":"BDT","city":"Dhaka","subtotal":8500,"items":[{"unit_price":8500,"slug":"silky-straight-human-hair-wig","name":"Silky Straight Human Hair Wig","quantity":1}],"total":8500,"customer_name":"W3-20260926-PR-VERIFY DO NOT FULFIL","customer_email":"w3-20260926@example.invalid","address_line1":"SMOKE TEST ONLY"}
```

| URL | HTTP | Actual response |
| --- | --- | --- |
| `https://fmk-wig-api.onrender.com/orders` | 201 | `{"ok":true,"order_id":"aafaf699-9e14-4b76-a695-8b656318c8cc","order_number":"FMK-MUHEZCPI"}` |
| `https://fmk-wig-api.onrender.com/ORDERS` | 201 | `{"ok":true,"order_id":"79915353-7f70-4668-86f1-9ce17b40ff47","order_number":"FMK-MUHEZDKM"}` |
| `https://fmk-wig-api.onrender.com/api/orders` | 404 | HTML error body containing `<pre>Cannot POST /api/orders</pre>` |
| `https://www.fmkwig.com/api/orders` | 201 | `{"ok":true,"order_id":"c752725b-97c8-4de8-9c29-94a7cd9db918","order_number":"FMK-MUHEZF21"}` |

`/api` is the Next.js proxy prefix, not a prefix mounted by Express on Render.

## Database evidence

Executed in project `cxmkzzcgkvhfnqtmuxam`:

```sql
select id, customer_email, total, currency, status, created_at
from public.orders
where id in (
  'aafaf699-9e14-4b76-a695-8b656318c8cc',
  '79915353-7f70-4668-86f1-9ce17b40ff47',
  'c752725b-97c8-4de8-9c29-94a7cd9db918'
) order by created_at;
```

Actual SQL result: **3 rows**. All have email `w3-20260926@example.invalid`,
total `8500`, currency `BDT`, status `pending`.

| ID | created_at (UTC) |
| --- | --- |
| `aafaf699-9e14-4b76-a695-8b656318c8cc` | `2026-09-25 20:29:29.915637+00` |
| `79915353-7f70-4668-86f1-9ce17b40ff47` | `2026-09-25 20:29:30.610752+00` |
| `c752725b-97c8-4de8-9c29-94a7cd9db918` | `2026-09-25 20:29:32.357684+00` |

Additional query:

```sql
select count(*) as test_order_items from public.order_items
where order_id in (
  'aafaf699-9e14-4b76-a695-8b656318c8cc',
  '79915353-7f70-4668-86f1-9ce17b40ff47',
  'c752725b-97c8-4de8-9c29-94a7cd9db918'
);
```

Actual result: `test_order_items = 0`. Order headers persist, but line items do not.
This is a separate checkout persistence defect; header receipts are not proof of
a complete fulfilment record. This PR does not modify order persistence.

## Inquiry request and missing schema

`POST https://fmk-wig-api.onrender.com/b2b/inquiries`:

```json
{"email":"w3-20260926@example.invalid","contact_name":"SMOKE TEST ONLY","notes":"Verification only. Do not fulfil or contact.","company_name":"W3-20260926-PR-VERIFY","items":[{"quantity":5,"slug":"silky-straight-human-hair-wig"}]}
```

Actual HTTP **503**:

```json
{"ok":false,"error":"Inquiry could not be saved. Please retry later."}
```

Direct schema query:

```sql
select to_regclass('public.b2b_inquiries')::text as b2b_table,
       to_regclass('public.inquiries')::text as inquiries_table,
       to_regprocedure('public.has_role(uuid,public.app_role)')::text as public_role_fn,
       to_regprocedure('private.has_role(uuid,public.app_role)')::text as private_role_fn;
```

Actual result: `NULL | NULL | NULL | private.has_role(uuid,app_role)`.
The new database has no inquiry table; no saved inquiry row can be claimed.
`pg_policies` confirms orders use `private.has_role(auth.uid(), 'admin'::app_role)`
for admin management and `auth.uid() = user_id` for authenticated owner inserts/reads.

## Vercel configuration evidence

Inspected the project's Environment Variables page after user-completed 2FA:
`https://vercel.com/fmk2/fmkagency01-spec-fmk-wig-studio/settings/environment-variables`.

| Variable | Observed |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://culxhuqrrtjvnnwadhgf.supabase.co`, All Environments, updated Sep 21 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Present, All Environments, updated Sep 21. A publishable key was displayed; association with the new project is not verified. |

The current application reads these exact two names in `next-app/src/lib/supabase.ts`.
Setting only `NEXT_PUBLIC_SUPABASE_ANON_KEY` will not configure this code.
The new `next-app/.env.example` records the target URL and correct variable names.
No secret values are included here.

## PR contents and rollout gate

- Focused, repeatable migration creates/restores `b2b_inquiries` without replaying
  unrelated product/analytics SQL. Existing inquiries are retained.
- Guests may INSERT only unowned, new inquiries; they cannot read them or spoof
  another user's ownership. Anonymous ownership cannot be established by email.
- Authenticated users may INSERT and read only their own inquiries. Only admins
  can manage all records. Client writes cannot set approval, quote total, or sync state.
- API derives owner from verified bearer auth, strips privileged body fields,
  awaits a matching database ID receipt, and fails on missing/mismatched receipts.
  There is no local JSON success fallback for submissions.
- Next.js attaches the existing signed-in token when submitting an inquiry.

After review/merge, the deployment owner must apply
`supabase/migrations/20260926000000_restore_b2b_inquiries.sql` to the new project,
set Vercel's URL and matching public key, rebuild/redeploy the frontend, and verify
the backend runs the merged commit. Repeat the inquiry POST and SELECT the exact
returned ID from the new database; also verify the live browser uses the new URL.

Priority 2 (wholesale approve/reject UI) remains gated on that live evidence.
This PR does not apply the migration, change Vercel settings, or implement Priority 2.

## Local validation

- API: `node --test api/wholesale.test.mjs api/submission-integrity.test.mjs api/inquiry-persistence.test.mjs` — 17 passed, 0 failed; Supabase responses mocked.
- PostgreSQL: `supabase/tests/inquiry-rls.test.mjs` executes the actual migration with PGlite 0.3.14, testing guest/owner/admin/service-role permissions and repeat application. Role/auth fixtures are local; this is not a production migration.
- Next.js contact interaction tests use Bun 1.3.14; HTTP/database responses mocked.
- Next.js TypeScript check and targeted ESLint passed.

To reproduce the PostgreSQL test without changing repository dependencies:

```powershell
npm install --prefix "$env:TEMP/fmk-inquiry-rls-runtime" --no-save --package-lock=false @electric-sql/pglite@0.3.14
$env:PGLITE_MODULE = ([System.Uri](Join-Path $env:TEMP 'fmk-inquiry-rls-runtime/node_modules/@electric-sql/pglite/dist/index.js')).AbsoluteUri
node --test supabase/tests/inquiry-rls.test.mjs
```
