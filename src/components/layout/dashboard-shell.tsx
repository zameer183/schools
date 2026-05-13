'use client';

import type { UserRole } from '@prisma/client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useTransition, useState } from 'react';
import {
  BarChart3, Bell, BookOpen, CalendarCheck2, DollarSign,
  Home, LogOut, Menu, MessageSquare, Settings, Users, ClipboardList, Zap, ShieldCheck
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/language/language-switcher';
import { useLanguage } from '@/components/language/language-provider';
import { MobileDrawer } from './MobileDrawer';
import { MobileBottomNav } from './MobileBottomNav';

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
    { href: '/admin/progress', label: 'Progress', icon: BarChart3 },
    { href: '/admin/finance', label: 'Finance', icon: DollarSign },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
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
    { href: '/teacher/notifications', label: 'Notifications', icon: Bell },
    { href: '/teacher/messages', label: 'Messages', icon: MessageSquare },
  ],
  STUDENT: [
    { href: '/student', label: 'Dashboard', icon: Home },
    { href: '/student/attendance', label: 'Attendance', icon: CalendarCheck2 },
    { href: '/student/progress', label: 'Progress', icon: BarChart3 },
    { href: '/student/schedule', label: 'Schedule', icon: BookOpen },
    { href: '/student/assignments', label: 'Assignments', icon: CalendarCheck2 },
    { href: '/student/results', label: 'Results', icon: BarChart3 },
    { href: '/student/fees', label: 'Financials', icon: DollarSign },
    { href: '/student/notifications', label: 'Notifications', icon: Bell },
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
  const { t } = useLanguage();

  const navItems = useMemo(
    () => navByRole[role].map((item) => ({ ...item, label: t(item.label) })),
    [role, t]
  );
  const hideHeader = pathname.startsWith('/admin/students/enroll');

  const roleLabelRaw =
    role === 'ADMIN' ? 'Admin' :
    role === 'TEACHER' ? 'Teacher' :
    role === 'STUDENT' ? 'Student' :
    'Parent';
  const roleLabel = t(roleLabelRaw);

  const notificationPath =
    role === 'ADMIN' ? '/admin/notifications' :
    role === 'PARENT' ? '/parent/notifications' :
    role === 'TEACHER' ? '/teacher/notifications' :
    '/student/notifications';

  const instituteProfilePath =
    role === 'ADMIN' ? '/admin/institute' :
    role === 'TEACHER' ? '/teacher/institute' :
    role === 'STUDENT' ? '/student/institute' :
    '/parent/institute';

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || roleLabelRaw.slice(0, 2).toUpperCase();

  const doLogout = () => {
    startTransition(async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
      } catch {}
    });
  };

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen overflow-x-clip print:overflow-visible bg-[#f3f4f5]">
      {/* Desktop sidebar - always visible on md+ */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[220px] flex-col border-r border-[#e2e8e8]/60 bg-[#f3f4f5] md:flex print:hidden">
        {/* Branding */}
        <div className="border-b border-[#e2e8e8] px-5 pb-5 pt-6">
          <Link href={instituteProfilePath}>
            <Image
              src="/manarah-p4.png"
              alt="Manarah Institute logo"
              width={1382}
              height={504}
              className="h-auto w-[170px] object-contain"
              priority
            />
          </Link>
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
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[#004649] to-[#1b5e62] text-white shadow-sm'
                    : 'text-[#3d4a4a] hover:bg-white hover:shadow-sm hover:text-[#004649]'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#e2e8e8] px-3 py-4">
          <button
            onClick={doLogout}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] border-0 px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {t('Logout')}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div className="print:hidden">
      <MobileDrawer
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navItems={navItems}
        fullName={fullName}
        role={role}
        doLogout={doLogout}
        pathname={pathname}
      />
      </div>

      {/* Main area */}
      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col md:pl-[220px] print:pl-0">
        {/* Header */}
        {!hideHeader ? (
        <header className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center justify-between bg-white/90 backdrop-blur-md border-b border-[#e2e8e8]/60 shadow-[0_1px_20px_rgba(0,70,73,0.06)] px-4 md:left-[220px] md:px-6 print:hidden">
          <div className="flex min-w-0 items-center">
            <Link href={instituteProfilePath} className="md:hidden">
              <Image
                src="/manarah-p4.png"
                alt="Manarah Institute logo"
                width={1382}
                height={504}
                className="h-auto w-[108px] object-contain max-[360px]:w-[92px]"
                priority
              />
            </Link>
            <div className="hidden md:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6f7979]">{roleLabel}</p>
              <p className="text-sm font-semibold text-[#1a1c1c]">{t('Manarah Institute')}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d4dee7] text-[#1a1c1c] md:hidden"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="hidden max-w-[10rem] truncate text-sm font-medium text-[#3d4a4a] md:inline">
              {fullName}
            </span>
            <Link
              href={notificationPath}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6f7979] hover:bg-[#f0f2f0]"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Link>
            <div className="hidden md:block">
              {role !== 'ADMIN' ? (
                <div
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#004649] pl-1 pr-2 text-xs font-bold text-white"
                  title={fullName}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#005a5e]">{initials}</span>
                </div>
              ) : null}
            </div>
            <div className="max-[360px]:hidden">
              <LanguageSwitcher />
            </div>
            <button
              onClick={doLogout}
              disabled={pending}
              className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] border-0 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60 md:flex"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('Logout')}
            </button>
          </div>
        </header>
        ) : null}

        {/* Page content */}
        <main className={`w-full min-w-0 flex-1 overflow-x-hidden print:overflow-visible px-4 pb-24 md:pb-6 print:pb-0 print:px-0 ${hideHeader ? 'pt-4' : 'pt-16'} md:px-6 print:pt-0`}>
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <div className="print:hidden">
        <MobileBottomNav navItems={navItems} role={role} doLogout={doLogout} pathname={pathname} />
      </div>
    </div>
  );
}
