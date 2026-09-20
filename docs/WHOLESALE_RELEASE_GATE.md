# Wholesale release gate

Scope: inquiry and quotation/order request, not online payment or automatic order acceptance.

## This change

- Server catalog prices override customer-provided prices. Unknown products and below-MOQ estimates are rejected.
- Estimates explicitly require staff confirmation. Customer totals and line prices are not stored as authoritative quotations.
- Customer JWTs cannot access admin controls, all inquiries, or analytics. Server-side `user_roles` must contain `admin` (or trusted server automation supplies `ADMIN_API_KEY`).
- Production inquiry success requires an acknowledged Supabase insert with a stable inquiry ID. Database failure returns 503; ephemeral JSON fallback is development-only.
- Missing, failed, or unacknowledged Jarvis delivery is not marked synced. Notification failure does not erase a saved inquiry.

## Before merge/deployment

1. Confirm deployed API uses `NODE_ENV=production`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service-role key in browser variables. Frontend API proxy must target that API.
2. Verify `b2b_inquiries` migrations and the intended operator's `user_roles` admin membership. Existing local JSON inquiries need reconciliation before switching reads to the database; do not delete them.
3. Approve real product/pricing/MOQ/availability data. Current hardcoded catalog is not newly verified by these changes.
4. Perform one clearly labelled live test inquiry with consent, confirm matching database ID, admin visibility after a restart, and the agreed operator notification. No live test/customer notification was sent by local tests.
5. Staff-issued final quotation, customer acceptance, and order-request status transitions still need acceptance testing. No online payment enabled here.

## Verification

`node --test api/wholesale.test.mjs` uses mocked Supabase and temporary local storage; no production service calls.
`npx tsc --noEmit --strict --allowImportingTsExtensions --module nodenext --moduleResolution nodenext --target es2022 --esModuleInterop --skipLibCheck api/index.ts`

The existing npm lockfile was already stale against package.json; Bun is the repository's canonical installer. This PR does not regenerate unrelated dependency locks.
