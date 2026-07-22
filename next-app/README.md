# Next.js storefront (Vercel)

Production App Router frontend for FMK WIG. Shares Express API (`../api`) and Supabase project with the Lovable TanStack Start app at repo root.

## Setup

```bash
cp ../.env.example .env.local   # then rename VITE_* → NEXT_PUBLIC_* as needed
bun install
bun run dev                     # http://localhost:3000
```

From repo root (API + Next together):

```bash
bun run dev:next
```

## Env

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable / anon key |
| `NEXT_PUBLIC_API_URL` | Express base (`/api` with rewrite) |
| `NEXT_PUBLIC_USD_PER_BDT` | Display FX rate |
| `API_PROXY_TARGET` | Express origin for rewrites (default `http://127.0.0.1:3001`) |
