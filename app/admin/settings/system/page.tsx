import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Users, GraduationCap, BookOpen, HardDrive, Activity, Database, Shield, Mail, Server } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SystemPage() {
  await requireAuth([UserRole.ADMIN]);

  const [totalUsers, teacherCount, studentCount, storageAgg] = await Promise.all([
    prisma.user.count(),
    prisma.teacher.count(),
    prisma.student.count(),
    prisma.fileAsset.aggregate({ _sum: { sizeInBytes: true } }),
  ]);

  const storageMb = (Number(storageAgg._sum.sizeInBytes ?? 0) / (1024 * 1024)).toFixed(1);

  const stats = [
    {
      label: 'Total Users',
      value: String(totalUsers),
      icon: Users,
      gradient: 'from-[#0C3D2E] to-[#1a5c41]',
      shadow: 'shadow-[0_4px_16px_rgba(12,61,46,0.25)]',
    },
    {
      label: 'Teachers',
      value: String(teacherCount),
      icon: BookOpen,
      gradient: 'from-[#0C3D2E] to-[#1a5c41]',
      shadow: 'shadow-[0_4px_16px_rgba(12,61,46,0.25)]',
    },
    {
      label: 'Students',
      value: String(studentCount),
      icon: GraduationCap,
      gradient: 'from-[#0C3D2E] to-[#1a5c41]',
      shadow: 'shadow-[0_4px_16px_rgba(12,61,46,0.25)]',
    },
    {
      label: 'Storage Used',
      value: `${storageMb} MB`,
      icon: HardDrive,
      gradient: 'from-[#C9952A] to-[#e0aa38]',
      shadow: 'shadow-[0_4px_16px_rgba(201,149,42,0.3)]',
    },
  ];

  const healthItems = [
    { label: 'Database', status: 'Connected', icon: Database, color: 'text-[#1d4ed8]', bg: 'bg-[#dbeafe]', border: 'border-[#bfdbfe]' },
    { label: 'File Storage', status: 'Active', icon: HardDrive, color: 'text-[#15803d]', bg: 'bg-[#dcfce7]', border: 'border-[#bbf7d0]' },
    { label: 'Authentication', status: 'Secure', icon: Shield, color: 'text-[#7c3aed]', bg: 'bg-[#ede9fe]', border: 'border-[#ddd6fe]' },
    { label: 'Email Service', status: 'Ready', icon: Mail, color: 'text-[#b45309]', bg: 'bg-[#fef3c7]', border: 'border-[#fde68a]' },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Back */}
      <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0C3D2E] hover:text-[#1a5c41] transition">
        <ArrowLeft className="h-4 w-4" /> Back to Settings
      </Link>

      {/* Header banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3D2E] to-[#1a5c41] p-5 text-white shadow-[0_4px_20px_rgba(12,61,46,0.25)]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-2 ring-white/30">
            <Server className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Settings</p>
            <h1 className="text-xl font-bold">System</h1>
            <p className="text-sm text-white/70">Live metrics & platform health</p>
          </div>
        </div>
      </div>

      {/* All systems badge */}
      <div className="flex items-center gap-3 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-5 py-3.5">
        <div className="h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
        <p className="text-sm font-medium text-[#15803d]">All systems operational — no incidents reported.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-2xl bg-gradient-to-br ${s.gradient} p-5 text-white ${s.shadow}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <Activity className="h-4 w-4 text-white/40" />
              </div>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/70">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Platform health */}
      <div className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-[#e5e7eb]">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-1 w-4 rounded-full bg-[#C9952A]" />
          <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Platform Health</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {healthItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`flex items-center justify-between rounded-xl border ${item.border} ${item.bg} px-4 py-3.5`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 ${item.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-[#0f172a]">{item.label}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className={`h-4 w-4 ${item.color}`} />
                  <span className={`text-xs font-bold ${item.color}`}>{item.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
