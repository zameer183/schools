import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import Link from 'next/link';
import { ArrowRight, BarChart3, Building2, Lock, MessageSquare, ShieldCheck, UserRound } from 'lucide-react';

export const dynamic = 'force-dynamic';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const categories = [
  {
    title: 'Profile',
    href: '/admin/settings/profile',
    icon: UserRound,
    iconBg: 'bg-[#fdf6e9]',
    iconColor: 'text-[#C9952A]',
    description: 'Name, email, phone, avatar',
  },
  {
    title: 'Institution',
    href: '/admin/settings/institution',
    icon: Building2,
    iconBg: 'bg-[#f0f7f3]',
    iconColor: 'text-[#0C3D2E]',
    description: 'Brand, address, contact info',
  },
  {
    title: 'Security',
    href: '/admin/settings/security',
    icon: ShieldCheck,
    iconBg: 'bg-[#fdf6e9]',
    iconColor: 'text-[#C9952A]',
    description: 'Password, 2FA, access control',
  },
  {
    title: 'SMS Templates',
    href: '/admin/settings/sms-templates',
    icon: MessageSquare,
    iconBg: 'bg-[#f0f7f3]',
    iconColor: 'text-[#0C3D2E]',
    description: 'WhatsApp & SMS message bodies',
  },
  {
    title: 'System',
    href: '/admin/settings/system',
    icon: BarChart3,
    iconBg: 'bg-[#fdf6e9]',
    iconColor: 'text-[#C9952A]',
    description: 'Usage stats and platform health',
  },
  {
    title: 'Roles & Permissions',
    href: '/admin/roles',
    icon: Lock,
    iconBg: 'bg-[#f0f7f3]',
    iconColor: 'text-[#0C3D2E]',
    description: 'Manage admin access levels',
  },
];

export default async function AdminSettingsPage() {
  const session = await requireAuth([UserRole.ADMIN]);

  const admin = await prisma.user.findUnique({
    where: { id: session.id },
    select: { fullName: true, email: true, avatarUrl: true },
  });

  const name = admin?.fullName ?? 'Admin';
  const email = admin?.email ?? '';
  const avatarUrl = admin?.avatarUrl ?? '';
  const initStr = initials(name) || 'AD';

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3D2E] to-[#1a5c41] px-6 py-8 sm:px-8 shadow-[0_4px_20px_rgba(12,61,46,0.25)]">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 bg-white/10">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white">
                {initStr}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Admin Settings</p>
            <h1 className="mt-0.5 text-2xl font-bold text-white sm:text-3xl">{name}</h1>
            <p className="mt-0.5 text-sm text-white/70">{email}</p>
          </div>
        </div>
      </div>

      {/* Category grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.href}
              href={cat.href}
              className="group rounded-2xl bg-white border border-[#e5e7eb] p-5 hover:shadow-[0_4px_16px_rgba(12,61,46,0.10)] hover:border-l-4 hover:border-l-[#C9952A] transition-all cursor-pointer flex items-center gap-4"
            >
              <div className={`shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-xl ${cat.iconBg}`}>
                <Icon className={`h-5 w-5 ${cat.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0f172a] group-hover:text-[#0C3D2E] transition">{cat.title}</p>
                <p className="mt-0.5 text-xs text-[#64748b]">{cat.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#94a3b8] group-hover:text-[#C9952A] transition" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
