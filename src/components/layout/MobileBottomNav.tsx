'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { LogOut, MoreHorizontal } from 'lucide-react';
import type { UserRole } from '@prisma/client';
import { BottomSheet } from './BottomSheet';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const mobilePrimaryByRole: Record<UserRole, string[]> = {
  ADMIN: ['/admin', '/admin/students', '/admin/attendance', '/admin/finance'],
  TEACHER: ['/teacher', '/teacher/students', '/teacher/attendance', '/teacher/messages'],
  STUDENT: ['/student', '/student/attendance', '/student/progress', '/student/fees', '/student/messages'],
  PARENT: ['/parent', '/parent/performance', '/parent/fees', '/parent/attendance'],
};

export function MobileBottomNav({
  navItems,
  role,
  doLogout,
  pathname,
}: {
  navItems: NavItem[];
  role: UserRole;
  doLogout: () => void;
  pathname: string;
}) {
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const compactLabel: Record<string, string> = {
    Dashboard: 'Home',
    Notifications: 'Alerts',
    Financials: 'Fees'
  };

  const { primaryItems, moreItems } = useMemo(() => {
    const primaryHrefs = mobilePrimaryByRole[role] ?? [];
    const orderedPrimary = primaryHrefs
      .map((href) => navItems.find((item) => item.href === href))
      .filter((item): item is NavItem => Boolean(item));
    const primary = orderedPrimary.slice(0, 4);
    const overflowPrimary = orderedPrimary.slice(4);
    const more = [
      ...overflowPrimary,
      ...navItems.filter((item) => !primaryHrefs.includes(item.href))
    ];
    return { primaryItems: primary, moreItems: more };
  }, [navItems, role]);

  function isActive(href: string) {
    const rootByRole: Record<UserRole, string> = {
      ADMIN: '/admin',
      TEACHER: '/teacher',
      STUDENT: '/student',
      PARENT: '/parent',
    };
    const root = rootByRole[role];
    if (href === root) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <nav className={`fixed z-40 grid grid-cols-5 backdrop-blur-xl md:hidden ${
        role === 'TEACHER'
          ? 'bottom-0 left-0 right-0 h-[86px] border-t border-[#E2E8F0] bg-white/90 px-6 pb-6 pt-2 shadow-[0_-10px_26px_rgba(15,23,42,0.05)]'
          : 'bottom-3 left-3 right-3 h-[74px] rounded-[24px] border border-[#E6ECF2] bg-white/95 p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.14)]'
      }`}>
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-medium leading-tight transition ${
                role === 'TEACHER'
                  ? active
                    ? 'text-[#0D9488]'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                  : active
                    ? 'bg-[#E6F4F1] text-[#1F5A5C]'
                    : 'text-[#64748B] hover:text-[#1F5A5C]'
              }`}
            >
              <Icon className={`h-5 w-5 ${
                role === 'TEACHER'
                  ? active ? 'text-[#0D9488]' : 'text-[#94A3B8]'
                  : active ? 'text-[#1F5A5C]' : 'text-[#64748B]'
              }`} />
              <span className="truncate max-w-full">{compactLabel[item.label] ?? item.label}</span>
              {active ? (
                <span className={`absolute -bottom-1 h-1 rounded-full ${role === 'TEACHER' ? 'w-1 bg-[#0D9488] shadow-[0_0_10px_rgba(13,148,136,0.3)]' : 'w-8 bg-[#1F5A5C]'}`} />
              ) : null}
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreSheetOpen(true)}
          className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-medium leading-tight transition-colors ${
            role === 'TEACHER' ? 'text-[#64748B] hover:text-[#0F172A]' : 'text-[#64748B] hover:text-[#1F5A5C]'
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>

      {/* More options bottom sheet */}
      <BottomSheet isOpen={moreSheetOpen} onClose={() => setMoreSheetOpen(false)} title="More Options">
        <div className="space-y-1 px-3 py-2">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => setMoreSheetOpen(false)}
                className={`flex items-center gap-4 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#f0f6f6] text-[#1F5A5C]'
                    : 'text-[#3d4a4a] hover:bg-[#f0f6f6]'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-[#1F5A5C]' : 'text-[#6f7979]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="border-t border-[#e2e8e8] pt-2 mt-2">
            <button
              onClick={() => {
                setMoreSheetOpen(false);
                doLogout();
              }}
              className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-sm font-medium text-[#ba1a1a] hover:bg-[#fef2f2] transition-all"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
