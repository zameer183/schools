import type { ComponentType } from 'react';
import { BarChart3, Bell, BookOpen, CalendarCheck2, DollarSign, Home, MessageSquare, Settings, Users, UserCog } from 'lucide-react';
import type { UserRole } from '@prisma/client';

export type PanelNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export type PanelRouteMeta = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export const panelNavItems: Record<UserRole, PanelNavItem[]> = {
  ADMIN: [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/students', label: 'Students', icon: Users },
    { href: '/admin/teachers', label: 'Teachers', icon: UserCog },
    { href: '/admin/classes', label: 'Classes', icon: BookOpen },
    { href: '/admin/attendance', label: 'Attendance', icon: CalendarCheck2 },
    { href: '/admin/finance', label: 'Finance', icon: DollarSign },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { href: '/admin/notifications', label: 'Notifications', icon: Bell },
    { href: '/admin/settings', label: 'Settings', icon: Settings }
  ],
  TEACHER: [
    { href: '/teacher', label: 'Dashboard', icon: Home },
    { href: '/teacher/students', label: 'Students', icon: Users },
    { href: '/teacher/progress', label: 'Progress', icon: BarChart3 },
    { href: '/teacher/attendance', label: 'Attendance', icon: CalendarCheck2 },
    { href: '/teacher/assignments', label: 'Assignments', icon: BookOpen },
    { href: '/teacher/messages', label: 'Messages', icon: MessageSquare },
    { href: '/teacher/settings', label: 'Settings', icon: Settings }
  ],
  STUDENT: [
    { href: '/student', label: 'Dashboard', icon: Home },
    { href: '/student/attendance', label: 'Attendance', icon: CalendarCheck2 },
    { href: '/student/schedule', label: 'Schedule', icon: BookOpen },
    { href: '/student/assignments', label: 'Assignments', icon: BookOpen },
    { href: '/student/results', label: 'Results', icon: BarChart3 },
    { href: '/student/fees', label: 'Fees', icon: DollarSign },
    { href: '/student/settings', label: 'Settings', icon: Settings }
  ],
  PARENT: [
    { href: '/parent', label: 'Dashboard', icon: Home },
    { href: '/parent/performance', label: 'Performance', icon: BarChart3 },
    { href: '/parent/attendance', label: 'Attendance', icon: CalendarCheck2 },
    { href: '/parent/fees', label: 'Fees', icon: DollarSign },
    { href: '/parent/notifications', label: 'Notifications', icon: Bell }
  ]
};

export const panelSettingsHref: Partial<Record<UserRole, string>> = {
  ADMIN: '/admin/settings',
  TEACHER: '/teacher/settings',
  STUDENT: '/student/settings',
  PARENT: '/parent'
};

const panelRouteMeta: Record<UserRole, Array<{ path: string; meta: PanelRouteMeta }>> = {
  ADMIN: [
    { path: '/admin/settings', meta: { eyebrow: 'Admin Central', title: 'Configuration Hub', subtitle: 'Institution profile and security controls' } },
    { path: '/admin/notifications', meta: { eyebrow: 'Admin Central', title: 'Communications Hub', subtitle: 'Broadcast notices and delivery status' } },
    { path: '/admin/reports', meta: { eyebrow: 'Admin Central', title: 'Academic Reports', subtitle: 'Exports, summaries, and management insights' } },
    { path: '/admin/finance', meta: { eyebrow: 'Admin Central', title: 'Financial Oversight', subtitle: 'Fee collection, dues, and transaction health' } },
    { path: '/admin/attendance', meta: { eyebrow: 'Admin Central', title: 'Attendance Dashboard', subtitle: 'Daily compliance and class-wise trends' } },
    { path: '/admin/classes', meta: { eyebrow: 'Admin Central', title: 'Curriculum & Class Management', subtitle: 'Subjects, classes, and academic structure' } },
    { path: '/admin/teachers', meta: { eyebrow: 'Admin Central', title: 'Faculty Directory', subtitle: 'Teacher records and staffing overview' } },
    { path: '/admin/students', meta: { eyebrow: 'Admin Central', title: 'Student Registry', subtitle: 'Enroll, update, and manage learners' } },
    { path: '/admin', meta: { eyebrow: 'Admin Central', title: 'Academic Overview', subtitle: 'Institutional dashboard and live metrics' } }
  ],
  TEACHER: [
    { path: '/teacher/settings', meta: { eyebrow: 'Teacher Hub', title: 'Settings', subtitle: 'Profile preferences and account controls' } },
    { path: '/teacher/messages', meta: { eyebrow: 'Teacher Hub', title: 'Messages', subtitle: 'Class communication and inbox review' } },
    { path: '/teacher/assignments', meta: { eyebrow: 'Teacher Hub', title: 'Assignments', subtitle: 'Publish and manage class work' } },
    { path: '/teacher/attendance', meta: { eyebrow: 'Teacher Hub', title: 'Mark Attendance', subtitle: 'Daily classroom attendance workflow' } },
    { path: '/teacher/progress', meta: { eyebrow: 'Teacher Hub', title: 'Student Progress', subtitle: 'Assessment notes and Quran lesson progress' } },
    { path: '/teacher/students', meta: { eyebrow: 'Teacher Hub', title: 'My Class Students', subtitle: 'Learner roster and quick enrollment' } },
    { path: '/teacher', meta: { eyebrow: 'Teacher Hub', title: 'Teacher Dashboard', subtitle: 'Classes, tasks, and student performance' } }
  ],
  STUDENT: [
    { path: '/student/settings', meta: { eyebrow: 'Student Hub', title: 'Settings', subtitle: 'Profile preferences and account controls' } },
    { path: '/student/fees', meta: { eyebrow: 'Student Hub', title: 'Fee Status', subtitle: 'Payments, dues, and billing history' } },
    { path: '/student/results', meta: { eyebrow: 'Student Hub', title: 'Academic Results', subtitle: 'Exams, grades, and performance summary' } },
    { path: '/student/assignments', meta: { eyebrow: 'Student Hub', title: 'Assignments', subtitle: 'Published work and submission status' } },
    { path: '/student/schedule', meta: { eyebrow: 'Student Hub', title: 'Class Schedule', subtitle: 'Weekly subjects and teacher assignments' } },
    { path: '/student/attendance', meta: { eyebrow: 'Student Hub', title: 'Attendance', subtitle: 'Presence summary and recent register' } },
    { path: '/student', meta: { eyebrow: 'Student Hub', title: 'Academic Overview', subtitle: 'Personal progress and recent activity' } }
  ],
  PARENT: [
    { path: '/parent/notifications', meta: { eyebrow: 'Parent Hub', title: 'Notifications', subtitle: 'School notices and alerts' } },
    { path: '/parent/fees', meta: { eyebrow: 'Parent Hub', title: 'Fees', subtitle: 'Payments, dues, and billing history' } },
    { path: '/parent/attendance', meta: { eyebrow: 'Parent Hub', title: 'Attendance', subtitle: 'Presence summary and trends' } },
    { path: '/parent/performance', meta: { eyebrow: 'Parent Hub', title: 'Performance', subtitle: 'Results and academic progress' } },
    { path: '/parent', meta: { eyebrow: 'Parent Hub', title: 'Parent Dashboard', subtitle: 'Children overview and school updates' } }
  ]
};

function findMeta(entries: Array<{ path: string; meta: PanelRouteMeta }>, pathname: string) {
  return entries.find((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`))?.meta ?? entries[entries.length - 1].meta;
}

export function getPanelRouteMeta(role: UserRole, pathname: string): PanelRouteMeta {
  return findMeta(panelRouteMeta[role], pathname);
}
