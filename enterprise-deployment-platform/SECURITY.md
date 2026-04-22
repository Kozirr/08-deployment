# Security policy

## Supported versions

Only the `main` branch deployed to production is supported. No LTS branches.
Security patches ship on the next production deploy; the rollout gate on
`.github/workflows/production.yml` is `≤ 24 hours` for HIGH/CRITICAL fixes.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security reports.

- Email: `security@tempo.example.dev`
- PGP key: fingerprint to be published alongside the first public key rotation.
- If you prefer, use GitHub's private security advisory flow:
  `Security → Report a vulnerability`.

We'll acknowledge within **two business days** and aim for a triage verdict
within **seven days**. Please include:

- Affected endpoint, route, or component.
- Reproduction steps or a proof-of-concept payload.
- Impact assessment (what can an attacker read, write, or break?).
- Whether the report is eligible for disclosure coordination.

We do not currently run a paid bug bounty programme.

## Out of scope

- Denial-of-service via volumetric traffic (use the platform-level mitigations).
- Self-XSS where the attacker controls the victim's browser.
- Reports requiring physical access to an unlocked machine.
- Findings in third-party services (Vercel, Neon, Upstash, Sentry) — report
  those to the respective vendors.

## Defence-in-depth summary

- **Authentication:** JWT access + rotating refresh tokens, DB-backed sessions,
  refresh-token reuse detection (revokes all sessions for the affected user).
- **Rate limiting:** distributed token buckets via Upstash Redis — 10 auth/min,
  120 global/min, 30 writes/min per IP.
- **Input validation:** Zod schemas at every API boundary; magic-byte sniffing
  on all uploads.
- **Webhook verification:** HMAC-SHA256 with `timingSafeEqual` on the billing
  endpoint.
- **Audit logging:** every state change recorded with IP truncation (IPv4 /24,
  IPv6 first three segments) for GDPR-friendly retention.
- **Security headers:** CSP, HSTS (2 years + preload), X-Frame-Options DENY,
  Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy, and
  X-Content-Type-Options nosniff at the edge.
- **Secrets management:** Vercel environment variables scoped per environment;
  rotation procedure documented in [`DEPLOYMENT-INSIGHTS.md`](./DEPLOYMENT-INSIGHTS.md).
- **Dependency hygiene:** weekly Dependabot, `npm audit` in CI, CodeQL on PRs.
