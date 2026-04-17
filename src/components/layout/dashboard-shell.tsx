'use client';

import type { UserRole } from '@prisma/client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useTransition, useState } from 'react';
import {
  BarChart3, Bell, BookOpen, CalendarCheck2, ChevronDown, DollarSign,
  Home, LogOut, Menu, MessageSquare, Settings, Users, ClipboardList, Zap, ShieldCheck, X
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navByRole: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/students', label: 'Students', icon: Users },
    { href: '/admin/teachers', label: 'Teachers', icon: Users },
    { href: '/admin/classes', label: 'Classes', icon: BookOpen },
    { href: '/admin/attendance', label: 'Attendance', icon: CalendarCheck2 },
    { href: '/admin/finance', label: 'Finance', icon: DollarSign },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { href: '/admin/notifications', label: 'Notifications', icon: Bell },
    { href: '/admin/roles', label: 'Role Management', icon: ShieldCheck },
    { href: '/admin/audit-logs', label: 'Activity Logs', icon: ClipboardList },
    { href: '/admin/automation', label: 'Automation', icon: Zap },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ],
  TEACHER: [
    { href: '/teacher', label: 'Dashboard', icon: Home },
    { href: '/teacher/students', label: 'Students', icon: Users },
    { href: '/teacher/academics', label: 'Academics', icon: ClipboardList },
    { href: '/teacher/progress', label: 'Progress', icon: BarChart3 },
    { href: '/teacher/attendance', label: 'Attendance', icon: CalendarCheck2 },
    { href: '/teacher/assignments', label: 'Assignments', icon: BookOpen },
    { href: '/teacher/messages', label: 'Messages', icon: MessageSquare },
  ],
  STUDENT: [
    { href: '/student', label: 'Dashboard', icon: Home },
    { href: '/student/schedule', label: 'Schedule', icon: BookOpen },
    { href: '/student/assignments', label: 'Assignments', icon: CalendarCheck2 },
    { href: '/student/results', label: 'Results', icon: BarChart3 },
    { href: '/student/fees', label: 'Financials', icon: DollarSign },
    { href: '/student/messages', label: 'Messages', icon: MessageSquare },
  ],
  PARENT: [
    { href: '/parent', label: 'Dashboard', icon: Home },
    { href: '/parent/performance', label: 'Performance', icon: BarChart3 },
    { href: '/parent/attendance', label: 'Attendance', icon: CalendarCheck2 },
    { href: '/parent/fees', label: 'Fees', icon: DollarSign },
    { href: '/parent/notifications', label: 'Notifications', icon: Bell },
  ],
};

const mobileTabsByRole: Partial<Record<UserRole, string[]>> = {
  TEACHER: ['/teacher', '/teacher/students', '/teacher/attendance', '/teacher/messages'],
  STUDENT: ['/student', '/student/schedule', '/student/assignments', '/student/messages']
};

function isActive(pathname: string, href: string, role: UserRole) {
  const rootHrefs: Partial<Record<UserRole, string>> = {
    ADMIN: '/admin',
    TEACHER: '/teacher',
    STUDENT: '/student',
    PARENT: '/parent',
  };
  if (href === rootHrefs[role]) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({
  role,
  fullName,
  children,
}: {
  role: UserRole;
  fullName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = navByRole[role];
  const mobileTabs = (mobileTabsByRole[role] ?? [])
    .map((href) => navItems.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));

  const roleLabel =
    role === 'ADMIN' ? 'Admin' :
    role === 'TEACHER' ? 'Teacher' :
    role === 'STUDENT' ? 'Student' :
    'Parent';

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || roleLabel.slice(0, 2).toUpperCase();

  const doLogout = () => {
    startTransition(async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      } catch {}
    });
  };

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-[#f0f2f0]">
      {sidebarOpen ? (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-[#e2e8e8] bg-white transition-transform md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding */}
        <div className="border-b border-[#e2e8e8] px-5 pb-5 pt-6">
          <div className="mb-3 flex items-center justify-end md:hidden">
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1 text-[#6f7979] hover:bg-[#f0f2f0]"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <Image
            src="/manarah-logo.png"
            alt="Manarah Institute logo"
            width={220}
            height={74}
            className="h-auto w-[220px] max-w-full"
            priority
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href, role);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#004649] text-white'
                    : 'text-[#3d4a4a] hover:bg-[#f0f2f0] hover:text-[#004649]'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex min-h-screen flex-1 flex-col md:pl-[220px]">
        {/* Header */}
        <header className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center justify-between border-b border-[#e2e8e8] bg-white px-4 md:left-[220px] md:px-6">
          <div className="flex items-center">
            <Image
              src="/manarah-logo.png"
              alt="Manarah Institute logo"
              width={148}
              height={32}
              className="h-8 w-auto md:hidden"
              priority
            />
            <div className="hidden md:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6f7979]">{roleLabel}</p>
              <p className="text-sm font-semibold text-[#1a1c1c]">The Scholarly Editorial</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d4dee7] text-[#1a1c1c] md:hidden"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-[#3d4a4a]">{fullName}</span>
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6f7979] hover:bg-[#f0f2f0]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              onClick={() => role === 'ADMIN' ? router.push('/admin/settings') : undefined}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-[#004649] pl-1 pr-2 text-xs font-bold text-white"
              title={fullName}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#005a5e]">{initials}</span>
              <ChevronDown className="h-3 w-3 opacity-80" />
            </button>
            <button
              onClick={doLogout}
              disabled={pending}
              className="hidden items-center gap-1.5 rounded-lg border border-[#d4dee7] bg-white px-3 py-1.5 text-xs font-semibold text-[#1a1c1c] hover:bg-[#f0f2f0] disabled:opacity-60 md:flex"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 px-4 pb-6 pt-16 md:px-6 ${mobileTabs.length > 0 ? 'pb-24 md:pb-6' : ''}`}>
          {children}
        </main>
      </div>

      {mobileTabs.length > 0 ? (
        <nav className="fixed bottom-0 left-0 right-0 z-20 grid h-16 grid-cols-4 border-t border-[#e2e8e8] bg-white md:hidden">
          {mobileTabs.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href, role);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
                  active ? 'text-[#004649]' : 'text-[#6f7979]'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-[#004649]' : 'text-[#6f7979]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
