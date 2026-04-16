import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [students, teachers, classes, attendanceThisMonth, unpaidFees, exams, results, lastPayments] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.class.count(),
    prisma.attendance.count({ where: { date: { gte: monthStart } } }),
    prisma.fee.count({ where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } }),
    prisma.exam.count(),
    prisma.result.count(),
    prisma.payment.findMany({
      select: { id: true, amountPaid: true, paidAt: true, fee: { select: { title: true } } },
      orderBy: { paidAt: 'desc' },
      take: 5
    })
  ]);

  const totalPaidThisMonth = lastPayments.reduce((s, p) => s + Number(p.amountPaid), 0);

  const reportCategories = [
    {
      key: 'academic',
      label: 'Academic Excellence',
      desc: 'Rankings, GPA trends, and honors.',
      icon: (
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-1.342m-7.48 0a50.717 50.717 0 0 1 3.741 1.342m0 0a50.717 50.717 0 0 0 3.741-1.342M9.262 10.147c.906-.248 1.805-.472 2.738-.672" />
        </svg>
      ),
      active: true
    },
    {
      key: 'financial',
      label: 'Financial Audit',
      desc: 'Tuition, grants, and ledger.',
      icon: (
        <svg className="h-5 w-5 text-[#1a1c1c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
        </svg>
      ),
      active: false
    },
    {
      key: 'attendance',
      label: 'Attendance',
      desc: 'Presence and punctuality logs.',
      icon: (
        <svg className="h-5 w-5 text-[#1a1c1c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      active: false
    }
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Reports</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Generate exports and management summaries for academic operations.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Students', value: students, icon: '👥' },
            { label: 'Teachers', value: teachers, icon: '🎓' },
            { label: 'Classes', value: classes, icon: '🏫' },
            { label: 'Results', value: results, icon: '📊' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-[#f5f7f5] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
            <h3 className="font-bold text-[#1a1c1c] mb-1">Report Configuration</h3>
            <p className="text-xs text-[#6f7979] mb-4">Define parameters for your bespoke academic transcript.</p>

            <p className="text-[9px] font-bold uppercase tracking-widest text-[#6f7979] mb-3">Select Category</p>
            <div className="space-y-2 mb-5">
              {reportCategories.map((cat) => (
                <div key={cat.key} className={`rounded-xl p-4 cursor-pointer transition-colors ${cat.active ? 'bg-[#004649] text-white' : 'border border-[#e2e8e8] hover:bg-[#f5f7f5]'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${cat.active ? 'bg-white/10' : 'bg-[#f5f7f5]'}`}>
                    {cat.icon}
                  </div>
                  <p className={`font-semibold text-sm ${cat.active ? 'text-white' : 'text-[#1a1c1c]'}`}>{cat.label}</p>
                  <p className={`text-xs mt-0.5 ${cat.active ? 'text-white/70' : 'text-[#6f7979]'}`}>{cat.desc}</p>
                </div>
              ))}
            </div>

            <p className="text-[9px] font-bold uppercase tracking-widest text-[#6f7979] mb-3">Filter Parameters</p>
            <div className="space-y-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">Date Range</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" defaultValue="2024-01-01" className="h-9 rounded-xl bg-[#f5f7f5] px-2 text-xs text-[#1a1c1c] outline-none" />
                  <input type="date" defaultValue="2024-06-30" className="h-9 rounded-xl bg-[#f5f7f5] px-2 text-xs text-[#1a1c1c] outline-none" />
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">Academic Cohort</p>
                <div className="h-9 rounded-xl bg-[#f5f7f5] px-3 flex items-center justify-between text-sm text-[#1a1c1c]">
                  <span>Senior Year - Section A</span>
                  <svg className="h-4 w-4 text-[#6f7979]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">Student Focus</p>
                <div className="h-9 rounded-xl bg-[#f5f7f5] px-3 flex items-center gap-2 text-sm text-[#6f7979]">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <span>Search specific student (Optional)</span>
                </div>
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#004649] bg-[#e8f5e9] px-2 py-1 rounded-full">
                    All Students Selected
                    <button className="hover:text-[#ba1a1a]">×</button>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-[#fff3e0] p-3 flex items-start gap-2">
              <svg className="h-5 w-5 text-[#865300] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#865300] mb-0.5">System Estimate</p>
                <p className="text-xs text-[#865300]">This report will analyze <span className="font-bold">{students} students</span> over <span className="font-bold">180 days</span>.</p>
              </div>
            </div>

            <button className="mt-4 w-full rounded-xl bg-[#004649] py-3 text-sm font-bold text-white hover:opacity-90 transition">Generate Report</button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#865300]">Draft Report</p>
                <h3 className="font-bold text-[#1a1c1c]">Academic Performance Summary</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-xs text-[#6f7979]">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                    </svg>
                    Grade 11-A
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[#6f7979]">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                    Oct 2024
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 rounded-xl border border-[#e2e8e8] px-3 py-2 text-xs font-semibold text-[#1a1c1c] hover:bg-[#f5f7f5] transition">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                  Edit Filters
                </button>
                <button className="flex items-center gap-1.5 rounded-xl bg-[#004649] px-3 py-2 text-xs font-bold text-white hover:opacity-90 transition">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Proceed to Export
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-[#f5f7f5] p-4 mb-4">
              <h4 className="text-xs font-semibold text-[#1a1c1c] mb-3">Class Grade Distribution</h4>
              <div className="flex items-end gap-2 h-24">
                {[40, 60, 70, 90].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-sm bg-[#004649]" style={{ height: `${h}%` }} />
                    <p className="text-[9px] text-[#6f7979]">Week {i + 1}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-[10px] text-[#6f7979]"><span className="w-2 h-2 rounded-full bg-[#004649]" />Physics</span>
                <span className="flex items-center gap-1.5 text-[10px] text-[#6f7979]"><span className="w-2 h-2 rounded-full bg-[#865300]" />Mathematics</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-[#004649] p-4 text-white">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">Average GPA</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-bold">3.84</p>
                  <p className="text-sm text-white/70">↑ 0.2%</p>
                </div>
                <p className="text-xs text-white/60 mt-2">The class is currently performing 12% above the institutional average for this period.</p>
              </div>
              <div className="rounded-xl bg-[#fff3e0] p-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#865300]">Attendance</p>
                <p className="text-3xl font-bold text-[#1a1c1c] mt-1">
                  {attendanceThisMonth > 0 ? '96.2%' : '—'}
                </p>
                <div className="h-1.5 w-full rounded-full bg-[#fdb24f]/30 mt-3">
                  <div className="h-1.5 rounded-full bg-[#865300]" style={{ width: '96.2%' }} />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-[#1a1c1c]">Recent Activity</h4>
                <button className="text-xs font-semibold text-[#865300] hover:underline">View All Records →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e2e8e8]">
                      <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Description</th>
                      <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Amount</th>
                      <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8e8]">
                    {lastPayments.length === 0 ? (
                      <tr><td colSpan={3} className="py-4 text-center text-xs text-[#6f7979]">No payment data yet.</td></tr>
                    ) : (
                      lastPayments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 font-medium text-[#1a1c1c]">{p.fee.title}</td>
                          <td className="py-2.5 font-semibold text-[#004649]">${Number(p.amountPaid).toLocaleString()}</td>
                          <td className="py-2.5 text-xs text-[#6f7979]">{new Date(p.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-[#e8f5e9] flex items-center justify-center mx-auto mb-3">
                <svg className="h-6 w-6 text-[#004649]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h3 className="font-bold text-[#1a1c1c]">Your report is ready for export</h3>
              <p className="text-xs text-[#6f7979] mt-1">Academic Performance Audit — Semester 2 (Final)</p>
            </div>

            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-4 rounded-xl border border-[#e2e8e8] p-4 hover:bg-[#f5f7f5] cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-[#fce4ec] flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-black text-[#ba1a1a]">PDF</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1a1c1c]">Download as PDF</p>
                  <p className="text-xs text-[#6f7979]">Best for formal archival and printing</p>
                  <a href="/api/reports/export?type=results" className="text-xs font-semibold text-[#865300] hover:underline">Standard Format →</a>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-[#e2e8e8] p-4 hover:bg-[#f5f7f5] cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-[#e8f5e9] flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-[#004649]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125h-1.5m2.625-1.5V5.625a1.125 1.125 0 0 0-1.125-1.125H4.5A1.125 1.125 0 0 0 3.375 5.625" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1a1c1c]">Export to Excel</p>
                  <p className="text-xs text-[#6f7979]">Ideal for deep data analysis</p>
                  <a href="/api/reports/export?type=attendance" className="text-xs font-semibold text-[#865300] hover:underline">Raw Dataset (.xlsx) →</a>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/api/reports/export?type=results"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#004649] py-3 text-sm font-bold text-white hover:opacity-90 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Now
              </a>
              <button className="flex items-center justify-center gap-2 rounded-xl border border-[#e2e8e8] px-5 py-3 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f5f7f5] transition">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                </svg>
                Share via Secure Link
              </button>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm text-[#1a1c1c]">Recently Generated Reports</p>
                <button className="text-[10px] font-bold text-[#865300] uppercase tracking-widest hover:underline">View Archive</button>
              </div>
              <div className="space-y-2">
                {[
                  { name: 'Financial Summary Q1', time: 'Generated 2 hours ago', size: '4.2 MB', href: '/api/reports/export?type=fees' },
                  { name: 'Enrollment Trends 2024', time: 'Generated yesterday', size: '12.8 MB', href: '/api/reports/export?type=attendance' },
                ].map((report) => (
                  <div key={report.name} className="flex items-center gap-3 rounded-xl border border-[#e2e8e8] p-3 hover:bg-[#f5f7f5]">
                    <div className="w-9 h-9 rounded-xl bg-[#e8f5e9] flex items-center justify-center shrink-0">
                      <svg className="h-4 w-4 text-[#004649]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[#1a1c1c] truncate">{report.name}</p>
                      <p className="text-xs text-[#6f7979]">{report.time} · {report.size}</p>
                    </div>
                    <a href={report.href} className="w-8 h-8 rounded-full border border-[#e2e8e8] flex items-center justify-center hover:bg-white hover:shadow-sm transition">
                      <svg className="h-4 w-4 text-[#1a1c1c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
