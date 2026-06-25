# Client Handoff Document

## Project Overview

Manarah Institute HMS is a multi-role school management system built with Next.js, Prisma, PostgreSQL, and Supabase-backed production infrastructure on Vercel.

It supports four user groups:

- Admin
- Teacher
- Student
- Parent

## Deployment URL

- Production: [https://schools-plum.vercel.app](https://schools-plum.vercel.app)

## Module Summary

### Admin

- Dashboards and KPIs
- Students, teachers, classes
- Attendance, academics, reports
- Finance and notifications
- Role and settings management

### Teacher

- Class overview
- Attendance marking
- Progress / academic reporting
- Messaging
- Teacher settings

### Student

- Student dashboard
- Results and progress
- Attendance
- Fees
- Messages and notifications

### Parent

- Child overview
- Attendance and performance
- Fee status
- Notifications

## Default Environment Requirements

Use the production-shaped environment variables from `.env.example`:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `CRON_SECRET`

Recommended operational flags:

- `ALLOW_SUPABASE_REST_AUTH_FALLBACK=1`
- `ALLOW_SESSION_DB_FALLBACK=1`
- `FORCE_SUPABASE_REST_DATA_FALLBACK=0`

## Backup & Restore Summary

### Backup

- Keep Supabase database backups enabled
- Store migration files, seed scripts, and env snapshots securely
- Back up production env values before changing database credentials

### Restore

- Restore the database from the latest good backup
- Re-run migrations if needed
- Re-seed demo accounts if required
- Re-test login, finance, attendance, messages, and reports

## Maintenance Recommendations

- Check Vercel runtime logs daily
- Check Supabase logs weekly
- Re-verify login and CRUD flows after any schema or env change
- Reconfirm `DATABASE_URL` after any Supabase password update
- Run typecheck before every production deploy

## Support / Contact

Primary support contact:

- Name: ____________________
- Email: ___________________
- Phone: ___________________

Escalation contact:

- Name: ____________________
- Email: ___________________

## Future Roadmap

### P1

- Automated health alerts
- Route-level performance tracing
- More dashboard pagination where data grows

### P2

- Finer cache-tag strategy
- Better outage-state UX
- More serialization helpers for dates and decimals

### P3

- Admin diagnostics page
- Performance budgets
- Background-job observability

