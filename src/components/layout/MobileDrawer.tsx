'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LogOut, X } from 'lucide-react';
import type { UserRole } from '@prisma/client';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function MobileDrawer({
  isOpen,
  onClose,
  navItems,
  fullName,
  role,
  doLogout,
  pathname,
}: {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  fullName: string;
  role: UserRole;
  doLogout: () => void;
  pathname: string;
}) {
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || role.slice(0, 2).toUpperCase();

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
      {isOpen && (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col border-r border-[#e2e8e8]/60 bg-[#f3f4f5] transition-transform duration-300 md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding */}
        <div className="border-b border-[#e2e8e8] px-5 pb-5 pt-6">
          <div className="mb-3 flex items-center justify-end">
            <button
              onClick={onClose}
              className="rounded-xl p-1 text-[#6f7979] hover:bg-white hover:shadow-sm"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mb-2">
            <Image
              src="/manarah-p4.png"
              alt="Manarah Institute logo"
              width={1382}
              height={504}
              className="h-auto w-[165px] object-contain"
              priority
            />
          </div>
          <p className="text-xs font-semibold text-[#6f7979]">Manarah Institute</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
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

        {/* Footer */}
        <div className="border-t border-[#e2e8e8] px-3 py-4 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1F5A5C] text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#1a1c1c] truncate">{fullName}</p>
              <p className="text-[10px] text-[#6f7979]">{role}</p>
            </div>
          </div>
          <button
            onClick={doLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] border-0 px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
