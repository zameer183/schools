import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const session = await requireAuth([UserRole.ADMIN]);

  const [admin, activeUsers, totalStorage] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: { fullName: true, email: true, phone: true, createdAt: true }
    }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.fileAsset.aggregate({ _sum: { sizeInBytes: true } })
  ]);

  const storageMb = (Number(totalStorage._sum.sizeInBytes ?? 0) / (1024 * 1024)).toFixed(1);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">System Configurations</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Fine-tune your institution's digital environment and academic standards.</p>

        <div className="mt-5 flex gap-2 flex-wrap">
          {['School Profile', 'Academic Cycle', 'Global Settings', 'Grading Systems'].map((tab, i) => (
            <button
              key={tab}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${i === 0 ? 'bg-[#004649] text-white' : 'bg-[#f5f7f5] text-[#6f7979] hover:bg-[#e8f0f0] hover:text-[#1a1c1c]'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl bg-white border border-[#e2e8e8] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-[#1a1c1c]">School Information</h3>
              <p className="text-xs text-[#6f7979] mt-0.5">Manage basic identification and contact details.</p>
            </div>
            <button className="text-sm font-semibold text-[#004649] hover:underline">Edit All Fields</button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Institution Name', value: 'St. Scholastica International', placeholder: 'Institution name' },
              { label: 'Primary Contact Email', value: admin?.email ?? '', placeholder: 'contact@school.edu' },
              { label: 'Office Phone', value: admin?.phone ?? '+1 (555) 890-2433', placeholder: '+1 (555) 000-0000' },
              { label: 'Institution Website', value: 'www.ssacademy.edu', placeholder: 'www.school.edu' },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">{field.label}</label>
                <input
                  defaultValue={field.value || field.placeholder}
                  className="h-10 w-full rounded-xl bg-[#f5f7f5] px-3 text-sm text-[#1a1c1c] outline-none ring-[#004649]/20 transition focus:ring-2"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">Physical Address</label>
              <textarea
                defaultValue="42 Academic Square, Cambridge District, Education Valley, 90210"
                rows={3}
                className="w-full rounded-xl bg-[#f5f7f5] px-3 py-2.5 text-sm text-[#1a1c1c] outline-none ring-[#004649]/20 transition focus:ring-2 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-[#004649] p-5 text-white">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-3">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="font-bold text-sm mb-1">Institution Crest</p>
            <p className="text-xs text-white/60 leading-relaxed">Standard PNG or SVG, 512×512px recommended for high-resolution displays.</p>
            <button className="mt-3 w-full rounded-lg bg-white/10 border border-white/20 py-2 text-xs font-bold hover:bg-white/20 transition">Update Logo</button>
          </div>

          <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
            <p className="font-semibold text-[#1a1c1c] mb-3">Quick Stats</p>
            <div className="space-y-2">
              {[
                { label: 'System Uptime', value: '99.98%' },
                { label: 'Total Storage Used', value: `${storageMb} MB / 100 GB` },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="text-sm text-[#6f7979]">{stat.label}</span>
                  <span className="text-sm font-semibold text-[#1a1c1c]">{stat.value}</span>
                </div>
              ))}
              <div className="h-1.5 w-full rounded-full bg-[#f5f7f5] mt-2">
                <div className="h-1.5 rounded-full bg-[#004649]" style={{ width: `${Math.min(100, (parseFloat(storageMb) / 1024) * 100 + 1)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#fff3e0] flex items-center justify-center">
              <svg className="h-5 w-5 text-[#865300]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-[#1a1c1c]">Academic Year</h3>
              <p className="text-xs text-[#6f7979]">Active terms and scheduling windows.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">Active Academic Term</label>
              <div className="flex items-center justify-between h-10 rounded-xl bg-[#f5f7f5] px-3">
                <span className="text-sm font-semibold text-[#1a1c1c]">Fall Semester 2024</span>
                <span className="text-[9px] font-bold text-white bg-[#004649] px-2 py-0.5 rounded-full">Live</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">Start Date</label>
                <input type="date" defaultValue="2024-09-01" className="h-10 w-full rounded-xl bg-[#f5f7f5] px-3 text-sm text-[#1a1c1c] outline-none" />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">End Date</label>
                <input type="date" defaultValue="2025-01-15" className="h-10 w-full rounded-xl bg-[#f5f7f5] px-3 text-sm text-[#1a1c1c] outline-none" />
              </div>
            </div>
            <button className="w-full rounded-xl border border-[#e2e8e8] py-2.5 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f5f7f5] transition">Configure Next Term</button>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-bold text-[#1a1c1c] mb-4">Global Settings</h3>
          <p className="text-xs text-[#6f7979] mb-4">Global system standards and currency.</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Default Currency', value: 'USD ($) - US Dollar' },
              { label: 'System Timezone', value: '(GMT-05:00) Eastern' },
              { label: 'Date Format', value: 'DD / MM / YYYY' },
              { label: 'Grading Scale', value: '4.0 GPA Standard' },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6f7979] mb-1.5">{field.label}</label>
                <div className="h-10 rounded-xl bg-[#f5f7f5] px-3 flex items-center justify-between text-sm text-[#1a1c1c]">
                  <span className="truncate">{field.value}</span>
                  <svg className="h-4 w-4 text-[#6f7979] shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f5f7f5] px-4 py-3">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-[#6f7979]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
              <span className="text-sm text-[#1a1c1c]">Automatic Late Fee Processing</span>
            </div>
            <div className="w-10 h-6 rounded-full bg-[#004649] flex items-center px-1">
              <div className="w-4 h-4 rounded-full bg-white translate-x-4" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-[#004649] p-6 text-white">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/60 mb-2">Security Advisory</p>
          <h3 className="text-2xl font-bold">System Integrity Check Passed</h3>
          <p className="text-xs text-white/60 mt-2 leading-relaxed">All critical configurations are synced with the institutional ledger. Last backup performed: 2 hours ago.</p>
          <div className="grid grid-cols-3 gap-4 mt-5">
            {[
              { label: 'Open Errors', value: '0' },
              { label: 'Daily Accesses', value: '2.4k' },
              { label: 'Cloud Sync', value: '100%' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-[9px] uppercase tracking-widest text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
          <button className="mt-4 text-sm font-semibold text-white/80 hover:text-white flex items-center gap-1">
            View Security Logs
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>

        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-bold text-[#1a1c1c] mb-4">Grading Systems</h3>
          <div className="space-y-3">
            {[
              { grade: 'A+', range: '90-100', points: '4.0', color: 'bg-[#e8f5e9] text-[#004649]' },
              { grade: 'A', range: '80-89', points: '4.0', color: 'bg-[#e8f5e9] text-[#004649]' },
              { grade: 'B', range: '70-79', points: '3.0', color: 'bg-[#e3f2fd] text-[#1565c0]' },
              { grade: 'C', range: '60-69', points: '2.0', color: 'bg-[#fff3e0] text-[#865300]' },
              { grade: 'D', range: '50-59', points: '1.0', color: 'bg-[#fff3e0] text-[#865300]' },
              { grade: 'F', range: '0-49', points: '0.0', color: 'bg-[#fce4ec] text-[#ba1a1a]' },
            ].map((g) => (
              <div key={g.grade} className="flex items-center gap-3 rounded-xl bg-[#f5f7f5] px-4 py-2.5">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${g.color}`}>{g.grade}</span>
                <span className="flex-1 text-sm text-[#1a1c1c]">{g.range}%</span>
                <span className="text-sm font-semibold text-[#6f7979]">{g.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 rounded-xl bg-white border border-[#e2e8e8] p-4">
        <button className="rounded-xl border border-[#e2e8e8] px-6 py-2.5 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f5f7f5] transition">Discard</button>
        <button className="flex items-center gap-2 rounded-xl bg-[#004649] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Commit Changes
        </button>
      </div>
    </div>
  );
}
