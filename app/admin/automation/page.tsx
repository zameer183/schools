import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminAutomationPage() {
  await requireAuth([UserRole.ADMIN]);

  const [pendingFees, parents] = await Promise.all([
    prisma.fee.aggregate({
      where: { status: { in: ['PENDING', 'OVERDUE'] } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.parent.count(),
  ]);

  const pendingAmount = Number(pendingFees._sum.amount ?? 0).toLocaleString();

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Automation Engine</h2>
        <p className="mt-1 text-sm text-[#6f7979]">
          Manage intelligent triggers that handle routine institutional communication and data governance autonomously.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl bg-white border border-[#e2e8e8] p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#e8f5e9] flex items-center justify-center">
                <svg className="h-6 w-6 text-[#004649]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-[#1a1c1c] text-lg">Fee Reminders</h3>
                <p className="text-sm text-[#6f7979]">Scheduled workflows for pending dues</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#e8f5e9] text-[#004649] px-2.5 py-1 rounded-full">● ACTIVE</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-lg bg-[#f5f7f5] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Next Run</p>
              <p className="mt-1.5 text-sm font-bold text-[#1a1c1c]">Tomorrow, 09:00 AM</p>
            </div>
            <div className="rounded-lg bg-[#f5f7f5] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Pending Dues</p>
              <p className="mt-1.5 text-sm font-bold text-[#1a1c1c]">${pendingAmount}</p>
            </div>
            <div className="rounded-lg bg-[#f5f7f5] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Recipients</p>
              <p className="mt-1.5 text-sm font-bold text-[#1a1c1c]">{parents} Parents</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-[#004649]/10 border-2 border-white flex items-center justify-center text-xs font-bold text-[#004649]">
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              <div className="w-8 h-8 rounded-full bg-[#f5f7f5] border-2 border-white flex items-center justify-center text-xs font-bold text-[#6f7979]">
                +4
              </div>
            </div>
            <button className="rounded-xl bg-[#004649] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition">
              Configure Triggers
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-[#004649] p-5 text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Automation Health</p>
            <p className="text-xs text-white/60 mb-1">Monthly Savings</p>
            <p className="text-3xl font-bold">240 Hours</p>
            <div className="mt-3 h-1.5 rounded-full bg-white/20">
              <div className="h-1.5 rounded-full bg-[#fdb24f] w-[80%]" />
            </div>
          </div>
          <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
            <p className="font-semibold text-[#1a1c1c] mb-3">Quick Insights</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-[#6f7979]">
                <span className="h-2 w-2 rounded-full bg-[#fdb24f] shrink-0" />
                32 notifications sent today
              </li>
              <li className="flex items-center gap-2 text-[#6f7979]">
                <span className="h-2 w-2 rounded-full bg-[#004649] shrink-0" />
                98.2% delivery success rate
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#fff3e0] flex items-center justify-center">
              <svg className="h-5 w-5 text-[#865300]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6f7979]">ACTIVE</span>
          </div>
          <h3 className="font-bold text-[#1a1c1c] text-lg mb-1">Grade Alerts</h3>
          <p className="text-sm text-[#6f7979] mb-4">Instantly notify guardians of scores falling below departmental benchmarks.</p>
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Benchmark: &lt; 65%</p>
            <div className="h-1.5 rounded-full bg-[#f5f7f5]">
              <div className="h-1.5 rounded-full bg-[#ba1a1a] w-[65%]" />
            </div>
          </div>
          <button className="w-full rounded-xl border border-[#e2e8e8] py-2.5 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f5f7f5] transition">
            Configure Template
          </button>
        </div>

        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#fce4ec] flex items-center justify-center">
              <svg className="h-5 w-5 text-[#ba1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 1 8.835-2.535m0 0A23.74 23.74 0 0 1 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
              </svg>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#fff3e0] text-[#865300] px-2 py-0.5 rounded-full">PAUSED</span>
          </div>
          <h3 className="font-bold text-[#1a1c1c] text-lg mb-1">Attendance Broadcasts</h3>
          <p className="text-sm text-[#6f7979] mb-4">Mass notification system for daily absentee reports to primary emergency contacts.</p>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex -space-x-1">
              {['#4db6ac', '#ffb74d', '#e57373'].map((c, i) => (
                <div key={i} className="w-5 h-5 rounded-full border-2 border-white" style={{ background: c }} />
              ))}
            </div>
            <span className="text-xs text-[#6f7979]">Multichannel (SMS, Email, App)</span>
          </div>
          <button className="w-full rounded-xl border border-[#e2e8e8] py-2.5 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f5f7f5] transition">
            Resume &amp; Edit
          </button>
        </div>
      </div>

      <button className="flex items-center gap-2 rounded-xl bg-[#004649] px-5 py-3 text-sm font-bold text-white hover:opacity-90 transition">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        New Automation
      </button>
    </div>
  );
}
