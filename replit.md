# Stitch HMS — The Scholarly Editorial

## Overview
A full-featured, role-based School Management System (HMS) for Islamic educational institutions. Supports multi-role dashboards for Admin, Teacher, Student, and Parent. UI is aligned to the reference design from `https://github.com/zameer183/schools/tree/main/design_and_screenshots_archive`.

## Stack
- **Framework:** Next.js 15 (App Router, Turbopack)
- **Database:** PostgreSQL via Replit's built-in DB (accessed through `DATABASE_URL`)
- **ORM:** Prisma
- **Auth:** JWT (cookie-based), `JWT_SECRET` stored as Replit secret
- **Styling:** Tailwind CSS
- **Fonts:** Manrope (headlines) + Inter (body) via Google Fonts in `app/layout.tsx`

## Port
App runs on **port 5000** (configured in `scripts/dev.mjs`).

## Design System — "Scholarly Editorial"
- **Primary teal:** `#004649`
- **Background:** `#f0f2f0`
- **Card surface:** `#ffffff` with `border border-[#e2e8e8]`
- **Cards:** `rounded-xl` (not rounded-2xl/3xl)
- **No box shadows** — border-only card separation
- **Page headings:** `text-3xl font-bold text-[#1a1c1c]` inside first card of each page
- **Sub-section headings:** `font-semibold text-[#1a1c1c]`
- **Muted text:** `text-[#6f7979]` or `text-sm`
- **Active nav item:** `bg-[#004649] text-white`

## Roles & Routes
| Role | Root Route |
|------|------------|
| ADMIN | `/admin` |
| TEACHER | `/teacher` |
| STUDENT | `/student` |
| PARENT | `/parent` |

## Key Files
- `app/globals.css` — Global styles
- `app/layout.tsx` — Root layout with Google Fonts
- `app/(auth)/login/page.tsx` — Login: two-panel design
- `src/components/layout/dashboard-shell.tsx` — Unified sidebar + header for all roles
- `app/admin/page.tsx` — Admin dashboard (KPI cards, charts)
- `app/student/page.tsx` — Student dashboard
- `app/teacher/page.tsx` — Teacher dashboard
- `app/parent/page.tsx` — Parent dashboard

## Completed Design Alignment (vs reference screenshots)
- [x] DashboardShell: white sidebar, teal active nav, INSTITUTION label, role in header
- [x] Header: avatar with ChevronDown, logout button with icon
- [x] All page headings upgraded to text-3xl font-bold
- [x] Student Results: simplified to heading card + table (Exam, Subject, Marks, Grade, Date) — no extra stat tiles
- [x] Student Assignments: simplified to heading card + list — no extra stat tiles
- [x] Student Schedule: subject cards show Name, Code, Teacher, Credit Hours on separate lines
- [x] Student Fees: heading card with inline summary + table (Title, Due Date, Amount, Paid, Status)
- [x] Admin Finance: inline stats in heading card + 2-col (Transactions + Dues)
- [x] Admin Reports: inline stats + 2-col (Quick Export + Operational Summary) + payments table
- [x] Admin Notifications: inline stats + Create Broadcast form + Recent Notifications table
- [x] Admin Attendance: heading + filters + 4 colored stat tiles + register table
- [x] Teacher Attendance: heading + selects + Mark All Present in card 1; Students table in card 2
- [x] Teacher Assignments: heading + form in card 1; Published Assignments table in card 2
- [x] Teacher Messages: recipients listed inline (no nested border wrapper)
- [x] Teacher Progress: Daily Progress form + Progress Log table

## Environment Secrets
- `JWT_SECRET` — for JWT signing (set via Replit secrets)
- `DATABASE_URL` — auto-provided by Replit PostgreSQL
- `NEXT_PUBLIC_APP_NAME` — set to "Stitch HMS"
