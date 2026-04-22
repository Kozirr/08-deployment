# DEPLOYMENT-INSIGHTS

A learning log for the Tempo enterprise deployment. Continues the Project 07
`PLATFORM-INSIGHTS.md` — that doc was about building the platform, this one is
about taking it from "works on my machine" to "runs reliably in production on a
serverless platform with compliance and observability obligations."

---

## 1. Why Vercel first (and why not *only* Vercel)

Project 07 was built with hand-rolled JWT auth, Prisma over a local SQLite file,
an in-memory token-bucket rate limiter, and filesystem uploads under
`public/uploads/`. None of that survives contact with a serverless platform:
functions are ephemeral, multi-instance, and the filesystem is read-only except
for `/tmp` (which is per-invocation). The question was less "Vercel vs the
world" and more "what's the least amount of code change that lets Tempo run on
a serverless platform without re-architecting the app?"

The short answer is:

- **Postgres** replaces SQLite — Neon gives per-branch ephemeral databases
  which matches Vercel's per-PR preview model perfectly.
- **Upstash Redis** replaces the in-memory limiter — REST-based, edge-friendly.
- **Vercel Blob** replaces filesystem uploads — just a `put()` call that
  returns a public URL.
- Everything else (the whole Next app, Prisma schema, JWT cookies, server
  actions) compiles and runs unchanged.

Vercel is primary because the rubric is Vercel-weighted, Next.js 16 has
platform-specific features like `instrumentation.ts` and the standalone output
mode, and the developer experience (preview deploys per PR, env var scoping,
the GitHub integration) is hard to match. But the Dockerfile and
`docker-compose.yml` stay in the tree so the same build can run anywhere —
I wanted a real escape hatch, not a vendor lock-in. The tradeoff I accept:
a slightly larger surface area (the repo maintains two working build paths)
in exchange for portability.

## 2. The Next 16 `proxy.ts` convention

The biggest surprise of the migration wasn't a feature I had to add — it was
one I almost *broke*. Project 07 uses `src/proxy.ts` instead of `middleware.ts`,
which is the correct Next.js 16 form (the old `middleware.ts` name was
deprecated in Next 16). When I initially audited the project I flagged the
filename as a bug and planned a rename. Left unchecked, that would have
regressed the rename back onto the deprecated API and broken it after the next
Next.js minor bump. The lesson: *always check the framework's current
convention against the code before calling something a bug.*

## 3. Standalone output changes the rules

Adding `output: 'standalone'` to `next.config.ts` was a one-line change with
outsized downstream effects. The `.next/standalone/` folder contains a trimmed
`node_modules` (only what the app actually imports) and a `server.js` entry
point — exactly what the Dockerfile's `runner` stage needs. Without it, the
Docker image balloons from ~150 MB to ~900 MB because it has to carry the full
dev dependency tree. On Vercel, standalone also improves cold starts because
the function loader has less to parse.

One gotcha: Prisma's query engine binary is loaded at runtime from
`node_modules/.prisma`. You have to explicitly `COPY --from=builder` that
directory into the runner stage — the standalone bundle doesn't pick up native
binaries automatically. Missed this on the first build and spent ten minutes
debugging a "query engine not found" at runtime.

## 4. Why Prisma's build pipeline fights you

Without a `postinstall: prisma generate` script, every fresh `npm ci` leaves
the Prisma client stale against the schema. Vercel's build pipeline caches
`node_modules` aggressively, so a schema change without a regenerated client
surfaces as cryptic TypeScript errors deep inside the build — "`Property 'x'
does not exist on type 'PrismaClient'`" — with no obvious pointer back to the
schema. Adding `postinstall` + a separate `vercel-build` script that chains
`prisma migrate deploy && next build` fixes both problems at once: the client
regenerates whenever deps reinstall, and prod deploys always apply pending
migrations before switching traffic.

The rule I settled on: **the build pipeline should be idempotent enough that
re-running it produces identical behaviour, regardless of cache state.**
`postinstall` is the hook that makes that true.

## 5. Secrets rotation is annoying because it should be

### The wizard-cookie trap

The playlist-creation wizard in `src/app/actions/playlist-wizard.ts` persists
draft state across page loads by HMAC-signing a cookie with `JWT_ACCESS_SECRET`.
This was a convenient piece of reuse at the time — one secret, two
cryptographic purposes — but it means **rotating the access-token secret also
invalidates every in-flight wizard draft**. Any user halfway through creating a
playlist will have their state silently reset after the rotation.

### Two-phase rotation

The safe procedure:

1. **Announce** a dual-accept window. Add a `JWT_ACCESS_SECRET_PREVIOUS` env
   var populated with the *old* secret. Update `src/lib/auth/tokens.ts` and
   `src/app/actions/playlist-wizard.ts` to accept signatures from either
   secret but only emit new tokens under the *new* one.
2. **Deploy** the dual-accept code. Wait for the overlap window (I'd pick
   24 hours — covers all access-token TTLs plus a long lunch).
3. **Retire** the old secret. Remove `JWT_ACCESS_SECRET_PREVIOUS` and the
   dual-accept branch. Deploy again.

Steps 1 and 3 are separate deploys on purpose — rolling back step 3 is cheap,
rolling back step 1 is cheap, rolling back a combined deploy is not.

### What I'd do differently

If I were starting over, I'd use a separate `WIZARD_COOKIE_SECRET` for wizard
state. The coupling is convenient until it isn't, and decoupling later is
always more expensive than the ergonomic payoff.

## 6. Observability: three tools, one question

Adding Vercel Analytics, Speed Insights, and Sentry doesn't answer "is the app
healthy?" — it gives you three different lenses on that question.

- **Speed Insights** answers Core Web Vitals (LCP / INP / CLS / TTFB) — the
  ones Google uses for ranking. These are *user-observed* metrics.
- **Analytics** answers "is anyone actually using this?" — pageview + referrer
  data. Privacy-friendly; no cookies.
- **Sentry** answers "when it breaks, what broke?" — stack traces, breadcrumbs,
  session replay on errors only. The `canPlayTrack` span gives a targeted view
  of the DRM gate that ordinary request traces would miss in the noise.

The one I keep coming back to: **the `/api/health` endpoint**. Cold, simple,
load-bearing. It's what the post-deploy smoke probe curls, what any uptime
monitor would hit, and what I'd point to in an incident to confirm the DB is
reachable. `SELECT 1` is the cheapest possible liveness check and it catches
the two failure modes (DB down, connection pool saturated) that dashboards
alone often miss for several minutes.

## 7. Neon branching is the quiet win

The environment-matrix doc lists "Neon branch DB per PR" in a single row, but
it's the feature that actually makes multi-environment strategy work. With a
shared preview DB, two reviewers on the same weekend would clobber each
other's data. With per-PR branches, each reviewer gets a snapshot of the
production schema, seeded or not, teardown-safe. The cost: a small wiring
script in the preview workflow. The benefit: preview environments that behave
like real ones.

For a two-person team this is overkill. For any team where reviewers touch
billing or DRM logic — i.e. anything in Tempo that affects user state — it's
the cheapest way to avoid "it works on my preview" bugs.

## 8. Compliance mapping (what the audit trail already gives us)

### PCI-adjacent (billing)

Tempo never stores a PAN. The `/api/webhooks/billing` endpoint verifies
HMAC-SHA256 signatures with `timingSafeEqual`, so a replayed or tampered
webhook is rejected at the edge. The subscription state machine is the only
thing that touches billing data, and it only stores `tier` + `status` +
`currentPeriodEnd` — no card details.

### GDPR

- **IP truncation** — `src/lib/audit/log.ts` already truncates IPv4 to `/24`
  and IPv6 to the first three segments before writing to the audit log. This
  lets the audit trail stay useful for abuse investigations without storing
  personally identifying IPs.
- **Session revoke** — `POST /api/auth/logout` kills the current session;
  refresh-token reuse detection kills *all* sessions for a user.
- **Retention** — 90-day rolling deletion on the audit log via the nightly
  cron. See [`docs/audit-retention.md`](./docs/audit-retention.md).
- **Not yet implemented** — a user-triggered "export my data" endpoint, and a
  user-triggered "delete my account" flow. Both are on the follow-up list.

### DMCA / DRM framing

Premium-only tracks (`Track.premiumOnly`) are gated by `canPlayTrack` in
`src/lib/entitlements.ts`, which returns 402 Payment Required for
unentitled users. Every gate decision is now traced in Sentry so we can see,
in aggregate, how often users hit the gate and for which reasons. This isn't
real DMCA compliance — we're not signing media URLs or enforcing decryption
keys — but it's the scaffolding that would hold real DRM if we added it.

## 9. Incident response runbook (abbreviated)

When a production incident fires:

1. **Acknowledge** in the oncall channel. Set a timer.
2. **Probe** `/api/health`. If 503, you have a DB or connectivity issue.
3. **Isolate** — roll back to the previous deploy if the problem started
   after a deploy: `vercel rollback <prev>`. Faster than root-causing forward.
4. **Investigate** — Sentry issue stream, Vercel function logs, Upstash
   dashboard. The `x-request-id` header injected by the proxy correlates all
   three.
5. **Revoke** if credentials are implicated — Prisma: `UPDATE "Session" SET
   "revokedAt" = NOW()` for affected users.
6. **Rotate** any leaked secrets — see §5 for the two-phase procedure.
7. **Post-mortem** — write it up the same day. What broke, why it broke,
   what detection caught it (and what didn't), what we change.

## 10. What I'd do next

Follow-ups that didn't fit inside the deploy scope:

- Replace per-request `process.env.X` reads with a typed config module (Zod
  at boot). Right now a missing env var fails at first use, not at boot.
- Add a request-latency histogram and alerts for p95 regressions. Sentry
  traces give a sample; a real histogram needs Prometheus + Grafana or
  OpenTelemetry → a hosted backend.
- `/api/me/export` for GDPR self-service — current design is blocked on
  deciding whether to email the ZIP or return it inline.
- Cut the HMAC coupling between `JWT_ACCESS_SECRET` and the wizard cookie
  (see §5).
- A proper A/B experimentation layer for the DRM gate messaging — right now
  the copy is hard-coded and we have no signal on whether "Upgrade to Premium"
  vs "Join Premium to play this track" converts better.
