# Next.js storefront (Vercel)

Production App Router frontend for FMK WIG. Shares Express API (`../api`) and Supabase project with the Lovable TanStack Start app at repo root.

## Setup

```bash
# Create .env.local using the variable list below; keep it untracked.
bun install
bun run dev                     # http://localhost:3000
```

From repo root (API + Next together):

```bash
bun run dev:next
```

## Env

Complete list read by this Next app: put local values in `next-app/.env.local`.
Never copy server secrets into `NEXT_PUBLIC_*` variables: those are public.
Use your existing Supabase values unchanged. No actual credentials are included here.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site origin. Set explicitly for production/custom domains; local development may omit it to use `http://localhost:3000`. A bare hostname receives `https://`; trailing slashes are removed. |
| `VERCEL_URL` | Vercel-provided deployment hostname; second choice when the explicit site URL is empty. Normally supplied automatically, not copied to `.env.local`. |
| `VERCEL_PROJECT_PRODUCTION_URL` | Vercel-provided production hostname; third choice. Normally supplied automatically. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable / anon key |
| `NEXT_PUBLIC_API_URL` | Express base (`/api` with rewrite) |
| `NEXT_PUBLIC_USD_PER_BDT` | Display FX rate |
| `API_PROXY_TARGET` | Express origin for rewrites (default `http://127.0.0.1:3001`) |
| `NEXT_PUBLIC_META_PIXEL_ID` | Optional public Meta pixel ID; omit to disable the script. |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Optional public GA4 measurement ID; omit to disable the script. |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | Optional public TikTok pixel ID; omit to disable the script. |

`NEXT_PUBLIC_API_URL` defaults to `/api`; `NEXT_PUBLIC_USD_PER_BDT` defaults to
`1 / 122` for display conversion. `NODE_ENV` is set by Next.js and `VERCEL` by
Vercel; do not manually set them in `.env.local`. The localhost site fallback
requires `NODE_ENV=development` and no `VERCEL` marker. Builds and production
servers without any configured site origin fail explicitly. Set the site URL
before building and rebuild after changing it. Explicit URLs must be HTTP(S)
origins without credentials, paths, query strings, or fragments.

### Shared URL consumers

`src/lib/seo.ts` owns `SITE.url` and `absUrl`. Root metadata uses `SITE.url` as
`metadataBase`, so relative canonical and Open Graph URLs on child pages resolve
against that same origin. OG/Twitter images and language alternates use `absUrl`.
Organization, WebSite, and Product JSON-LD, `src/app/sitemap.ts`, and
`src/app/robots.ts` also consume this shared configuration. Absolute external
product image URLs remain external.

### Domain audit

- Removed the hardcoded production-origin fallback from `src/lib/seo.ts`.
- Remaining localhost references are the local development instructions and
  development-only site fallback. The loopback default in `next.config.ts` is
  the Express API rewrite target, not a canonical site origin; configure
  `API_PROXY_TARGET` for a deployed API.
- No hardcoded `vercel.app` or placeholder site domains remain in the app.
  Schema.org vocabulary, analytics vendor URLs, and the existing Supabase image
  hostname are external service references and remain unchanged.
- No CORS allowlist exists in `next-app/`. The shared Express API at
  `../api/index.ts` uses `cors({ origin: true })`, reflecting any requesting
  origin rather than enforcing an allowlist. Flagged for separate review; unchanged.
