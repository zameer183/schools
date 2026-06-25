# Production Hardening & Monitoring

## Final Project Summary

Manarah Institute HMS is now production-stable on Vercel with Supabase/PostgreSQL-backed authentication, role-based dashboards, finance workflows, attendance, reports, and messaging.

The biggest production blockers that were fixed in this phase were:

- stale Vercel `DATABASE_URL` / `DIRECT_URL` values
- finance rendering crash caused by unsafe date serialization
- teacher settings loading bug caused by looking up the teacher profile with the wrong identifier

## Optimization Summary

- Admin heavy pages were reduced to safer query shapes and fallback-aware data loading.
- Teacher and student flows were verified end-to-end after the database env fix.
- Production API CRUD was confirmed for classes, teachers, students, attendance, fees, and messages.
- A lightweight health endpoint was added for uptime checks.

## Short Technical Architecture

### Login

1. The login form posts to `/api/auth/login`.
2. Inputs are normalized through `normalizeLoginIdentifier()` and `normalizePassword()`.
3. The API first tries Prisma against PostgreSQL.
4. If the database is unavailable and fallback flags are enabled, it can use Supabase REST fallback for auth lookup.
5. On success, the app creates a signed session and redirects by role.

### Database Access

- Prisma is the primary persistence layer.
- Supabase Postgres uses a pooled connection string in `DATABASE_URL`.
- `DIRECT_URL` is reserved for direct database operations and migrations.
- The codebase already contains REST fallback helpers for outage resilience on selected routes.

### API Layer

- Routes are organized by domain: auth, admin, teacher, student, attendance, finance, reports, messages, notifications.
- RBAC checks happen at the API boundary.
- CRUD routes should return friendly JSON errors instead of leaking stack traces.

## Health Check Endpoint

### Route

`GET /api/health`

### Expected response

- `200` when PostgreSQL is reachable
- `503` when the database is degraded or unreachable

### Response shape

```json
{
  "status": "ok",
  "database": "up",
  "timestamp": "2026-06-25T00:00:00.000Z",
  "uptimeSeconds": 1234,
  "latencyMs": 12
}
```

## Monitoring Recommendations

- Vercel logs:
  - watch for `500`, `503`, `PrismaClientInitializationError`, and timeout spikes
  - review after every deploy
- Supabase logs:
  - watch for pooler saturation, auth failures, and connection resets
- Alert thresholds:
  - health endpoint returns `503`
  - repeated 500s on finance, reports, attendance, teacher settings, or student profile routes
  - login failures that are not caused by bad credentials
- Operational checks:
  - verify production `DATABASE_URL` after any Supabase password change
  - confirm `NEXT_PUBLIC_APP_URL` matches the live domain before sending credential emails or WhatsApp links

## Vercel Deployment Checklist

1. Confirm `DATABASE_URL` uses the Supabase pooler host and correct password.
2. Confirm `DIRECT_URL` uses the direct Supabase database host.
3. Confirm `NEXT_PUBLIC_APP_URL` matches the live Vercel domain.
4. Confirm `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present.
5. Run typecheck before deploy.
6. Deploy to preview and verify:
   - login
   - admin dashboard
   - teacher dashboard
   - student dashboard
   - parent dashboard
7. Promote to production only after the health endpoint returns `200`.

## Backup & Restore Procedure

### Backup

- Take scheduled Supabase database backups before schema changes.
- Export critical seed/config snapshots:
  - `.env.example`
  - Prisma schema
  - migration files
  - role/account seed scripts
- Keep a copy of the current production env variable values in a secure secret store.

### Restore

- Restore the Supabase backup or point a fresh database at the correct schema version.
- Re-apply migrations.
- Re-seed demo/test accounts if needed.
- Recheck:
  - login
  - finance
  - attendance
  - reports
  - messaging

## Future Optimization Backlog

### P1

- Add alerts for `/api/health` failures.
- Add route-level tracing around the heaviest Prisma queries.
- Add pagination for the largest report tables where not already present.

### P2

- Add more fine-grained cache tags for dashboards and summaries.
- Add a lightweight replay-safe error page for outage states.
- Normalize more data serialization helpers for dates and decimals.

### P3

- Add a simple admin-facing diagnostics page.
- Add automated performance budgets for the heaviest routes.
- Add background job observability for fee reminders and WhatsApp dispatch.

## Remaining Technical Debt

- Some flows still rely on runtime fallback behavior when database access is degraded.
- Production monitoring is mostly manual today.
- A few heavy admin pages still deserve periodic query review as data grows.

## Known Limitations

- WhatsApp delivery depends on external provider availability.
- Supabase fallback features require the correct service role key and project URL.
- Parent dashboards can show empty-state views if no children are linked yet.

## Recommended Maintenance Schedule

- Daily:
  - review Vercel runtime errors
  - check `/api/health`
- Weekly:
  - review Supabase logs
  - inspect slow pages and repeated 500s
- Monthly:
  - rotate secrets if policy requires it
  - review Prisma query patterns on reports/finance/attendance
- After any schema change:
  - run migrations
  - verify login and key CRUD flows

## Version Recommendation

Recommended tag: `v1.0.0 Stable`

This tag is appropriate because the production blockers identified in the crash-fix phase were resolved, the critical flows were re-verified, and the app now has a health endpoint plus a practical monitoring/rollback playbook.
