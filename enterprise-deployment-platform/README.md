# Welcome to 08 Deployment
***

## Task
Project 07 shipped **Tempo** — a Next.js 16 / Prisma / JWT music-streaming app that
deliberately hybridised three rubric domains (E-commerce billing with HMAC webhooks,
Gaming-style DRM via `premiumOnly` track gating, Social graph with follows + likes).
It worked — on one machine, against a local SQLite file, with an in-memory rate
limiter, filesystem uploads under `public/uploads/`, and hard-coded demo passwords.

**The task for Project 08 is to ship that app** — keep the code, change the platform.
None of what Project 07 relied on survives contact with a serverless host: functions
are ephemeral and multi-instance, the filesystem is read-only except for `/tmp`, a
process-local token bucket stops being a rate limiter the moment Vercel spawns a
second function, and a SQLite file disappears the instant a new deploy rolls.

Concretely, the challenge was to:

1. **Choose a platform and justify it** — Vercel vs Netlify vs AWS Amplify vs self-host,
   with tradeoffs that hold up under interview questions.
2. **Make the app serverless-safe** — Postgres (Neon), distributed rate limiting
   (Upstash), object storage (Vercel Blob), standalone build output, cross-subdomain
   cookies.
3. **Automate the deploy path** — GitHub Actions for CI, per-PR preview deploys with
   throwaway Neon branch DBs, a gated production workflow with a post-deploy health
   probe.
4. **Make it observable** — Vercel Analytics + Speed Insights for user-observed
   metrics, Sentry for errors with a custom span on the DRM hotspot, pino structured
   logs with PII redactions, `/api/health` for uptime probes, Lighthouse CI budgets.
5. **Run it across environments** — dev (Docker Postgres), preview (Neon branch DB
   per PR, auto-torn-down), production (Neon main, manual promotion gate, custom
   domain placeholder), with a matrix that makes it obvious what gets set where.
6. **Scaffold compliance** — security headers at the edge, HMAC-verified webhooks,
   audit logging with `/24` IP truncation, 90-day retention cron, secrets-rotation
   runbook (including the two-phase rotation required by the wizard-cookie HMAC
   coupling), incident-response runbook, PCI/GDPR/DMCA mapping.

The meta-challenge was picking which deploy is "the" deploy. The rubric is Vercel-
weighted, so Vercel is primary — but a Dockerfile + `docker-compose.yml` stay in the
tree so the same build runs self-hosted too. Portability as escape hatch, not as
hedge.

## Description
**Stack:** Next.js 16.2.3 (App Router, Turbopack, `proxy.ts` edge middleware) ·
React 19.2.4 · TypeScript 5 strict · Prisma 5 + **Neon Postgres** (per-PR branching)
· `jose` JWT · `bcryptjs` · `zod` · Tailwind CSS v4 · **Upstash Redis** rate limiter
· **Vercel Blob** uploads · **Sentry** · **Vercel Analytics + Speed Insights** · pino
structured logs · GitHub Actions · multi-stage Dockerfile.

### Platform choice

| Contender           | Why it fits                                                                           | Why it's secondary                                                                |
| ------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Vercel**          | First-class Next 16 support, per-PR previews, edge regions, integrated Analytics + Speed Insights, zero-config GitHub flow. | Vendor-specific; function time limits on free tier; no long-running workers.      |
| Netlify             | Good static / JAMstack story, mature redirect rules.                                  | Weaker App Router support; serverless functions are a second-class add-on.        |
| AWS Amplify         | Strongest identity story if you're already all-in on AWS.                             | Slow build pipeline; SSR trails Vercel; config lives in the console, not Git.     |
| Self-host (Docker)  | Zero lock-in; works anywhere; full parity across environments.                        | Every capability you get free from Vercel (edge routing, rate limiting, secrets) has to be rebuilt. |

**Picked:** Vercel for hosting, Neon for Postgres (per-branch ephemeral DBs match
preview deploys one-to-one), Upstash for the distributed rate limiter, Vercel Blob
for uploads, Sentry for error tracking.

### Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                Vercel                                    │
│                                                                          │
│   ┌─────────────┐   proxy.ts (edge)   ┌──────────────────────┐           │
│   │  fra1 edge  │ ───────────────────▶│  Node functions      │           │
│   │  + CDN      │   auth / rate-lim   │  (pages + API)       │           │
│   └─────────────┘   request-id        └──────────────────────┘           │
│                                                │                         │
└────────────────────────────────────────────────┼─────────────────────────┘
                                                 │
                           ┌─────────────────────┼─────────────────────┐
                           ▼                     ▼                     ▼
                    ┌──────────┐          ┌───────────┐         ┌───────────┐
                    │   Neon   │          │  Upstash  │         │  Vercel   │
                    │ Postgres │          │   Redis   │         │   Blob    │
                    └──────────┘          └───────────┘         └───────────┘
                     schema,              rate-limit            playlist
                     sessions,            buckets               covers
                     audit log            (auth/global/write)

                                  Telemetry
                          ┌─────────────────────────────┐
                          │ Sentry · Analytics · Speed  │
                          └─────────────────────────────┘
```

### Vercel properties the app leans on

- **Standalone build** — `next.config.ts → output: 'standalone'` produces a trimmed
  `server.js` entry. On Vercel it shrinks cold starts; in the Dockerfile it cuts the
  runner image from ~900 MB to ~150 MB.
- **Edge region** — `vercel.json → regions: ["fra1"]` (Frankfurt). `proxy.ts` runs
  at the edge so auth + rate-limit happen close to the user.
- **Ephemeral filesystem** — uploads go to Vercel Blob, logs to the log drain, DB is
  Neon. Nothing writes to disk in production.
- **Secrets in Vercel env** — pulled locally via `vercel env pull`.
- **Cron jobs** — `vercel.json` declares the nightly audit-retention sweep.
- **Function `maxDuration`** — bumped to 30 s for webhooks and admin routes.

### CI/CD pipeline

| Workflow        | Trigger                          | What it does                                                                  |
| --------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `ci.yml`        | PR, non-`main` push              | `npm ci` → `prisma validate` → ESLint → Stylelint → `tsc --noEmit` → `next build` |
| `preview.yml`   | PR open/sync                     | `vercel build && vercel deploy`, comments preview URL on the PR               |
| `production.yml`| Push to `main` + manual approval | Re-runs `ci.yml`, then `vercel deploy --prod`, then `curl /api/health`        |
| `lighthouse.yml`| PR open/sync                     | Audits preview URL against `lighthouserc.json` budgets                        |
| `security.yml`  | PR + weekly cron                 | `npm audit`, dependency review, CodeQL                                        |

The `production` workflow uses a GitHub `production` environment with a required
reviewer — **no automatic production deploys**, only a one-click promotion.
Branch-protection expectations (required checks, linear history, `CODEOWNERS` review
on `prisma/` and `src/lib/auth/`) are documented but live in the GitHub UI, not in
the repo.

### Observability

- **Core Web Vitals** — Vercel Speed Insights (LCP, INP, CLS, TTFB).
- **Analytics** — Vercel Analytics (privacy-friendly, no cookies).
- **Errors** — Sentry with source maps, session replay on error only, `maskAllText`
  + `blockAllMedia`, tunnelled through `/monitoring` so ad-blockers don't drop events.
- **Custom span** — `canPlayTrack` (the DRM hotspot) is wrapped in a Sentry span so
  gate decisions are traceable per request.
- **Structured logs** — pino on the server, JSON to Vercel log drains, pretty in dev.
  Redacts `cookie`, `authorization`, `password`, and token-shaped fields.
- **Health probe** — `GET /api/health` does `SELECT 1` on Postgres and returns
  `{ ok, db, commit, env, region, latencyMs }` with a 200 or 503.
- **Request correlation** — `x-request-id` injected at the edge, propagated to logs
  and Sentry breadcrumbs.

### Environments

Three environments, each with its own DB, cache, secrets, and Sentry env tag. Full
matrix in [`docs/environments.md`](./docs/environments.md).

- **Production** — `main` branch, Neon main DB, custom domain, manual promotion gate.
- **Preview** — every PR gets a distinct Vercel URL + a fresh Neon branch DB. Torn
  down on PR close. Lets two reviewers touch billing/DRM logic the same weekend
  without clobbering each other's data.
- **Development** — `vercel env pull`, local Postgres via `docker compose`, Upstash
  falls back to an in-memory bucket when its env vars are unset.

### Security & compliance

- **Security headers** set in `next.config.ts → headers()` (applies to every route,
  not just HTML): CSP, HSTS `max-age=63072000; includeSubDomains; preload`,
  X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, X-Content-Type-Options.
- **Defence-in-depth summary** in [`SECURITY.md`](./SECURITY.md) plus the disclosure
  contact + out-of-scope list.
- **Compliance scaffolding** in [`DEPLOYMENT-INSIGHTS.md`](./DEPLOYMENT-INSIGHTS.md)
  §8: PCI-adjacent (no PAN stored, HMAC webhooks), GDPR (IP `/24` truncation, session
  revoke, 90-day retention), DMCA framing (`premiumOnly` gate audited per request).
- **Runbooks** — §5 secrets rotation (with the two-phase wizard-cookie dual-accept
  procedure), §9 incident response.
- **Audit retention** — 90 days, enforced by the Vercel cron declared in
  `vercel.json`. Policy + runbook in [`docs/audit-retention.md`](./docs/audit-retention.md).

### Project layout

```
enterprise-deployment-platform/
├── .github/
│   ├── workflows/          ci · preview · production · lighthouse · security
│   ├── dependabot.yml
│   └── CODEOWNERS
├── docs/
│   ├── environments.md     env-var matrix across dev/preview/prod
│   └── audit-retention.md  90-day policy + runbook
├── prisma/
│   ├── schema.prisma       Postgres provider, 12 models, enums-as-strings
│   ├── migrations/         0001_init_postgres baseline
│   └── seed.ts             ALLOW_SEED gated, per-user random passwords in non-dev
├── public/                 static assets
├── src/
│   ├── app/                App Router (pages, API, server actions)
│   │   └── api/health/     DB-pinging liveness probe
│   ├── components/         UI kit inherited from Project 05
│   ├── lib/
│   │   ├── auth/           JWT, sessions, cookies (COOKIE_DOMAIN wired)
│   │   ├── rate-limit/     Upstash adapter + in-memory fallback
│   │   ├── entitlements.ts DRM gate, Sentry-span instrumented
│   │   ├── log/logger.ts   pino + redactions
│   │   └── audit/          audit log with IP /24 truncation
│   └── proxy.ts            Next 16 edge proxy — auth + rate-limit + request-id
├── instrumentation.ts      Sentry server/edge init
├── sentry.{client,server,edge}.config.ts
├── next.config.ts          standalone output + security headers + Sentry wrap
├── vercel.json             regions + function maxDuration + crons
├── lighthouserc.json       perf budgets for CI
├── Dockerfile              multi-stage, self-host parity
├── docker-compose.yml      Postgres + app for local prod-parity runs
├── .env.example            full env-var catalogue
├── DEPLOYMENT-INSIGHTS.md  learning log (10 sections)
└── SECURITY.md             disclosure policy
```

## Installation
Requires Node.js 20+ and Docker (for local Postgres). Clone the repo, then:

```
cp .env.example .env.local
# Set POSTGRES_PRISMA_URL=postgres://tempo:tempo@localhost:5432/tempo
# Generate secrets: openssl rand -base64 48  →  JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, WEBHOOK_SECRET
npm ci                              # postinstall runs `prisma generate`
docker compose up -d db             # Postgres 16 on :5432
npx prisma migrate deploy           # applies the 0001_init_postgres baseline
ALLOW_SEED=true npm run db:seed     # seeds catalog + demo users, prints random passwords
```

Vercel deploy (assumes `gh` + `vercel` CLIs are linked):

```
vercel link                         # one-time: connect to the Vercel project
vercel env add POSTGRES_PRISMA_URL production
vercel env add POSTGRES_URL_NON_POOLING production
vercel env add JWT_ACCESS_SECRET production
vercel env add JWT_REFRESH_SECRET production
vercel env add WEBHOOK_SECRET production
vercel env add CRON_SECRET production
vercel env add NEXT_PUBLIC_SENTRY_DSN production
# ...repeat for preview scope. Full matrix in docs/environments.md.
git push origin main                # triggers .github/workflows/production.yml
```

## Usage
Development server with hot reload on <http://localhost:3000>:

```
npm run dev
```

Other scripts:

```
npm run build      # production build (standalone output)
npm run start      # run the built server
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run lhci       # Lighthouse CI against preview URL
npm run db:reset   # wipe + re-migrate + re-seed
```

Verify the deployment end-to-end:

1. `curl http://localhost:3000/api/health` — 200 `{ ok: true, db: "up" }`.
2. **Auth round-trip** — register at `/register`, log in at `/login`.
3. **DRM gate** — downgrade to FREE via `/account`, try to play a `premiumOnly`
   track: `POST /api/playback/start` returns `402`. Upgrade back to PREMIUM: `200`.
4. **Webhook HMAC** — `curl -X POST /api/webhooks/billing` with no signature: `401`.
5. **Distributed rate limit** — 11 `POST /api/auth/login` calls from the same IP in
   one minute: `429` on the 11th (10/min `authLimiter`). With Upstash env vars set,
   the count is shared across functions; without them, the in-memory fallback kicks
   in for dev.
6. **Preview deploy** — open a dry-run PR on a scratch branch. `ci`, `lighthouse`,
   `security` workflows go green; preview URL appears as a PR comment; Lighthouse
   comment shows budgets met.

Further reading:

- [`DEPLOYMENT-INSIGHTS.md`](./DEPLOYMENT-INSIGHTS.md) — the 10-section learning log
  (Vercel rationale, standalone output gotchas, Prisma build pipeline, secrets
  rotation, observability philosophy, Neon branching, compliance mapping, incident
  response, follow-ups).
- [`SECURITY.md`](./SECURITY.md) — disclosure policy + defence-in-depth summary.
- [`docs/environments.md`](./docs/environments.md) — env-var matrix.
- [`docs/audit-retention.md`](./docs/audit-retention.md) — retention policy.
- [Project 05 — Spotify design system](../../05/05-styling)
- [Project 07 — Backend integration](../../07/07-backend-integration)

### The Core Team


<span><i>Made at <a href='https://qwasar.io'>Qwasar SV -- Software Engineering School</a></i></span>
<span><img alt='Qwasar SV -- Software Engineering School's Logo' src='https://storage.googleapis.com/qwasar-public/qwasar-logo_50x50.png' width='20px' /></span>
