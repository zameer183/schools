'use client';

import type { UserRole } from '@prisma/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  const isAdmin = role === 'ADMIN';

  if (!isAdmin) {
    const navItems = panelNavItems[role].slice(0, 4);
    const initials = fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

    return (
      <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c]">
        <header className="fixed left-0 right-0 top-0 z-40 border-b border-[#c0c8c9]/20 bg-[#f9f9f9]/85 px-4 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://lh3.googleusercontent.com/aida/ADBb0ugS93ixky9Hrwk3Lu4M6_TiPkBRA87BCMrXCDoYrNYGCyGK_IUUKl5gGMnM_c9oDK4OU-wer1BhDwF73zlZqnnv7SLurT5VR4tOsnzE61oOr2cEoomB2grf-Q_T5AwBrG8l25ybiL7xxVKo58FYf-4evOQpADITZNjeBFJa4Ci-zg8AAmEMFgzWVKc2CmnpUu-_853TNiOwAZDZLXgbE4nH_tB6OnGD0Hw7t0HyO6YHh-GcRgI4-VZxpfFLzrrcOy0SLWNkd2i6TQ"
                alt="Institute logo"
                className="h-8 w-auto object-contain"
              />
              <span className="font-headline text-lg font-extrabold tracking-tight text-[#124346]">Manarah Institute</span>
            </div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#bcebef] bg-[#124346] text-xs font-bold text-white">
              {initials || 'U'}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-20">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#c0c8c9]/20 bg-white/90 px-3 pb-5 pt-3 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-around">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center rounded-xl px-4 py-2 transition ${
                    active ? 'bg-[#124346] text-white' : 'text-[#6e7778]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(188,235,239,0.55),_transparent_30%),linear-gradient(180deg,#f8f9fa_0%,#f8f9fa_100%)] text-[#1a1c1c]">
      <AppSidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader role={role} fullName={fullName} onOpenMenu={() => setSidebarOpen(true)} />

      <main className="mx-auto min-h-screen w-full max-w-[1680px] px-4 pb-10 pt-24 lg:pl-[296px] lg:pr-8">
        <div className="min-h-[calc(100vh-7rem)] rounded-[2rem] bg-transparent">{children}</div>
      </main>
    </div>
  );
}
