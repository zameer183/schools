# Changelog

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
