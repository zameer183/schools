# AI Agent Handoff

Last updated: `2026-06-25`

## 1. Project Overview

This repository contains the Manarah Institute HMS, a role-based school management system with Admin, Teacher, Student, and Parent portals.

Core domains:

- authentication and session handling
- students, teachers, classes, academics
- attendance, exams, results, reports
- finance, payments, reminders
- messages, notifications, and operational admin tooling

The app has already gone through a major crash-fix, production hardening, and performance optimization phase.

## 2. Tech Stack

- `Next.js 15` App Router
- `React 19`
- `TypeScript`
- `Tailwind CSS`
- `Prisma 5`
- `PostgreSQL` on `Supabase`
- `Vercel` for hosting/deployments
- JWT/session-based auth with role routing

Key folders:

- `app/` routes and API handlers
- `src/lib/` auth, prisma, rbac, validators, helpers
- `src/components/` shared UI/layout
- `prisma/` schema and seed scripts
- `docs/` release and hardening docs
- `graphify-out/` knowledge graph artifacts

## 3. Live Production URL

Current linked Vercel production project:

- `https://schools-two.vercel.app`

Important note:

- `.env.example` currently uses `NEXT_PUBLIC_APP_URL="https://schools-plum.vercel.app"` as a reference shape.
- Before any credential sharing flow or production deploy verification, confirm which public domain is actually active.

## 4. Current Release Versions

- `v1.0.0 Stable`
- `v1.0.1 Admin Performance Patch`

## 5. Important Commits and Tags

Release tags:

- `v1.0.0`
- `v1.0.1`

Important commits:

- `834c755` `Prepare v1.0.0 Stable release`
- `90747b7` `Optimize admin performance hotspots`
- `fb2aecd` `Document v1.0.1 admin performance patch`
- `4aa387b` `Optimize admin academics navigation`
- `450629a` `Clean admin academics navigation warnings`
- `0d4f5ee` `Optimize individual complete report performance`
- `182391e` `Optimize parent dashboard performance`
- `613ea53` `Optimize teacher settings page performance`
- `d7b521f` `Optimize teacher messages page performance`
- `6757691` `Optimize student results page performance`
- `20e6d1c` `Optimize student messages page performance`
- `60c1fda` `Optimize student dashboard performance`

## 6. Major Optimized Pages

Admin:

- `/admin/reports`
- `/admin/reports/individual-complete`
- `/admin/attendance`
- `/admin/finance`
- `/admin/students/[id]`
- `/admin/classes/[id]`
- `/admin/messages`
- `/admin/academics`

Teacher:

- `/teacher/messages`
- `/teacher/settings`

Student:

- `/student`
- `/student/messages`
- `/student/results`

Parent:

- `/parent`

## 7. Performance Benchmark Before/After

Documented optimization phase results:

- `/admin/reports`
  - before: about `11.9s`
  - after: warm loads mostly under `1.5s`
- `/admin/reports/individual-complete`
  - before: about `9.0s`
  - after: warm loads mostly under `1.5s`
- `/admin/finance`
  - target achieved: under `2s` warm in production verification phase
- `/admin/attendance`
  - target achieved: under `2s` warm in production verification phase
- `/admin/students/[id]`
  - target achieved: under `2s` warm
- `/admin/classes/[id]`
  - target achieved: under `2s` warm
- `/admin/messages`
  - target achieved: under `2s` warm

Recent academics navigation improvement:

- root cause: page was shipping a full student list during initial render
- fix: moved student loading to on-demand per-class fetch when result entry needs it
- post-fix spot check:
  - `https://schools-two.vercel.app/admin/academics` returned `200` in about `1.63s`
  - `https://schools-plum.vercel.app/admin/academics` returned `200` in about `1.21s`

## 8. Known Environment Variables Overview

Do not place secrets here. Use secure env storage only.

Required core variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `CRON_SECRET`

Fallback and resilience flags:

- `ALLOW_SUPABASE_REST_AUTH_FALLBACK`
- `ALLOW_SESSION_DB_FALLBACK`
- `FORCE_SUPABASE_REST_DATA_FALLBACK`

Optional integrations:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `WHATSAPP_CLOUD_PHONE_NUMBER_ID`
- `WHATSAPP_CLOUD_ACCESS_TOKEN`
- `WHATSAPP_CLOUD_API_VERSION`

Optional tuning:

- `DISPATCH_MAX_PER_MINUTE`
- `LOG_SLOW_QUERIES`
- `SLOW_QUERY_MS`

Source of placeholder shape:

- `.env.example`

## 9. Supabase / Vercel Notes

Supabase:

- `DATABASE_URL` should use the pooled Supabase host on port `6543`
- `DIRECT_URL` should use the direct database host on port `5432`
- if DB password changes, update both local and Vercel envs
- several routes contain Supabase REST fallback helpers for degraded DB scenarios

Vercel:

- current linked project in this workspace is `schools`
- current production alias observed in CLI: `https://schools-two.vercel.app`
- always verify `NEXT_PUBLIC_APP_URL` matches the real public domain before sending app links through email or WhatsApp
- after deploy, check Vercel logs for `500`, `503`, `PrismaClientInitializationError`, timeout, and connection errors

## 10. Health Endpoint Details

Route:

- `GET /api/health`

Expected behavior:

- `200` when DB is reachable
- `503` when DB is unavailable/degraded

Typical response fields:

- `status`
- `database`
- `timestamp`
- `uptimeSeconds`
- `latencyMs`

Operational note:

- deployment protection, auth layers, or environment-level restrictions can interfere with health checks depending on domain/project configuration

## 11. QA Status

Major QA coverage was completed during release and hardening work:

- admin login, dashboards, CRUD, reports, finance, attendance
- teacher login, messages, settings, academic flows
- student login, dashboard, messages, results
- parent dashboard and summaries
- API/DB and production stability checks

Production verification highlights:

- no fresh Vercel error logs were found in the final post-deploy checks for the `schools` project
- `/api/health` responded `200` during final spot check

## 12. Known Limitations

- some fallback behavior still depends on correct Supabase service role configuration
- production monitoring is still mostly manual
- WhatsApp delivery depends on external provider availability and number formatting quality
- public domain usage is slightly mixed between `schools-two` and `schools-plum` references and should be normalized
- a few non-critical ESLint warnings remain in unrelated files outside the academics fix

## 13. Future Roadmap

### P1

- normalize production public domain usage across envs, docs, and share links
- add route-level tracing for heaviest Prisma queries
- add automated alerting on `/api/health` failure
- continue pagination/lazy loading on the largest report/data tables

### P2

- add stronger observability for cron, reminders, and WhatsApp dispatch
- reduce remaining manual fallback branching in selected APIs
- improve cache tags and summary invalidation strategy

### P3

- add admin-facing diagnostics/ops page
- add automated performance budget checks in CI
- expand structured QA automation for role-wise flows

## 14. Important Warnings

- real `.env` files must never be committed
- `.env.example` must contain placeholders only
- DB and pooler credentials must be verified before troubleshooting login or API errors
- Vercel deployment protection can block or distort health endpoint checks
- do not assume `schools-plum` and `schools-two` are interchangeable without verifying live project/domain mapping

## 15. How To Continue Work Safely

Recommended workflow:

1. run `git status`
2. read `CHANGELOG.md`, `README.md`, and this file
3. verify current branch and latest deployed domain
4. confirm env shape using `.env.example` only, not real secret files
5. run `npx tsc --noEmit --pretty false` before and after meaningful changes
6. if code files change, run `graphify update .`
7. for production issues, check:
   - Vercel logs
   - `/api/health`
   - Supabase connectivity/pooler settings
8. prefer small safe patches over broad refactors on high-traffic pages

For performance work:

- inspect query shapes first
- remove full-list hydration where possible
- favor `select`, aggregates, pagination, and lazy loading
- benchmark before and after any hot-path change

## 16. Last Known Repo Status

Before this handoff doc was added:

- branch: `main`
- HEAD: `450629a`
- working tree: clean
- latest verified deploy: `schools` project on Vercel
- latest verified production alias: `https://schools-two.vercel.app`
- latest academics navigation patch deployed successfully

After this file is committed, update this section if future work changes deployment state, branch, or release status.
