'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Bell, BookOpen, CalendarCheck2, DollarSign, HelpCircle, Home, LogOut, Menu, PlusCircle, Settings, Users, UserCog, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTransition, useState } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/teachers', label: 'Staff', icon: UserCog },
  { href: '/admin/classes', label: 'Academics', icon: BookOpen },
  { href: '/admin/finance', label: 'Finances', icon: DollarSign },
  { href: '/admin/attendance', label: 'Attendance', icon: CalendarCheck2 },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/settings', label: 'Settings', icon: Settings }
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const doLogout = () => {
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        if (!res.ok) { setError('Logout failed.'); return; }
        router.push('/login');
        router.refresh();
      } catch {
        setError('Network issue.');
      }
    });
  };

  return (
    <>
      <div
        className={cn('fixed inset-0 z-30 bg-[#191c1d]/35 backdrop-blur-[1px] md:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[#f3f4f5] px-4 py-6 transition-transform md:z-30 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="mb-10 flex items-start justify-between px-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#6f7979]">Admin Portal</p>
            <h2 className="font-headline mt-1 text-xl font-extrabold leading-tight tracking-tight text-[#004649]">
              Scholarly<br />Editorial
            </h2>
          </div>
          <button className="mt-1 md:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5 text-[#6f7979]" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition',
                  active
                    ? 'bg-white/50 border-r-4 border-[#004649] text-[#004649]'
                    : 'text-[#6f7979] hover:bg-[#e7e8e9] hover:text-[#004649]'
                )}
              >
                <Icon className={cn('h-[18px] w-[18px]', active ? 'text-[#004649]' : 'text-[#6f7979]')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1 pt-4">
          <button
            onClick={() => router.push('/admin/students')}
            className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] text-sm font-semibold text-white shadow-lg shadow-[#004649]/10 transition active:scale-[0.98]"
          >
            <PlusCircle className="h-4 w-4" />
            New Registration
          </button>
          <div className="border-t border-[#bfc8c9]/40 pt-4 space-y-1">
            <a href="#" className="flex items-center gap-3 rounded-xl px-4 py-2 text-xs font-medium text-[#6f7979] transition hover:text-[#004649]">
              <HelpCircle className="h-4 w-4" />
              Help Center
            </a>
            <button
              onClick={doLogout}
              disabled={pending}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-xs font-medium text-[#ba1a1a]/80 transition hover:text-[#ba1a1a]"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
            {error ? <p className="px-4 text-xs text-[#ba1a1a]">{error}</p> : null}
          </div>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#bfc8c9]/40 bg-white text-[#004649] md:hidden"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
