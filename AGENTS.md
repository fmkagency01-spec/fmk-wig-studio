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

### Stack (intentional)
- **Frontend:** TanStack Start + Vite (Lovable template) — kept instead of a full Next.js rewrite so Lovable sync stays intact.
- **Backend API:** Express on port `3001` (`api/index.ts`), proxied at `/api` during `bun run dev`.
- **Data:** Hosted Supabase (see `.env`). Apply `supabase/migrations/20260722094500_fmk_b2b_analytics_attrs.sql` in the Supabase SQL editor when ready; product filters also work via `src/lib/product-attributes.ts` without that migration.
- **Auth:** Supabase Auth JWTs. Express verifies with `Authorization: Bearer <access_token>` via `supabase.auth.getUser`.

### Run locally
- Prefer `bun` (`bun.lock` + `bunfig.toml`). Use `bun install` then `bun run dev` (starts web + API via concurrently).
- Web-only: `bun run dev:web`. API-only: `bun run api:dev`.
- App: `http://localhost:8080`. API health: `http://localhost:3001/health` (or `/api/health` through the Vite proxy).

### Gotchas
- Lint (`bun run lint`) currently fails on many pre-existing Prettier formatting issues in the repo; tooling itself works.
- Set `JARVIS_WEBHOOK_URL` (and optional `JARVIS_API_KEY`) for Jarvis Common Center pushes; without them, sync calls succeed as `{ skipped: true }`.
- Analytics/B2B inquiries always persist under `api/data/` (gitignored). They also attempt Supabase inserts when the migration is applied / keys allow it.
- Multi-currency is **display FX** (BDT base → USD via `VITE_USD_PER_BDT`); cart line prices remain BDT numbers.
- Env template: `.env.example`. Do not commit secrets.
