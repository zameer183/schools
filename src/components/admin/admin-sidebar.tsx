'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Bell, BookOpen, CalendarCheck2, DollarSign, Home, Menu, Settings, Users, UserCog, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/teachers', label: 'Teachers', icon: UserCog },
  { href: '/admin/classes', label: 'Classes', icon: BookOpen },
  { href: '/admin/attendance', label: 'Attendance', icon: CalendarCheck2 },
  { href: '/admin/finance', label: 'Finance', icon: DollarSign },
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

  return (
    <>
      <div
        className={cn('fixed inset-0 z-30 bg-slate-900/35 backdrop-blur-[1px] md:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[#f3f4f3] px-4 py-6 shadow-xl transition-transform md:z-30 md:translate-x-0 md:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="mb-8 flex items-start justify-between px-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Institution</p>
            <h2 className="font-headline mt-1 text-[48px] font-extrabold leading-[0.98] tracking-[-0.02em] text-[#0c4548]">The Scholarly Editorial</h2>
          </div>
          <button className="md:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <nav className="space-y-1 overflow-y-auto pb-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold transition',
                  active
                    ? 'bg-[#0f5954] text-white shadow-[0_8px_20px_rgba(15,89,84,0.22)]'
                    : 'text-slate-700 hover:bg-white/65 hover:text-[#124346]'
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="text-[16px] leading-none tracking-[-0.01em]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 md:hidden"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
