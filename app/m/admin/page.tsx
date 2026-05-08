import Link from 'next/link';
import { Bell, ClipboardList, Wallet, FileText, BarChart3 } from 'lucide-react';
import { requireAuth } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import {
  getAdminKpis,
  getAttendanceSummary,
  getRecentInvoices
} from '@/lib/admin/dashboard-data';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function MobileAdminDashboard() {
  const session = await requireAuth([UserRole.ADMIN]);

  const [kpi, attendance, invoices] = await Promise.all([
    getAdminKpis(),
    getAttendanceSummary(),
    getRecentInvoices(1)
  ]);

  const initials = (session.fullName || 'System Admin')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avgAttendance =
    attendance.length > 0
      ? Math.round(attendance.reduce((s, x) => s + x.value, 0) / attendance.length)
      : 0;

  return (
    <div className="flex flex-col">
      <header className="flex items-center gap-3 px-4 pt-5 pb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1B4D4B] text-xs font-medium text-white">
          {initials}
        </div>
        <div className="flex-1">
          <p className="text-[11px] text-[#6B7280]">Good morning</p>
          <p className="text-sm font-medium text-[#111]">{session.fullName || 'System Admin'}</p>
        </div>
        <Link
          href="/m/admin/notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white"
        >
          <Bell className="h-4 w-4 text-[#1B4D4B]" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#E68A00] ring-2 ring-white" />
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-2 px-4 pb-3">
        <Link href="/m/admin/students" className="rounded-xl bg-[#1B4D4B] p-3 text-white active:scale-[0.98]">
          <p className="text-[10px] opacity-75">Students</p>
          <p className="mt-1 text-xl font-semibold">{kpi.totalStudents}</p>
          <p className="mt-1 text-[9px] opacity-70">{kpi.totalClasses} classes</p>
        </Link>
        <Link href="/m/admin/attendance" className="rounded-xl bg-[#E68A00] p-3 text-[#4A1B0C] active:scale-[0.98]">
          <p className="text-[10px]">Attendance avg</p>
          <p className="mt-1 text-xl font-semibold">{avgAttendance}%</p>
          <p className="mt-1 text-[9px]">last 5 days</p>
        </Link>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
          <p className="text-[10px] text-[#6B7280]">Teachers</p>
          <p className="mt-1 text-xl font-semibold text-[#111]">{kpi.totalStaff}</p>
          <p className="mt-1 text-[9px] text-[#1B4D4B]">on roll</p>
        </div>
        <Link href="/m/admin/fees" className="rounded-xl border border-[#E5E7EB] bg-white p-3 active:scale-[0.98]">
          <p className="text-[10px] text-[#6B7280]">Revenue</p>
          <p className="mt-1 text-xl font-semibold text-[#111]">{formatCurrency(kpi.revenue)}</p>
          <p className="mt-1 text-[9px] text-[#653B28]">collected</p>
        </Link>
      </section>

      <section className="mx-4 mb-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-[#111]">Attendance trend</p>
          <p className="text-[10px] text-[#6B7280]">Last 5 days</p>
        </div>
        <div className="flex h-20 items-end gap-2">
          {attendance.length === 0 ? (
            <p className="text-xs text-[#6B7280]">No attendance recorded yet</p>
          ) : (
            attendance.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-md bg-[#1B4D4B]"
                  style={{ height: `${Math.max(d.value, 6)}%` }}
                />
                <span className="text-[9px] text-[#6B7280]">{d.day}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="px-4 pb-3">
        <p className="mb-2 text-[11px] text-[#6B7280]">Quick actions</p>
        <div className="grid grid-cols-4 gap-2">
          <Link href="/m/admin/attendance" className="rounded-xl border border-[#E5E7EB] bg-white p-2 text-center active:scale-[0.98]">
            <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B4D4B]/10">
              <ClipboardList className="h-3.5 w-3.5 text-[#1B4D4B]" />
            </span>
            <span className="text-[9px] text-[#111]">Mark</span>
          </Link>
          <Link href="/m/admin/fees" className="rounded-xl border border-[#E5E7EB] bg-white p-2 text-center active:scale-[0.98]">
            <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[#E68A00]/20">
              <Wallet className="h-3.5 w-3.5 text-[#E68A00]" />
            </span>
            <span className="text-[9px] text-[#111]">Fees</span>
          </Link>
          <Link href="/m/admin/notifications" className="rounded-xl border border-[#E5E7EB] bg-white p-2 text-center active:scale-[0.98]">
            <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[#653B28]/15">
              <FileText className="h-3.5 w-3.5 text-[#653B28]" />
            </span>
            <span className="text-[9px] text-[#111]">Notice</span>
          </Link>
          <Link href="/admin/reports" className="rounded-xl border border-[#E5E7EB] bg-white p-2 text-center active:scale-[0.98]">
            <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[#6B7280]/20">
              <BarChart3 className="h-3.5 w-3.5 text-[#6B7280]" />
            </span>
            <span className="text-[9px] text-[#111]">Reports</span>
          </Link>
        </div>
      </section>

      {invoices.length > 0 && (
        <section className="mx-4 mb-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-[#111]">Recent payment</p>
            <Link href="/m/admin/fees" className="text-[10px] font-medium text-[#1B4D4B]">
              View all →
            </Link>
          </div>
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1B4D4B]/10 text-[10px] font-medium text-[#1B4D4B]">
                {inv.studentName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-[#111]">{inv.studentName}</p>
                <p className="text-[10px] text-[#6B7280]">{inv.classLabel} · {inv.status}</p>
              </div>
              <p className="text-sm font-medium text-[#111]">{formatCurrency(inv.amountPaid)}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
