'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HelpCircle, LogOut, PlusCircle, X } from 'lucide-react';
import type { UserRole } from '@prisma/client';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { panelNavItems, type PanelNavItem } from '@/components/layout/panel-config';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  role,
  open,
  onClose
}: {
  role: UserRole;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const navItems = panelNavItems[role];
  const isAdmin = role === 'ADMIN';

  const roleLabel =
    role === 'ADMIN' ? 'Admin Portal' :
    role === 'TEACHER' ? 'Teacher Hub' :
    role === 'STUDENT' ? 'Student Hub' :
    'Parent Hub';

  const homeHref =
    role === 'ADMIN' ? '/admin' :
    role === 'TEACHER' ? '/teacher' :
    role === 'PARENT' ? '/parent' :
    '/student';

  const doLogout = () => {
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        if (!res.ok) {
          setError('Logout failed.');
          return;
        }
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
        className={cn('fixed inset-0 z-40 bg-[#0b1f20]/35 backdrop-blur-sm lg:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#f3f4f5] px-4 py-6 transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="mb-8 flex items-start justify-between px-4">
          <Link href={homeHref} onClick={onClose} className="block">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#6f7979]">{roleLabel}</p>
            <h2 className="font-headline mt-1 text-xl font-extrabold leading-tight tracking-tight text-[#004649]">
              Scholarly<br />Editorial
            </h2>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#004649] shadow-sm lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item: PanelNavItem) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all',
                  active
                    ? 'bg-white/50 border-r-4 border-[#004649] text-[#004649] shadow-[0_12px_40px_rgba(0,70,73,0.04)]'
                    : 'text-[#6f7979] hover:bg-[#e7e8e9] hover:text-[#004649]'
                )}
              >
                <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-[#004649]' : 'text-[#6f7979]')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1 px-0 pt-4">
          {isAdmin && (
            <button
              onClick={() => router.push('/admin/students')}
              className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] text-sm font-semibold text-white shadow-lg shadow-[#004649]/10 transition active:scale-[0.98]"
            >
              <PlusCircle className="h-4 w-4" />
              New Registration
            </button>
          )}
          <div className="pt-4 space-y-1 border-t border-[#bfc8c9]/40">
            <button className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-xs font-medium text-[#6f7979] transition hover:text-[#004649]">
              <HelpCircle className="h-4 w-4" />
              Help Center
            </button>
            <button
              onClick={doLogout}
              disabled={pending}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-xs font-medium text-[#ba1a1a]/80 transition hover:text-[#ba1a1a]"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
            {error ? <p className="mt-2 px-4 text-xs text-[#ba1a1a]">{error}</p> : null}
          </div>
        </div>
      </aside>
    </>
  );
}
