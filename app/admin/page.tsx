import Link from 'next/link';
import { AttendanceBarChartCard, EnrollmentAreaChart } from '@/components/admin/admin-charts';
import {
  getAdminKpis,
  getAttendanceSummary,
  getEnrollmentTrend,
  getRecentInvoices
} from '@/lib/admin/dashboard-data';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [kpi, enrollmentData, attendanceSummary, invoices] = await Promise.all([
    getAdminKpis(),
    getEnrollmentTrend(),
    getAttendanceSummary(),
    getRecentInvoices(5)
  ]);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h1 className="text-2xl font-bold text-[#1a1c1c] sm:text-3xl">Academic Overview</h1>
        <p className="mt-1 text-sm text-[#6f7979]">Monitor your institution&apos;s pulse in real-time.</p>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">TOTAL STUDENTS</p>
          <p className="mt-2 text-4xl font-bold text-[#1a1c1c]">{kpi.totalStudents}</p>
        </div>
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">TOTAL STAFF</p>
          <p className="mt-2 text-4xl font-bold text-[#1a1c1c]">{kpi.totalStaff}</p>
        </div>
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">TOTAL CLASSES</p>
          <p className="mt-2 text-4xl font-bold text-[#1a1c1c]">{kpi.totalClasses}</p>
        </div>
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">REVENUE</p>
          <p className="mt-2 text-4xl font-bold text-[#1a1c1c]">{formatCurrency(kpi.revenue)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#1a1c1c]">Enrollment Trend</h3>
            <span className="rounded text-[10px] font-bold uppercase tracking-wider text-[#004649] bg-[#e8f5e9] px-2 py-1">LIVE</span>
          </div>
          <EnrollmentAreaChart data={enrollmentData} />
        </div>

        <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#1a1c1c]">Attendance Overview</h3>
            <span className="rounded text-[10px] font-bold uppercase tracking-wider text-[#6f7979] bg-[#f5f7f5] px-2 py-1">RECENT</span>
          </div>
          <AttendanceBarChartCard data={attendanceSummary} />
        </div>
      </div>

      {/* Recent Admissions */}
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-[#1a1c1c]">Recent Admissions</h3>
          <Link href="/admin/students" className="text-xs font-semibold text-[#004649] hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#e2e8e8]">
              <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Student</th>
              <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Class</th>
              <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Date</th>
              <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Status</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8e8]">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="py-3 font-medium text-[#1a1c1c]">{invoice.studentName}</td>
                  <td className="py-3 text-[#6f7979]">{invoice.classLabel}</td>
                  <td className="py-3 text-[#6f7979]">{invoice.paidAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td className="py-3 text-right">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                      invoice.status === 'PAID' ? 'bg-[#e8f5e9] text-[#004649]' :
                      invoice.status === 'OVERDUE' ? 'bg-[#fde8e8] text-[#ba1a1a]' :
                      'bg-[#fff3e0] text-[#865300]'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
