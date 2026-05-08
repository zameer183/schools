import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button, Card } from '@/components/ui';
import { AlertCircle, Zap, BarChart3 } from 'lucide-react';

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
      <Card className="p-6">
        <h2 className="font-headline text-3xl font-bold text-[#1a1c1c]">Automation Engine</h2>
        <p className="mt-1 text-sm text-[#6f7979]">
          Manage intelligent triggers that handle routine institutional communication and data governance autonomously.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#dcfce7] flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-[#16a34a]" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-[#1a1c1c] text-lg">Fee Reminders</h3>
                <p className="text-sm text-[#6f7979]">Scheduled workflows for pending dues</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#dcfce7] text-[#16a34a] px-2.5 py-1 rounded-full">● ACTIVE</span>
          </div>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#f3f4f5] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Next Run</p>
              <p className="mt-1.5 text-sm font-bold text-[#1a1c1c]">Tomorrow, 09:00 AM</p>
            </div>
            <div className="rounded-xl bg-[#fef3c7] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#92400e]">Pending Dues</p>
              <p className="mt-1.5 text-sm font-bold text-[#1a1c1c]">${pendingAmount}</p>
            </div>
            <div className="rounded-xl bg-[#e0e7ff] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#312e81]">Recipients</p>
              <p className="mt-1.5 text-sm font-bold text-[#1a1c1c]">{parents} Parents</p>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex -space-x-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-[#004649]/10 border-2 border-white flex items-center justify-center text-xs font-bold text-[#004649]">
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              <div className="w-8 h-8 rounded-full bg-[#f3f4f5] border-2 border-white flex items-center justify-center text-xs font-bold text-[#6f7979]">
                +4
              </div>
            </div>
            <Button size="md" className="w-full sm:w-auto">
              Configure Triggers
            </Button>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5 bg-[#1F5A5C] text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Automation Health</p>
            <p className="text-xs text-white/60 mb-1">Monthly Savings</p>
            <p className="text-3xl font-bold">240 Hours</p>
            <div className="mt-3 h-1.5 rounded-full bg-white/20">
              <div className="h-1.5 rounded-full bg-[#d69e3f] w-[80%]" />
            </div>
          </Card>
          <Card className="p-5">
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
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#fef3c7] flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-[#92400e]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#16a34a]">ACTIVE</span>
          </div>
          <h3 className="font-bold text-[#1a1c1c] text-lg mb-1">Grade Alerts</h3>
          <p className="text-sm text-[#6f7979] mb-4">Instantly notify guardians of scores falling below departmental benchmarks.</p>
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Benchmark: &lt; 65%</p>
            <div className="h-1.5 rounded-full bg-[#f3f4f5]">
              <div className="h-1.5 rounded-full bg-[#dc2626] w-[65%]" />
            </div>
          </div>
          <Button variant="secondary" className="w-full">
            Configure Template
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#f3e8ff] flex items-center justify-center">
              <Zap className="h-5 w-5 text-[#9333ea]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#fef3c7] text-[#92400e] px-2 py-0.5 rounded-full">PAUSED</span>
          </div>
          <h3 className="font-bold text-[#1a1c1c] text-lg mb-1">Attendance Broadcasts</h3>
          <p className="text-sm text-[#6f7979] mb-4">Mass notification system for daily absentee reports to primary emergency contacts.</p>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex -space-x-1">
              {['#14b8a6', '#f59e0b', '#ef4444'].map((c, i) => (
                <div key={i} className="w-5 h-5 rounded-full border-2 border-white" style={{ background: c }} />
              ))}
            </div>
            <span className="text-xs text-[#6f7979]">Multichannel (SMS, Email, App)</span>
          </div>
          <Button variant="secondary" className="w-full">
            Resume &amp; Edit
          </Button>
        </Card>
      </div>

      <Button className="flex items-center gap-2" size="md">
        <Zap className="h-4 w-4" />
        New Automation
      </Button>
    </div>
  );
}
