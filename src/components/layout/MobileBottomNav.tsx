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
  STUDENT: ['/student', '/student/schedule', '/student/assignments', '/student/messages'],
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

  const { primaryItems, moreItems } = useMemo(() => {
    const primaryHrefs = mobilePrimaryByRole[role] ?? [];
    const primary = navItems.filter((item) => primaryHrefs.includes(item.href));
    const more = navItems.filter((item) => !primaryHrefs.includes(item.href));
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid h-[68px] grid-cols-5 border-t border-[#e2e8e8] bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold leading-tight transition-colors ${
                active ? 'text-[#1F5A5C]' : 'text-[#6f7979] hover:text-[#1F5A5C]'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-[#1F5A5C]' : 'text-[#6f7979]'}`} />
              <span className="line-clamp-1">{item.label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreSheetOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold leading-tight text-[#6f7979] transition-colors hover:text-[#1F5A5C]"
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
