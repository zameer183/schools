'use client';

import type { UserRole } from '@prisma/client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { panelNavItems } from '@/components/layout/panel-config';

export function DashboardShell({
  role,
  fullName,
  children
}: {
  role: UserRole;
  fullName: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isAdmin = role === 'ADMIN';

  if (!isAdmin) {
    const navItems = panelNavItems[role].slice(0, 4);
    const initials = fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

    const roleLabel =
      role === 'TEACHER' ? 'Teacher Hub' :
      role === 'STUDENT' ? 'Student Hub' :
      'Parent Hub';

    const doLogout = () => {
      startTransition(async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
          router.push('/login');
          router.refresh();
        } catch {}
      });
    };

    return (
      <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d]">
        <header
          className="fixed left-0 right-0 top-0 z-40 px-4"
          style={{ background: 'rgba(248,249,250,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(191,200,201,0.3)' }}
        >
          <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6f7979]">{roleLabel}</p>
                <h1 className="font-headline text-base font-extrabold leading-tight tracking-tight text-[#004649]">
                  Scholarly Editorial
                </h1>
              </div>
            </div>
            <button
              onClick={doLogout}
              disabled={pending}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#afedf2] bg-[#004649] text-xs font-bold text-white"
              title={fullName}
            >
              {initials || 'U'}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-20">{children}</main>

        <nav
          className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-5 pt-3"
          style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(191,200,201,0.3)' }}
        >
          <div className="mx-auto flex w-full max-w-3xl items-center justify-around">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center rounded-xl px-4 py-2 transition ${
                    active ? 'bg-[#004649] text-white' : 'text-[#6f7979] hover:text-[#004649]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f8f9fa] text-[#191c1d]">
      <AppSidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader role={role} fullName={fullName} onOpenMenu={() => setSidebarOpen(true)} />

      <main className="min-h-screen w-full px-4 pb-10 pt-20 lg:pl-[280px] lg:pr-8">
        <div className="min-h-[calc(100vh-7rem)]">{children}</div>
      </main>
    </div>
  );
}
