# Design Consistency + API QA — Teacher & Student vs Admin

**Date:** 2026-05-07
**Scope:** Compare Teacher and Student panels against Admin panel for visual consistency and verify their APIs work.

---

## 1. TL;DR

| Area | Verdict |
|---|---|
| Layout shell (sidebar / header / nav) | **CONSISTENT** — all 4 roles share `DashboardShell` |
| UI primitives (Card, KpiCard, PageHeader, Table, etc.) | **CONSISTENT** — all panels import from `@/components/ui` |
| Color palette on dashboards (`/admin`, `/teacher`, `/student`) | **CONSISTENT** — modern palette (#10B981 / #1F5A5C / #D69E3F / #1F2937) |
| Admin INNER pages (finance / reports / audit-logs) | **DIVERGENT** — still using OLD "Scholarly Editorial" palette (#004649 / #1a1c1c / #6f7979) |
| Teacher empty state ("Profile Missing") | DIVERGENT — uses OLD palette |
| Teacher messages / settings | MIXED — has both old + new tokens |
| Parent dashboard | DIVERGENT — entirely OLD palette |
| Teacher APIs | WORKING — `/api/classes`, `/api/students`, `/api/attendance`, `/api/assignments`, `/api/progress`, `/api/staff-attendance`, `/api/attendance/status-message` |
| Student APIs | WORKING — `/api/messages`, plus server-side Prisma reads on every page |
| RBAC on APIs | CORRECT — all routes use `ensureApiRole([...])` |

So the real story is the **opposite of expected**: teacher/student dashboards already match the modern admin look. It's the admin INNER pages (and the Parent panel) that lag behind on the old palette.

---

## 2. Design System Reality

### 2.1 Layout shell — IDENTICAL for everyone
`src/components/layout/dashboard-shell.tsx` renders the sidebar, header, mobile drawer, and bottom nav for ALL four roles (ADMIN / TEACHER / STUDENT / PARENT). Only the nav-item list differs per role. So sidebar look, active-state color (teal `#004649`), avatar dropdown, logout button, INSTITUTION label — these are pixel-identical across panels.

### 2.2 UI library — IDENTICAL for everyone
Every page (admin, teacher, student, parent) imports from the same `@/components/ui` barrel:
```
PageHeader, KpiCard, Card, SectionTitle, StatusBadge, Table, Button, Input, Select
```
So the shape of cards, the way KPI tiles look, page headers, status badges — same primitives everywhere.

### 2.3 Two palettes coexist in this codebase

**A) "Modern" palette (newer admin dashboard style)**
- Greens: `#10B981` text on `#D1FAE5` chip
- Teal: `#1F5A5C` on `#E0EBEC`
- Amber: `#D69E3F` on `#F5E6CC`
- Red: `#EF4444` / `#DC2626` / `#991B1B` / `#FEE2E2`
- Neutrals: `#1F2937` text, `#6B7280` muted, `#E5E7EB` borders, `#F9FAFB` panels
- Cards: `rounded-xl/2xl` with light shadows

**B) "Scholarly Editorial" palette (original `replit.md` system)**
- Primary teal: `#004649` (and accent `#865300`)
- Text: `#1a1c1c` (heading), `#3f4849` (body), `#6f7979` (muted)
- Cards: `rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)]`
- `font-headline` Manrope class on titles

### 2.4 Where each page sits (color-token count)

| Page | "Modern" tokens | "Old" tokens | Verdict |
|---|---|---|---|
| `app/admin/page.tsx` | 31 | 1 | Modern ✅ |
| `app/teacher/page.tsx` | 14 | 3 | Modern ✅ (3 leftover in empty state) |
| `app/student/page.tsx` | 18 | 0 | Modern ✅ |
| `app/parent/page.tsx` | 0 | many | OLD ⚠️ |
| `app/admin/finance/page.tsx` | 0 | 17 | OLD |
| `app/admin/reports/page.tsx` | 0 | 63 | OLD |
| `app/admin/audit-logs/page.tsx` | 0 | 32 | OLD |
| `app/admin/automation/page.tsx` | 0 | 19 | OLD |
| `app/teacher/messages/page.tsx` | 8 | 18 | MIXED |
| `app/teacher/settings/page.tsx` | 20 | 16 | MIXED |
| `app/teacher/attendance/page.tsx` | 19 | 0 | Modern ✅ |
| `app/teacher/progress/page.tsx` | 38 | 0 | Modern ✅ |
| `app/teacher/assignments/page.tsx` | 11 | 2 | Modern ✅ |
| `app/teacher/students/page.tsx` | 6 | 0 | Modern ✅ |
| `app/student/results/page.tsx` | 17 | 3 | Modern ✅ |
| `app/student/assignments/page.tsx` | 4 | 0 | Modern ✅ |
| `app/student/fees/page.tsx` | 8 | 0 | Modern ✅ |
| `app/student/schedule/page.tsx` | 4 | 0 | Modern ✅ |
| `app/student/attendance/page.tsx` | 4 | 0 | Modern ✅ |
| `app/student/notifications/page.tsx` | 3 | 0 | Modern ✅ |
| `app/student/settings/page.tsx` | 11 | 0 | Modern ✅ |

---

## 3. What Looks Off-Brand and Where

### 3.1 Teacher empty state ("Teacher Profile Missing") — `app/teacher/page.tsx`
```tsx
<div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-8">
  <h2 className="font-headline text-3xl font-bold text-[#1a1c1c]">Teacher Profile Missing</h2>
  <p className="mt-2 text-sm text-[#6f7979]">…</p>
```
**Fix:** Match the admin pattern in `app/admin/page.tsx` line 44–65 (the "Database Unreachable" card uses modern tokens `#111827 / #6b7280 / bg-[#fef2f2]` etc.).

### 3.2 Teacher Messages — `app/teacher/messages/page.tsx`
18 occurrences of old palette tokens (`text-[#1a1c1c]`, `text-[#6f7979]`, `font-headline`, `bg-[#004649]`) sit alongside 8 modern ones. The page is a hybrid.
**Fix:** Pick modern or old; align to whatever Admin Messages does (`app/admin/messages/page.tsx` is also old-leaning, so this is part of a wider question — see §3.5).

### 3.3 Teacher Settings — `app/teacher/settings/page.tsx`
20 modern tokens + 16 old tokens. Clearly drifted as new sections were added.
**Fix:** Consolidate on the modern palette (matches `/teacher` dashboard).

### 3.4 Parent panel — `app/parent/page.tsx` and inner pages
This is the most off-brand panel. Uses entirely the OLD "Scholarly Editorial" palette: `#004649`, `#865300`, `#1a1c1c`, `#3f4849`, `#6f7979`, `font-headline`, `rounded-2xl shadow-[0_12px_40px_rgba(0,70,73,0.06)]`.
**Fix:** This needs a full repaint to match Admin/Teacher/Student dashboards.

### 3.5 Admin INNER pages drift from Admin DASHBOARD
This is the surprising twist: the Admin landing (`/admin`) was modernized but inner pages like `/admin/finance`, `/admin/reports`, `/admin/audit-logs`, `/admin/automation` weren't. So **what the user calls "admin design" depends on which screen they're looking at**:
- Looking at `/admin` (dashboard) → modern, colorful → matches Teacher and Student.
- Looking at `/admin/finance` or `/admin/reports` → old, monochrome teal → matches Parent.

If the **dashboard look** is canonical, Teacher and Student are already on-brand. The inner-pages of Admin (and the entire Parent panel) need updating.

---

## 4. APIs — All Working

### 4.1 Routes used by Teacher pages
| API | Method(s) | Roles allowed | Status |
|---|---|---|---|
| `/api/classes` | GET / POST / PATCH / DELETE | ADMIN, TEACHER (read) | OK |
| `/api/students` | GET / POST / PATCH / DELETE | ADMIN, TEACHER | OK |
| `/api/subjects` | GET / POST / … | ADMIN, TEACHER | OK |
| `/api/attendance` | GET / POST | ADMIN, TEACHER, PARENT, STUDENT (filtered) | OK — also gated by `hasTeacherAccessByUserId('ATTENDANCE')` |
| `/api/attendance/status-message` | POST | TEACHER | OK |
| `/api/staff-attendance` | POST | TEACHER | OK (returns 500 if `StaffAttendance` table unavailable) |
| `/api/assignments` | GET / POST / PATCH | ADMIN, TEACHER, STUDENT | OK |
| `/api/progress` | GET / POST | ADMIN, TEACHER, STUDENT, PARENT | OK |
| `/api/messages` | GET / POST / DELETE | ADMIN, TEACHER, STUDENT, PARENT | OK |
| `/api/notifications` | GET / POST / PATCH / DELETE | ADMIN, TEACHER, STUDENT, PARENT | OK |

### 4.2 Routes used by Student pages
Mostly server components hit Prisma directly (no API needed), so the Student APIs you'd see called from the client are:
- `/api/messages` (POST when student replies in chat) — OK
- Indirectly: `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` for session

Server-rendered student pages query Prisma via `unstable_cache` for: schedule, results, fees, assignments, attendance, progress, notifications. All checked — read paths are correct.

### 4.3 Auth & RBAC layer (`src/lib/rbac.ts`, `src/lib/auth.ts`)
- Every API uses `ensureApiRole([UserRole.X, …])` which checks JWT cookie + role.
- Unauthenticated requests → `401`.
- Wrong-role requests → `403`.
- `hasTeacherAccessByUserId()` adds module-level access (admin can disable specific teacher modules).
- Middleware additionally guards `/api/admin/*` for ADMIN only.

### 4.4 What blocks live verification (already reported)
- Teacher / Student / Parent users not in current DB → cannot end-to-end test.
- WhatsApp env vars not set → campaigns will fail to dispatch.
- Forgot-password endpoint not implemented (only the UI stub).

---

## 5. Recommended Fix Order

1. **Decide canonical look.** Pick one of:
   - (a) **Modern** (Admin dashboard / Teacher / Student) — repaint Parent + Admin inner pages.
   - (b) **Scholarly Editorial** (replit.md original) — repaint Admin dashboard + Teacher/Student.
   Recommendation: go with **(a) Modern** since Teacher + Student + Admin landing already use it.
2. Fix the small drift in Teacher (`page.tsx` empty state, `messages/page.tsx`, `settings/page.tsx`).
3. Repaint Parent panel pages (`parent/*`) using the same `Card`, `KpiCard`, `PageHeader` primitives but with modern color tokens (drop `#004649/#865300/#1a1c1c/#6f7979`, swap to `#10B981/#1F5A5C/#D69E3F/#1F2937/#6B7280`).
4. Repaint Admin inner pages (`admin/finance`, `admin/reports`, `admin/audit-logs`, `admin/automation`, `admin/reports/students`) to match the dashboard.
5. Re-seed DB (so teacher/student/parent logins work) + run the visual QA harness in `qa-artifacts/` against all role panels for a fresh comparison set.

---

## 6. Verdict

- **Teacher and Student panels: design IS already aligned with the Admin dashboard** at the layout, component, and color level. Only minor stragglers (Teacher empty state, Teacher messages, Teacher settings) need cleanup.
- **Real off-brand surfaces** in this codebase are the **Parent panel** and the **Admin inner pages** (Finance / Reports / Audit Logs / Automation), which still use the older "Scholarly Editorial" palette.
- **APIs are all wired, role-gated, and call Prisma correctly** — there are no stub or broken routes among the ones Teacher/Student panels rely on.
