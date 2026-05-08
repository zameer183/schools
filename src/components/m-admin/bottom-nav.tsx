'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, ClipboardList, Wallet, UserCircle2 } from 'lucide-react';

const ITEMS = [
  { href: '/m/admin',               label: 'Home',     icon: Home },
  { href: '/m/admin/students',      label: 'Students', icon: Users },
  { href: '/m/admin/attendance',    label: 'Attend',   icon: ClipboardList },
  { href: '/m/admin/fees',          label: 'Fees',     icon: Wallet },
  { href: '/m/admin/profile',       label: 'Profile',  icon: UserCircle2 }
] as const;

export function BottomNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E5E7EB] bg-white px-2 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-center justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/m/admin'
              ? pathname === '/m/admin'
              : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className="flex min-w-[56px] flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium"
                style={{ color: active ? '#1B4D4B' : '#6B7280' }}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.2 : 1.6}
                  style={{ color: active ? '#1B4D4B' : '#6B7280' }}
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
