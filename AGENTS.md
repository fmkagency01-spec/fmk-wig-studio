<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Cursor Cloud specific instructions

### Stack (intentional dual frontend)
- **Lovable editor frontend:** TanStack Start + Vite at repo root (do not remove — Lovable sync depends on it).
- **Production / Vercel frontend:** Next.js 15 App Router in `next-app/` (retail + wholesale + JWT auth UI).
- **Backend API:** Express on port `3001` (`api/index.ts`). Proxied at `/api` from both Vite and Next rewrites.
- **Data:** Hosted Supabase (see root `.env` and `next-app/.env.local`). Apply `supabase/migrations/20260722094500_fmk_b2b_analytics_attrs.sql` in the Supabase SQL editor when ready; product filters also work via `src/lib/product-attributes.ts` / `next-app/src/lib/product-attributes.ts` without that migration.
- **Auth:** Supabase Auth JWTs. Express `requireJwt` middleware verifies `Authorization: Bearer <access_token>`.

### Run locally
- Prefer `bun` (`bun.lock` + `bunfig.toml`).
- Lovable/Vite stack: `bun install` then `bun run dev` → http://localhost:8080 + API :3001
- Next.js stack: `bun install && cd next-app && bun install` then from root `bun run dev:next` → http://localhost:3000 + API :3001
- API health: `http://localhost:3001/health`

### Backend control plane (monitoring / orders / tracking / payments)
- The Express API (`api/`) is the stack-agnostic control plane shared by both frontends + FAOS. Endpoints beyond the storefront ones:
  - Monitoring (guarded by `x-admin-key: $ADMIN_API_KEY` **or** admin Bearer JWT — see `api/lib/adminAuth.ts`): `GET /admin/overview`, `GET /admin/orders`, `GET /admin/analytics/summary`, `GET /orders/:id`, `PATCH /orders/:id/status`.
  - Orders: `POST /orders` (headless capture; optional JWT attaches `user_id`). Writes to local `api/data/orders.json` + attempts Supabase insert.
  - Server-side tracking (`api/lib/tracking.ts`): `POST /analytics/events` forwards to Meta CAPI / GA4 MP / TikTok Events API — **env-gated, no-op until IDs/tokens set**. `GET /tracking/config` exposes public pixel IDs to the frontends.
  - Payments (`api/lib/payments.ts`): `GET /payments/config`, `POST /payments/checkout` — Stripe adapter, **inert until `STRIPE_SECRET_KEY` set** (returns `202 {enabled:false}` so orders still capture as `unpaid`).
- Env vars for these live in `.env.example` (ADMIN_API_KEY, META_/GA4_/TIKTOK_, STRIPE_*). `ADMIN_API_KEY` must be set or the shared-secret path is disabled (JWT still works).
- Deploy: Render Blueprint via `render.yaml` + `api/Dockerfile` (Bun runtime). Full guide: `docs/DEPLOY_RENDER.md`. The API reads `API_PORT || PORT` so it binds Render's `PORT`.
- Full monitoring of Supabase-backed orders/analytics needs `SUPABASE_SERVICE_ROLE_KEY` (publishable key is RLS-limited); the local JSON store always works for overview.

### Vercel
- Set project Root Directory to `next-app` (recommended), or use root `vercel.json` install/build commands.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`, optional `JARVIS_WEBHOOK_URL`, `JARVIS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `USD_PER_BDT`.
- Express API should be deployed as a separate Node service (or Railway/Render) and pointed to by `NEXT_PUBLIC_API_URL` / rewrite target — local rewrites assume `API_PROXY_TARGET=http://127.0.0.1:3001`.

### Gotchas
- Lint on the TanStack root (`bun run lint`) currently fails on many pre-existing Prettier issues; tooling itself works. Prefer `bun run lint:next` for the Next app.
- Set `JARVIS_WEBHOOK_URL` (and optional `JARVIS_API_KEY`) for Jarvis Common Center pushes; without them, sync calls succeed as `{ skipped: true }`.
- Analytics/B2B inquiries always persist under `api/data/` (gitignored). They also attempt Supabase inserts when the migration is applied.
- Multi-currency is **display FX** (BDT base → USD via `VITE_USD_PER_BDT` / `NEXT_PUBLIC_USD_PER_BDT`); cart line prices remain BDT numbers.
- Env templates: `.env.example` (root) and `next-app/.env.local` (do not commit secrets).
- `next-app/.env.local` is gitignored (no template is committed) and is **not** recreated by the update script. The Next app loads env only from its own dir, so create it with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (mirror root `.env`), plus optional `NEXT_PUBLIC_API_URL=/api`, `NEXT_PUBLIC_USD_PER_BDT`, `API_PROXY_TARGET=http://127.0.0.1:3001`. Without it the Next pages still render but Supabase auth/data calls fail.
- Port note: `bun run dev` (Vite) and `bun run dev:next` both start the API on `:3001`, so don't run both at once. To run the Vite and Next frontends together, start one full stack (e.g. `bun run dev:next`) and add the other frontend only via `bun run dev:web` (Vite, no API).
- Lovable MCP project import (`a65f329d-…`) requires authenticating the Lovable MCP server in Cursor; until then we refine the in-repo Lovable components directly.
