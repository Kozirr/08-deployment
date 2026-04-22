# syntax=docker/dockerfile:1.7
# Multi-stage build for self-host parity with the Vercel deploy. The actual
# production deploy uses Vercel's build pipeline; this Dockerfile exists so
# the same image can be run on any container host (AWS, Fly, Render, etc.)
# and so local `docker compose up` can reproduce the prod runtime.

# ─── deps: install node_modules with a clean lockfile ───────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# `npm ci` runs `postinstall` → `prisma generate`, which needs the schema.
RUN npm ci --no-audit --no-fund

# ─── builder: compile the Next.js standalone bundle ────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `prisma generate` is idempotent; re-running here is cheap and guarantees the
# client matches the schema even when building from a cached deps layer.
RUN npx prisma generate && npm run build

# ─── runner: minimal runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
