# Client Release Notes - v1.0.0 Stable

**Release date:** 2026-06-25

## What's New

- Production-stable release of the Manarah Institute HMS
- Finalized admin, teacher, student, and parent role flows
- Added a production health-check endpoint for monitoring
- Updated deployment and environment documentation for Vercel + Supabase

## Major Performance Improvements

- Heaviest admin pages were optimized to reduce unnecessary data loading
- Finance, reports, academics, and attendance paths now use safer query patterns
- Dashboard fallbacks were hardened to reduce crash risk during database issues
- Live API CRUD flows were verified after environment correction

## Stability Improvements

- Fixed production `DATABASE_URL` / `DIRECT_URL` drift in Vercel
- Improved graceful fallback behavior when PostgreSQL is temporarily unavailable
- Added better friendly error states instead of hard crashes on key routes
- Standardized date serialization in finance rendering

## Bug Fixes

- Teacher settings page now looks up the teacher record correctly
- Finance page no longer crashes when serializing non-Date values
- Student and teacher login flows now complete reliably in production
- Multiple CRUD routes now return clear validation and conflict responses

## Monitoring / Health

- Added `GET /api/health`
- Returns `200` when the database is reachable
- Returns `503` when the app is degraded or the database is unavailable

## Known Limitations

- WhatsApp delivery depends on the external provider being available
- Some fallback behavior still depends on correct Supabase service-role configuration
- Parent dashboards can show an empty state if no children are linked yet

