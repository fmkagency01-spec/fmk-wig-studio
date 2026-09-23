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

### FAOS / Jarvis agent ops
- Connection pack + daily workflows for FAOS agents (monitor, orders, leads, ads, devops): `docs/FAOS_AGENT_PLAYBOOK.md` and `docs/faos-connection.example.json`.
- Agents authenticate with `x-admin-key: $ADMIN_API_KEY` against the Render API. Set `JARVIS_WEBHOOK_URL` on Render so orders/quotes/inquiries auto-push into FAOS.
- Next.js storefront falls back to a local catalog (`next-app/src/lib/catalog-fallback.ts`) if Supabase RLS/network fails — so a DB grant issue never blanks the brand site. Still apply `supabase/migrations/20260725091500_fix_anon_storefront_has_role_grants.sql` for live DB product data.

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

## Multi-agent division of labor

- **Claude ("Jarvis"):** Owns cross-repository strategy, Vercel projects, domains and DNS, business email, and infrastructure decisions. Jarvis operates cloud-side and has no shell access on this machine.
- **Codex:** Handles local or VPS execution when asked, code changes, Git branches, and pull requests. Codex must never push directly to `main`, force-push, or rewrite Lovable-synced history.
- **Cursor / Cursor Cloud:** Handles ongoing frontend and UI iteration according to the existing **Cursor Cloud specific instructions** section above.
- **Shared coordination rule:** Whoever starts work on a branch must announce it before another agent touches the same files.

## FMK Multi-Agent Operating Rules (added 2026-09-23)

### Boundaries
- You are ONE of four agents on this codebase: Codex (you), Claude Code, Claude/Cowork ("Jarvis"), Cursor.
- Never push to `main`. One branch per fix, then a PR — plain-English summary first (the founder is non-technical), then the technical diff-stat.
- Never trigger a deploy or flip production state yourself. You fix and open a PR; Jarvis verifies against real deploy logs.
- Never start work in a file area another agent has announced. If a task needs files outside your assignment, stop and ask.
- An audit-only task means findings only. Report them; change nothing.
- Nothing is reported as "done" on your own say-so. Deploy id, merge SHA, or real command output — or it didn't happen.
- Do not use connector-based publishing for large files — it silently truncated a 423-line section of backend/main.py mid-PR on the FAOS repo. Use real `git push`.

### FMK WIG specifics
- `SUPABASE_SERVICE_ROLE_KEY` is MISSING and has not been located. Privileged endpoints — order writes, wholesale quote approval, admin actions — must fail GRACEFULLY with a clear error. Never fake success, never stub a canned "ok" response to make a flow look like it works. A checkout that silently pretends to succeed is worse than one that visibly fails.
- The correct Supabase project is `culxhuqrrtjvnnwadhgf` (Lovable Cloud — a fully managed instance, not a normal supabase.com login). `qsaxnuattjjwmqnjjgka` is the wrong, empty auto-created project — ignore it.
- Backend lives in `api/` and deploys to Render as `fmk-wig-api` (srv-daop3ujtqb8s73e12glg) via blueprint_sync, Docker, health check `/health`.
- Frontend is Next.js 15 in `next-app/`, deployed to Vercel at fmkwig.com.

### Every session ends with this block, verbatim
### LOG — FMK WIG (CODEX) — <date>
Branch/PR: <branch name, PR number, or "none">
Did: <what actually ran, with real output — not intent>
Found: <findings, if an audit task>
Blocked: <what, on whom>
Next: <the single next step>
