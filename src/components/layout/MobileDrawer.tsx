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
        className={`fixed left-0 top-0 z-40 flex h-[100dvh] w-[280px] flex-col border-r border-[#e2e8e8]/60 bg-[#F8F6F3] shadow-[18px_0_44px_rgba(15,23,42,0.14)] transition-transform duration-300 md:hidden ${
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
              src="/manarah-logo.png"
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
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition-all ${
                  active
                    ? 'bg-[#084750] text-white shadow-[0_10px_22px_rgba(8,71,80,0.24)] ring-1 ring-[#D9A253]/50'
                    : 'text-[#344242] hover:bg-white hover:shadow-sm hover:text-[#004D47]'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="space-y-3 border-t border-[#e2e8e8] bg-[#F8F6F3] px-3 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white px-3 py-2 shadow-[0_10px_22px_rgba(15,23,42,0.07)]">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#084750] text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#1a1c1c] truncate">{fullName}</p>
              <p className="text-[10px] text-[#6f7979]">{role}</p>
            </div>
          </div>
          <button
            onClick={doLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-0 bg-[#084750] px-3 py-2.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(8,71,80,0.24)] transition hover:opacity-90"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
