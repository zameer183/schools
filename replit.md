# Scholarly Editorial — HMS (Manarah Institute)

## Overview
A full-featured, role-based Student HMS (Hostel/Academic Management System) for Manarah Institute, migrated from Vercel to Replit and redesigned with the "Scholarly Editorial / Manarah Slate" design system.

## Stack
- **Framework:** Next.js 15 (App Router, Turbopack)
- **Database:** PostgreSQL via Replit's built-in DB (accessed through `DATABASE_URL`)
- **ORM:** Prisma
- **Auth:** JWT (cookie-based), `JWT_SECRET` stored as Replit secret
- **Styling:** Tailwind CSS + custom CSS tokens in `app/globals.css`
- **Fonts:** Manrope (headlines) + Inter (body) via Google Fonts in `app/layout.tsx`

## Port
App runs on **port 5000** (configured in `scripts/dev.mjs`).

## Design System — "Manarah Slate"
- **Primary:** `#004649` (teal)
- **Secondary:** `#865300` (gold/amber)
- **Surfaces:** `#f8f9fa` / `#f3f4f5` / `#edeeef` / `#ffffff`
- **No 1px border rule:** Sections separated by background color shifts only
- **Cards:** `rounded-2xl`/`rounded-3xl` with `shadow-[0_12px_40px_rgba(0,70,73,0.06)]`
- **Headline font:** Manrope (class: `font-headline`)
- **Body font:** Inter

## Roles & Routes
| Role | Root Route |
|------|------------|
| ADMIN | `/admin` |
| TEACHER | `/teacher` |
| STUDENT | `/student` |
| PARENT | `/parent` |

## Key Files
- `app/globals.css` — Design tokens (CSS variables)
- `app/layout.tsx` — Root layout with Google Fonts
- `app/(auth)/login/page.tsx` — Login: two-panel card design
- `src/components/admin/admin-sidebar.tsx` — Admin sidebar
- `src/components/admin/admin-header.tsx` — Admin header (glassmorphism)
- `app/admin/page.tsx` — Admin dashboard (KPI cards, charts, tables)
- `app/student/page.tsx` — Student dashboard
- `app/teacher/page.tsx` — Teacher dashboard
- `app/parent/page.tsx` — Parent dashboard

## Completed UI Redesign
- [x] Login page (two-panel Stitch card)
- [x] Admin sidebar + header
- [x] Admin dashboard (KPI cards, attendance chart, financial pulse, admissions table)
- [x] Student dashboard (KPI cards, course progress bars, results)
- [x] Teacher dashboard (KPI cards, assignments, classes)
- [x] Parent dashboard (children list, activity feed, resources)
- [x] globals.css design tokens
- [x] layout.tsx with Google Fonts

## Environment Secrets
- `JWT_SECRET` — for JWT signing (set via Replit secrets)
- `DATABASE_URL` — auto-provided by Replit PostgreSQL
