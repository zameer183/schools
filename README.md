# Stitch HMS - Full-Stack Student Management System

Production-ready HMS built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Stack
- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma ORM
- Role-based authentication (Admin, Teacher, Student, Parent)
- Local file storage (`public/uploads`) for assignments, notes, and submissions

## Features Included
- Admin panel: KPI dashboard, students/staff, academics, attendance, finance, reports export, notifications
- Teacher panel: class overview, attendance workflow, assignment creation/review, messaging
- Student panel: dashboard, schedule, assignments, results/GPA, fee status
- Parent panel: children overview, performance, attendance, fee tracking, notifications
- Shared systems: messaging, notification center, RBAC middleware, upload API, CSV export API

## Project Structure
- `app/` UI routes + API route handlers
- `src/lib/` core services (auth, prisma, rbac, validators, storage, exports)
- `src/components/` dashboard layout + reusable UI components
- `prisma/schema.prisma` HMS relational schema
- `prisma/seed.ts` demo data seeding script

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env
   ```
   Update `DATABASE_URL` and `JWT_SECRET`.
3. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
4. Run migrations:
   ```bash
   npm run prisma:migrate
   ```
5. Seed sample data:
   ```bash
   npm run prisma:seed
   ```
6. Start dev server:
   ```bash
   npm run dev
   ```

## Demo Credentials
- Admin: `admin@stitchhms.com` / `Pass@123`
- Teacher: `teacher@stitchhms.com` / `Pass@123`
- Student: `student@stitchhms.com` / `Pass@123`
- Parent: `parent@stitchhms.com` / `Pass@123`

## API Surface (Representative)
- Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Core data: `/api/students`, `/api/teachers`, `/api/classes`, `/api/subjects`
- Workflows: `/api/attendance`, `/api/exams`, `/api/results`, `/api/assignments`, `/api/messages`, `/api/notifications`
- Finance: `/api/fees`, `/api/payments`
- Assets/exports: `/api/uploads`, `/api/reports/export`

## Scalability Notes
- Domain-based API handlers and service utilities
- Strict role guards via middleware + API-level RBAC checks
- Prisma relational modeling with audit fields and unique constraints
- Easy extension path for S3/Blob storage adapter and PDF generation microservice
