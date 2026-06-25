# Changelog

## v1.0.1 Patch - 2026-06-25

### Release Summary

Admin performance hotspots were optimized after the `v1.0.0` release tag, with faster warm loads on reports, attendance, finance, student detail, class detail, and messages pages.

### Fixed

- Reduced overfetching on admin reports and detail pages
- Removed an expensive attendance relation sort
- Simplified finance aggregation to avoid long interactive transactions
- Trimmed nested message and roster loads

### Notes

- This patch should be treated as `v1.0.1` because it landed after the `v1.0.0` tag.

## v1.0.0 Stable - 2026-06-25

### Release Summary

Production-ready release for Manarah Institute HMS with stability fixes, performance hardening, and monitoring documentation.

### Added

- Production hardening and monitoring documentation
- `/api/health` endpoint for database reachability checks
- Updated `.env.example` to match the production Supabase/Vercel deployment shape
- Client release notes, handoff document, and executive summary

### Fixed

- Stale production database connection settings
- Teacher settings lookup mismatch
- Finance page date serialization crash

### Verified

- Admin, teacher, student, and parent login flows
- Major dashboard routes
- CRUD workflows for students, teachers, classes, attendance, fees, and messages
- Live Vercel deployment stability after environment correction

### Notes

- The app is recommended as `Production Ready (v1.0.0 Stable)` after the crash-fix and hardening pass.
