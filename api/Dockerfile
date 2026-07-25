# FMK WIG — Express control-plane API (Bun runtime).
# The API uses Bun-specific features (.ts imports, import.meta.main), so it runs on Bun.
FROM oven/bun:1.3.14-slim

WORKDIR /app

# Install only what the API needs (root package.json holds express/cors/zod/supabase-js).
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile --production || bun install --production

# App source
COPY api ./api

ENV NODE_ENV=production
# Render injects PORT; the API reads API_PORT || PORT (see api/index.ts).
EXPOSE 3001

CMD ["bun", "api/index.ts"]
