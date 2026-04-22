# Environments

Tempo ships through three distinct environments. Each has its own database,
cache, secrets, and telemetry project. The table below is the source of truth
for what gets set where.

## Matrix

| Variable                   | Development               | Preview (per PR)                | Production                      |
| -------------------------- | ------------------------- | ------------------------------- | ------------------------------- |
| `NODE_ENV`                 | `development`             | `production`                    | `production`                    |
| `VERCEL_ENV`               | —                         | `preview`                       | `production`                    |
| `POSTGRES_PRISMA_URL`      | Docker Postgres           | Neon branch DB (per PR)         | Neon main DB                    |
| `POSTGRES_URL_NON_POOLING` | Same as pooled (local)    | Neon branch direct URL          | Neon main direct URL            |
| `JWT_ACCESS_SECRET`        | `.env.local` placeholder  | Vercel env (preview scope)      | Vercel env (production scope)   |
| `JWT_REFRESH_SECRET`       | `.env.local` placeholder  | Vercel env (preview scope)      | Vercel env (production scope)   |
| `WEBHOOK_SECRET`           | `.env.local` placeholder  | Vercel env (preview scope)      | Vercel env (production scope)   |
| `COOKIE_DOMAIN`            | blank                     | blank (auto preview URL)        | `.tempo.example.dev`            |
| `BLOB_READ_WRITE_TOKEN`    | unset → FS fallback       | Vercel Blob (preview store)     | Vercel Blob (production store)  |
| `UPSTASH_REDIS_REST_URL`   | unset → in-memory limiter | Preview Upstash DB              | Production Upstash DB           |
| `UPSTASH_REDIS_REST_TOKEN` | unset                     | Preview Upstash token           | Production Upstash token        |
| `SENTRY_DSN`               | optional                  | Same project, `preview` env tag | Same project, `production` tag  |
| `NEXT_PUBLIC_SENTRY_DSN`   | optional                  | Vercel env (preview scope)      | Vercel env (production scope)   |
| `SENTRY_AUTH_TOKEN`        | —                         | GitHub secret (CI only)         | GitHub secret (CI only)         |
| `CRON_SECRET`              | —                         | Vercel env (preview scope)      | Vercel env (production scope)   |
| `ALLOW_SEED`               | unset (dev bypass)        | `true` for first-seed only      | `true` only during bootstrap    |
| `NEXT_PUBLIC_SITE_URL`     | `http://localhost:3000`   | Vercel auto preview URL         | `https://tempo.example.dev`     |

## Lifecycle

### Production (`main` → `tempo.example.dev`)

- Triggered by `.github/workflows/production.yml` on merge to `main`.
- GitHub `production` environment requires reviewer approval — **no automatic
  production deploys**. The plan's manual-promotion gate is enforced here.
- After `vercel deploy --prod` the workflow curls `/api/health`; non-200 fails
  the deploy (rollback via `vercel rollback <previous>` manually).
- Neon main branch. Upstash production instance. Sentry `production` env tag.

### Preview (every PR + every non-main branch)

- Triggered by `.github/workflows/preview.yml`.
- Each PR gets a distinct Vercel preview URL commented back on the PR.
- **Neon branching**: a fresh branch DB is cut from the production schema per PR,
  letting reviewers exercise mutations without touching prod data. Tear-down
  happens on PR close.
- Sentry `preview` env tag. Upstash uses a shared preview instance (rate-limit
  state leaks across PRs — acceptable for demo purposes).

### Development (local)

- `vercel env pull .env.development.local` pulls a sanitised preview env for
  local use. Replace URLs with local equivalents where needed.
- `docker compose up -d db` starts Postgres 16 on localhost:5432.
- `DATABASE_URL=postgres://tempo:tempo@localhost:5432/tempo npx prisma migrate deploy`
  applies migrations; re-run after pulling new migrations.
- Seed with `ALLOW_SEED=true npm run db:seed` — in `NODE_ENV=development` the
  seed uses the fixed developer password `Password123!`; any other env prints
  random per-user passwords to stdout.

## Bootstrapping a new environment

1. Create a Neon project + branch; copy the pooled + direct URLs into Vercel env.
2. Create a Vercel Blob store + generate a read/write token.
3. Create an Upstash Redis DB + copy its REST URL + token.
4. Create a Sentry project + copy DSN (client + server).
5. `openssl rand -base64 48` for each of `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
   `WEBHOOK_SECRET`, `CRON_SECRET`.
6. Vercel → Settings → Environment Variables: paste all of the above, scoped to
   the correct environments.
7. In Vercel → Cron Jobs, confirm the `audit-retention` cron picked up the
   `vercel.json` declaration.
8. First deploy: set `ALLOW_SEED=true` temporarily, run `npm run db:seed` from
   the Vercel CLI against the new DB (`vercel env pull && npm run db:seed`), then
   **remove** `ALLOW_SEED`.

## Related

- `vercel.json` — region + function `maxDuration` + cron schedule.
- `.github/workflows/production.yml` — production deploy + smoke probe.
- `DEPLOYMENT-INSIGHTS.md` — secrets rotation + incident runbook.
