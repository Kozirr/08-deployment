# Enterprise Deployment Platform — Tempo

Production-grade Vercel deployment of **Tempo**, the music-streaming platform
built in [Project 07](../../07/07-backend-integration). Adds CI/CD automation,
observability, multi-environment strategy, and compliance scaffolding around an
otherwise unchanged application.

- **Live production URL:** `https://tempo.example.dev` (placeholder — set to
  your own custom domain)
- **Repository:** single Git repo, deployed to Vercel via GitHub Actions
- **Base platform:** Next.js 16 App Router · React 19 · TypeScript 5 · Prisma 5
  · Tailwind v4 · hand-rolled JWT auth

---

## Why this project exists

Project 05 built the Spotify-flavoured design system. Project 07 wired a full
backend behind it (Prisma + Postgres-shaped models on SQLite, JWT auth with
reuse detection, HMAC-verified billing webhooks, DRM-style entitlements,
RBAC). **Project 08 ships that backend.** The task is not to re-architect
Tempo — it's to take the exact same code and make it deploy safely, recover
quickly, and be observable once real traffic is hitting it.

The rubric asks specifically about Vercel platform engineering, so Vercel is
the primary target. The repo also keeps a Dockerfile + `docker-compose.yml`
for self-host parity.

## Platform choice rationale

| Contender           | Why it fits                                                       | Why it's secondary                                                                |
| ------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Vercel**          | First-class Next 16 support, per-PR preview deploys, edge regions, integrated Analytics + Speed Insights, zero-config GitHub flow. | Vendor-specific; function time limits on free tier; no long-running workers.      |
| Netlify             | Good static/JAMstack story, mature redirect rules.                | Weaker Next App Router support; serverless functions are a second-class add-on.   |
| AWS Amplify         | If you're already all-in on AWS, the identity story is strongest. | Build pipeline is slow; SSR support trails Vercel; config lives in the console.   |
| Self-host (Docker)  | No vendor lock-in; works on any host; parity across environments. | Every capability (edge routing, rate limiting, secrets) you get free from Vercel has to be rebuilt. |

**Picked:** Vercel for primary hosting, Neon for the database (per-branch
ephemeral DBs match Vercel preview deploys), Upstash for distributed rate
limiting, Vercel Blob for uploads, Sentry for error tracking.

## Stack

- **Runtime:** Next.js 16.2.3 App Router (React 19.2.4, TypeScript 5, Tailwind v4)
- **Auth:** hand-rolled JWT via `jose` + `bcryptjs`, DB-backed sessions, refresh-token reuse detection
- **Database:** Neon Postgres (was SQLite in 07 — swapped here)
- **Cache / rate limit:** Upstash Redis via `@upstash/ratelimit`
- **File storage:** Vercel Blob (was `public/uploads/` in 07 — swapped here)
- **Observability:** Vercel Analytics + Speed Insights, Sentry (`@sentry/nextjs`), pino server logs
- **CI/CD:** GitHub Actions (ci · preview · production · lighthouse · security)
- **Container parity:** multi-stage `Dockerfile` + `docker-compose.yml`

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                Vercel                                    │
│                                                                          │
│   ┌─────────────┐   proxy.ts (edge)   ┌──────────────────────┐           │
│   │  fra1 edge  │ ───────────────────▶│  Node functions      │           │
│   │  + CDN      │   auth / rate-lim   │  (pages + API)       │           │
│   └─────────────┘   request-id        └──────────────────────┘           │
│                                                │                          │
└────────────────────────────────────────────────┼──────────────────────────┘
                                                 │
                           ┌─────────────────────┼─────────────────────┐
                           ▼                     ▼                     ▼
                    ┌──────────┐          ┌───────────┐         ┌───────────┐
                    │   Neon   │          │  Upstash  │         │  Vercel   │
                    │ Postgres │          │   Redis   │         │   Blob    │
                    └──────────┘          └───────────┘         └───────────┘
                    (schema,               (rate limit           (playlist
                     sessions,              buckets,              covers)
                     audit log)             auth+global+write)

                                  Telemetry
                          ┌────────────────────────┐
                          │ Sentry  ·  Analytics   │
                          │         ·  Speed Insights
                          └────────────────────────┘
```

### Key Vercel properties we lean on

- **Standalone build** — `next.config.ts → output: 'standalone'` gives the
  Dockerfile a minimal runner image and speeds up cold starts on Vercel.
- **Regions** — primary region `fra1` (Frankfurt). Edge-runtime for the
  `proxy.ts` middleware so auth + rate-limit happen close to the user.
- **Filesystem is ephemeral** — no feature in the app writes to disk. Uploads
  go to Vercel Blob; logs go to the log drain; the DB is Neon.
- **Secrets live in Vercel env** — pulled locally via `vercel env pull`.
- **Cron jobs** — `vercel.json` declares a nightly audit-retention sweep.
- **Function `maxDuration`** — bumped to 30 s for webhooks and admin routes.

## Getting started (local development)

```bash
# 1. Install
npm ci                              # postinstall runs `prisma generate`

# 2. Start Postgres
docker compose up -d db

# 3. Environment
cp .env.example .env.local
# Edit .env.local — set POSTGRES_PRISMA_URL to postgres://tempo:tempo@localhost:5432/tempo
# Generate JWT + webhook secrets: openssl rand -base64 48

# 4. Database
npx prisma migrate deploy            # applies the Postgres baseline
ALLOW_SEED=true npm run db:seed      # seeds catalog + demo users, prints passwords

# 5. Run
npm run dev                          # http://localhost:3000
```

**Health check:** `curl http://localhost:3000/api/health` should return `{ ok: true, db: "up" }`.

## Deploying to Vercel

See [`docs/environments.md`](./docs/environments.md) for the full env-var matrix
and per-environment setup. The short version:

```bash
# One-time: link this repo to a Vercel project
vercel link

# Set secrets (production + preview scopes)
vercel env add POSTGRES_PRISMA_URL production
vercel env add POSTGRES_URL_NON_POOLING production
vercel env add JWT_ACCESS_SECRET production
vercel env add JWT_REFRESH_SECRET production
vercel env add WEBHOOK_SECRET production
vercel env add CRON_SECRET production
vercel env add NEXT_PUBLIC_SENTRY_DSN production
# ...repeat for preview

# Deploy
git push origin main                 # triggers .github/workflows/production.yml
```

GitHub Actions handles preview deploys on every PR (see
`.github/workflows/preview.yml`) and only allows production deploys through
the `production` environment's required-reviewer gate.

## CI/CD pipeline

| Workflow        | Trigger                          | What it does                                                                  |
| --------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `ci.yml`        | PR, non-`main` push              | `npm ci` → `prisma validate` → ESLint → Stylelint → `tsc --noEmit` → `next build` |
| `preview.yml`   | PR open/sync                     | `vercel build && vercel deploy`, comments preview URL on the PR               |
| `production.yml`| Push to `main` + manual approval | Re-runs `ci.yml`, then `vercel deploy --prod`, then `curl /api/health`        |
| `lighthouse.yml`| PR open/sync                     | Audits preview URL against `lighthouserc.json` budgets                        |
| `security.yml`  | PR + weekly cron                 | `npm audit`, dependency review, CodeQL                                        |

Branch protection (configured on GitHub, not in the repo):

- Required status checks: `ci`, `lighthouse`, `security`.
- Required approving reviews: 1.
- Require linear history.
- Require `CODEOWNERS` review for `prisma/` and `src/lib/auth/`.

## Observability

- **Core Web Vitals** — Vercel Speed Insights (LCP, INP, CLS, TTFB).
- **Product analytics** — Vercel Analytics (privacy-friendly, no cookies).
- **Errors** — Sentry with source maps, session replay on error only,
  privacy-safe masking.
- **Custom spans** — `canPlayTrack` (the DRM hotspot) is wrapped in a Sentry
  span so gate decisions are traceable per request.
- **Structured logs** — pino on the server; JSON lines go to Vercel log drains,
  pretty-printed locally. All logs include a `service`, `env`, `region` base
  context and redact `cookie`, `authorization`, and password-shaped fields.
- **Health probe** — `GET /api/health` does `SELECT 1` on Postgres and returns
  `{ ok, db, commit, env, region }` with a 200/503 status.
- **Request correlation** — `x-request-id` injected by the proxy, emitted in
  logs and propagated to Sentry breadcrumbs.

## Environments

Three environments, each with its own database, cache, and secret scope. See
[`docs/environments.md`](./docs/environments.md) for the full variable matrix.

- **Production** — `main` branch, Neon main branch DB, custom domain, manual
  promotion gate via GitHub Actions.
- **Preview** — every PR gets a Vercel preview URL + a Neon branch DB. Torn
  down when the PR closes.
- **Development** — `vercel env pull` → local Postgres via Docker → Upstash
  falls back to an in-memory token bucket.

## Security & compliance

- **Security headers** (CSP with nonces, HSTS 2y+preload, X-Frame-Options DENY,
  Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy,
  X-Content-Type-Options nosniff) — set in `next.config.ts → headers()`, so
  they apply to every route, not just HTML responses.
- **Disclosure policy** — see [`SECURITY.md`](./SECURITY.md).
- **Compliance scaffolding** — PCI-adjacent (no PAN stored, HMAC webhooks),
  GDPR (audit IP truncation, session revoke, 90-day retention cron),
  DMCA-adjacent framing (Track.premiumOnly gate audited per request).
  Full mapping in [`DEPLOYMENT-INSIGHTS.md`](./DEPLOYMENT-INSIGHTS.md#8-compliance-mapping-what-the-audit-trail-already-gives-us).
- **Incident-response + secrets-rotation runbooks** in
  [`DEPLOYMENT-INSIGHTS.md`](./DEPLOYMENT-INSIGHTS.md).
- **Audit-log retention** — 90 days rolling; see
  [`docs/audit-retention.md`](./docs/audit-retention.md).

## Project layout

```
enterprise-deployment-platform/
├── .github/
│   ├── workflows/          # ci · preview · production · lighthouse · security
│   ├── dependabot.yml      # weekly npm + actions + docker updates
│   └── CODEOWNERS
├── docs/
│   ├── environments.md     # env-var matrix across dev/preview/prod
│   └── audit-retention.md  # 90-day retention policy + cron
├── prisma/
│   ├── schema.prisma       # Postgres provider, 12 models, all enums-as-strings
│   └── seed.ts             # ALLOW_SEED gated, per-user random passwords in non-dev
├── public/                 # static assets
├── src/
│   ├── app/                # Next App Router (pages, API, server actions)
│   │   └── api/health/     # DB-pinging liveness probe
│   ├── components/         # UI kit inherited from project 05
│   ├── lib/
│   │   ├── auth/           # JWT, sessions, cookies (COOKIE_DOMAIN wired)
│   │   ├── rate-limit/     # Upstash adapter + in-memory fallback
│   │   ├── entitlements.ts # DRM gate, Sentry-span instrumented
│   │   ├── log/logger.ts   # pino + redactions
│   │   └── audit/          # audit log with IP truncation
│   ├── types/
│   └── proxy.ts            # Next 16 edge proxy — auth + rate-limit + request-id
├── instrumentation.ts      # Sentry server/edge init
├── sentry.{client,server,edge}.config.ts
├── next.config.ts          # standalone output + security headers + Sentry wrap
├── vercel.json             # regions + function maxDuration + crons
├── lighthouserc.json       # perf budgets for CI
├── Dockerfile              # multi-stage, self-host parity
├── docker-compose.yml      # Postgres + app for local prod-parity runs
├── .env.example            # full env-var catalogue with comments
├── README.md               # this file
├── DEPLOYMENT-INSIGHTS.md  # learning log (10 sections)
└── SECURITY.md             # disclosure policy
```

## Pre-deployment fixes that shipped with this project

Carried over from Project 07 with the following changes to make the app
serverless-safe:

1. `next.config.ts` — standalone output, security headers, Sentry wrap.
2. `package.json` — `postinstall: prisma generate`, `vercel-build` script.
3. `prisma/schema.prisma` — Postgres provider + `directUrl` for migrations.
4. `src/app/actions/upload.ts` — `@vercel/blob` for uploads; FS is dev-only fallback.
5. `src/lib/auth/cookies.ts` — `COOKIE_DOMAIN` wired for cross-subdomain cookies.
6. `prisma/seed.ts` — `ALLOW_SEED` gate, per-user random passwords in non-dev.
7. `src/lib/rate-limit/` — Upstash Redis adapter preserving the three named limiters.
8. `src/app/api/health/route.ts` — post-deploy smoke + uptime probe.

(Project 07's `src/proxy.ts` was kept as-is — it's already on the Next.js 16
proxy convention, which replaced `middleware.ts` in Next 16.)

## Verification

```bash
# Build verification
npm ci
npm run typecheck
npm run lint
npm run build                        # produces .next/standalone/

# Functional verification (needs Postgres up + env vars set)
npm run db:deploy                    # prisma migrate deploy
ALLOW_SEED=true npm run db:seed
npm run start
curl http://localhost:3000/api/health       # 200 { ok: true }
curl -X POST http://localhost:3000/api/webhooks/billing  # 401 (no HMAC)

# End-to-end
#  - register / log in via /register and /login
#  - play a non-premium track → 200
#  - play a premium-only track as FREE user → 402
#  - rate-limit check: 11 POSTs to /api/auth/login in one minute → 429 on the 11th
```

## Related

- [Project 05 — Spotify design system](../../05/05-styling)
- [Project 07 — Backend integration](../../07/07-backend-integration)
- [`DEPLOYMENT-INSIGHTS.md`](./DEPLOYMENT-INSIGHTS.md) — the learning log
- [`SECURITY.md`](./SECURITY.md) — disclosure policy
- [`docs/environments.md`](./docs/environments.md) — env matrix
- [`docs/audit-retention.md`](./docs/audit-retention.md) — retention policy

## The Core Team

<span><i>Made at <a href='https://qwasar.io'>Qwasar SV — Software Engineering School</a></i></span>
<span><img alt='Qwasar SV — Software Engineering School Logo' src='https://storage.googleapis.com/qwasar-public/qwasar-logo_50x50.png' width='20px' /></span>
