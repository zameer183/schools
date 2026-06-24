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

const UNREAD_POLL_INTERVAL_MS = 120_000;

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
};

const navByRole: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/students', label: 'Students', icon: Users },
    { href: '/admin/teachers', label: 'Teachers', icon: Users },
    { href: '/admin/academics', label: 'Academics', icon: ClipboardList },
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
    { href: '/teacher/notifications', label: 'Notifications', icon: Bell },
    { href: '/teacher/messages', label: 'Messages', icon: MessageSquare },
  ],
  STUDENT: [
    { href: '/student', label: 'Dashboard', icon: Home },
    { href: '/student/attendance', label: 'Attendance', icon: CalendarCheck2 },
    { href: '/student/progress', label: 'Progress', icon: BarChart3 },
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
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { t } = useLanguage();

  const navItems = useMemo(
    () =>
      navByRole[role].map((item) => {
        const translatedLabel = t(item.label);
        const isMessages = item.href.endsWith('/messages');
        const isNotifications = item.href.endsWith('/notifications');
        const onMessagesPage = isMessages && (pathname === item.href || pathname.startsWith(`${item.href}/`));
        const onNotificationsPage = isNotifications && (pathname === item.href || pathname.startsWith(`${item.href}/`));
        return {
          ...item,
          label: translatedLabel,
          badgeCount: onMessagesPage
            ? 0
            : onNotificationsPage
              ? 0
              : isMessages
                ? unreadMessages
                : isNotifications
                  ? unreadNotifications
                  : 0
        };
      }),
    [role, t, unreadMessages, unreadNotifications, pathname]
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

  useEffect(() => {
    // Intentionally disabled aggressive prefetch to avoid noisy failing _rsc requests.
    // Keep navigation explicit and stable across role-based pages.
  }, [pathname, role, router]);

  useEffect(() => {
    let cancelled = false;
    let shouldStop = false;
    let intervalId: number | null = null;

    const syncUnreadCounts = async () => {
      if (document.hidden || shouldStop) return;
      try {
        const [msgRes, notifRes] = await Promise.all([
          fetch('/api/messages?countOnly=1', { cache: 'no-store' }),
          fetch('/api/notifications?countOnly=1', { cache: 'no-store' })
        ]);

        if (cancelled) return;

        if (msgRes.status === 401 || notifRes.status === 401 || msgRes.status === 403 || notifRes.status === 403) {
          shouldStop = true;
          setUnreadMessages(0);
          setUnreadNotifications(0);
          return;
        }

        if (msgRes.ok) {
          const data = (await msgRes.json()) as { unreadCount?: number };
          setUnreadMessages(Number(data.unreadCount ?? 0));
        }
        if (notifRes.ok) {
          const data = (await notifRes.json()) as { unreadCount?: number };
          setUnreadNotifications(Number(data.unreadCount ?? 0));
        }
      } catch {
        // ignore transient polling errors
      }
    };

    const startPolling = () => {
      if (intervalId !== null || shouldStop || document.hidden) return;
      intervalId = window.setInterval(() => {
        if (shouldStop || document.hidden) return;
        void syncUnreadCounts();
      }, UNREAD_POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalId === null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
        return;
      }
      void syncUnreadCounts();
      startPolling();
    };

    void syncUnreadCounts();
    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const messagesHref =
      role === 'ADMIN' ? '/admin/messages' :
      role === 'TEACHER' ? '/teacher/messages' :
      role === 'STUDENT' ? '/student/messages' :
      '';
    const notificationsHref =
      role === 'ADMIN' ? '/admin/notifications' :
      role === 'TEACHER' ? '/teacher/notifications' :
      role === 'STUDENT' ? '/student/notifications' :
      role === 'PARENT' ? '/parent/notifications' :
      '';

    const isMessagesPage = messagesHref && (pathname === messagesHref || pathname.startsWith(`${messagesHref}/`));
    const isNotificationsPage = notificationsHref && (pathname === notificationsHref || pathname.startsWith(`${notificationsHref}/`));

    if (!document.hidden && (isMessagesPage || isNotificationsPage)) {
      router.refresh();
    }
  }, [pathname, role, router]);

  useEffect(() => {
    const messagesHref =
      role === 'ADMIN' ? '/admin/messages' :
      role === 'TEACHER' ? '/teacher/messages' :
      role === 'STUDENT' ? '/student/messages' :
      '';
    if (!messagesHref) return;
    if (!(pathname === messagesHref || pathname.startsWith(`${messagesHref}/`))) return;

    let cancelled = false;
    const markAllMessagesRead = async () => {
      try {
        const res = await fetch('/api/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markAll: true }),
        });
        if (!cancelled && res.ok) setUnreadMessages(0);
      } catch {
        // ignore transient errors
      }
    };
    void markAllMessagesRead();
    return () => {
      cancelled = true;
    };
  }, [pathname, role]);

  return (
    <div className="flex min-h-screen overflow-x-clip bg-[#F8FAFC] print:overflow-visible">
      {/* Desktop sidebar - always visible on md+ */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[220px] flex-col border-r border-[#e2e8e8]/60 bg-[#f3f4f5] md:flex print:hidden">
        {/* Branding */}
        <div className="border-b border-[#e2e8e8] px-5 pb-5 pt-6">
          <Link href={instituteProfilePath} prefetch={false}>
            <Image
              src="/manarah-logo.png"
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
                prefetch={false}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[#004649] to-[#1b5e62] text-white shadow-sm'
                    : 'text-[#3d4a4a] hover:bg-white hover:shadow-sm hover:text-[#004649]'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {(item.badgeCount ?? 0) > 0 ? (
                  <span
                    className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-[#dbeafe] text-[#1d4ed8]'
                    }`}
                  >
                    {item.badgeCount! > 99 ? '99+' : item.badgeCount}
                  </span>
                ) : null}
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
        <header className="fixed left-0 right-0 top-0 z-20 flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white/85 px-5 shadow-[0_4px_14px_rgba(15,23,42,0.05)] backdrop-blur-xl md:left-[220px] md:px-6 print:hidden">
          <div className="flex min-w-0 items-center">
            <Link href={instituteProfilePath} prefetch={false} className="flex items-center md:hidden">
              <Image
                src="/manarah-logo.png"
                alt="Manarah Institute logo"
                width={666}
                height={245}
                className="h-9 w-auto max-w-[142px] object-contain"
                priority
              />
            </Link>
            <div className="hidden md:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6f7979]">{roleLabel}</p>
              <p className="text-sm font-semibold text-[#1a1c1c]">{t('Manarah Institute')}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F5F9] text-[#475569] transition hover:bg-[#E2E8F0] md:hidden"
              aria-label="Open sidebar menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden max-w-[10rem] truncate text-sm font-medium text-[#3d4a4a] md:inline">
              {fullName}
            </span>
            <Link
              href={notificationPath}
              prefetch={false}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#EF4444]" />
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
            <div className="hidden md:block">
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
        <main className={`w-full min-w-0 flex-1 overflow-x-hidden print:overflow-visible px-5 pb-24 md:pb-6 print:pb-0 print:px-0 ${hideHeader ? 'pt-4' : 'pt-[76px]'} md:px-6 print:pt-0`}>
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
