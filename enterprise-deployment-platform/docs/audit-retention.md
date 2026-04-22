# Audit log retention

Tempo's `AuditLog` table records every state-changing action (logins, playlist
mutations, subscription changes, admin actions). Keeping these rows forever is
both a storage waste and a privacy problem — truncated IPs and user agents are
still linkable back to a session over long enough windows.

## Policy

- **Retention window:** 90 days from `createdAt`.
- **Sweep cadence:** nightly at 03:17 UTC.
- **Scope:** *all* audit rows older than the cutoff are hard-deleted. There is
  no archive. If you need a long-term compliance trail for a specific class of
  event, export it to cold storage before the sweep runs.

## Implementation

- Endpoint: [`src/app/api/admin/audit-retention/route.ts`](../src/app/api/admin/audit-retention/route.ts)
- Scheduled via the `crons` stanza in [`vercel.json`](../vercel.json):
  ```json
  { "path": "/api/admin/audit-retention", "schedule": "17 3 * * *" }
  ```
- Auth: Vercel cron requests carry `Authorization: Bearer $CRON_SECRET`. The
  route rejects anything that doesn't match. The cron path is listed in
  `PUBLIC_API_PATTERNS` so the proxy doesn't also demand a user access cookie.
- Output: structured log line `"audit-retention sweep" { deleted, cutoff }` via
  the pino logger; forwarded to Vercel log drains.

## Runbook: extend or shrink the window

1. Update `RETENTION_DAYS` in `src/app/api/admin/audit-retention/route.ts`.
2. Update this doc and `DEPLOYMENT-INSIGHTS.md` → Compliance mapping.
3. If shrinking, run the sweep manually **before** deploying so the one-time
   deletion does not race with application traffic:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://tempo.example.dev/api/admin/audit-retention
   ```

## Related

- [`docs/environments.md`](./environments.md) — environment-variable matrix.
- `DEPLOYMENT-INSIGHTS.md` → Compliance mapping → GDPR.
