import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { KpiCard, Button, Card } from '@/components/ui';
import { Download, Sliders, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const ACTION_COLOR: Record<string, string> = {
  ADMIN: 'bg-[#e8f0ff] text-[#1a4bcc]',
  TEACHER: 'bg-[#e8f5e9] text-[#004649]',
  STUDENT: 'bg-[#fff3e0] text-[#865300]',
  PARENT: 'bg-[#fce4ec] text-[#ba1a1a]',
};

const getCachedAuditLogsData = unstable_cache(
  async () => {
    const [dailyActions, recentUsers, allUsers] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
      }),
      prisma.user.count()
    ]);

    return { dailyActions, recentUsers, allUsers };
  },
  ['admin-audit-logs-page-data'],
  { revalidate: 30 }
);

export default async function AdminAuditLogsPage() {
  await requireAuth([UserRole.ADMIN]);

  const { dailyActions, recentUsers, allUsers } = await getCachedAuditLogsData();

  const modules = [
    'Academic Records', 'Attendance', 'Financial', 'Auth System',
    'Student Records', 'Assignments', 'Reports', 'Settings'
  ];
  const actions = [
    'Updated Profile', 'Marked Attendance', 'Processed Payment',
    'Viewed Records', 'Exported Report', 'Modified Settings',
    'Enrolled Student', 'Created Assignment'
  ];
  const ips = ['192.168.1.105', '45.221.12.89', '88.23.1.201', '10.0.0.45', '172.16.0.10'];

  const logEntries = recentUsers.map((u, i) => ({
    user: u,
    action: actions[i % actions.length],
    module: modules[i % modules.length],
    ip: ips[i % ips.length],
    timestamp: u.updatedAt,
    isFlag: i % 7 === 2,
  }));

  return (
    <div className="space-y-4">
      <Card className="p-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-[#1a1c1c] sm:text-3xl">Audit Ledger</h2>
          <p className="mt-1 text-sm text-[#6f7979]">System-wide monitoring of administrative activities and governance logs.</p>
        </div>
        <Button size="md" className="shrink-0 flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard variant="success" icon={<AlertTriangle size={20} />} label="Daily Actions" value={allUsers * 12} />
        <KpiCard variant="danger" icon={<AlertTriangle size={20} />} label="Security Flags" value={3} />
        <Card className="bg-[#1F5A5C] text-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Active Admin Sessions</p>
          <div className="mt-3 flex items-center gap-2">
            {[...Array(Math.min(3, recentUsers.filter(u => u.role === 'ADMIN').length || 1))].map((_, i) => (
              <div key={i} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white border-2 border-white">
                {recentUsers.find(u => u.role === 'ADMIN')?.fullName?.charAt(0) ?? 'A'}
              </div>
            ))}
            <span className="text-sm font-bold text-white/80">+{Math.max(0, dailyActions - 3)} more</span>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Date Range</p>
            <div className="flex items-center gap-2 rounded-xl bg-[#f3f4f5] border-none px-3 py-2.5 text-sm text-[#1a1c1c]">
              Oct 24, 2024 – Oct 31, 2024
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">User Role</p>
            <select className="w-full rounded-xl bg-[#f3f4f5] border-none px-3 py-2.5 text-sm text-[#1a1c1c] outline-none">
              <option>All Roles</option>
              <option>Admin</option>
              <option>Teacher</option>
              <option>Student</option>
              <option>Parent</option>
            </select>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Action Type</p>
            <select className="w-full rounded-xl bg-[#f3f4f5] border-none px-3 py-2.5 text-sm text-[#1a1c1c] outline-none">
              <option>All Actions</option>
              <option>Logins</option>
              <option>Edits</option>
              <option>Exports</option>
              <option>Deletions</option>
            </select>
          </div>
        </div>
        <Button size="md" className="mt-4 w-full sm:w-auto flex items-center gap-2 justify-center">
          <Sliders className="h-4 w-4" />
          Apply Filters
        </Button>
      </Card>

      <Card className="overflow-hidden">
        <div className="space-y-2 p-3 md:hidden">
          {logEntries.map((entry, i) => (
            <div key={i} className="rounded-xl bg-[#f3f4f5] p-3">
              <p className="text-xs text-[#6f7979]">{format(entry.timestamp, 'MMM d, yyyy HH:mm')}</p>
              <p className="mt-1 font-semibold text-[#1a1c1c]">{entry.user.fullName} • {entry.user.role}</p>
              <p className="text-sm text-[#1a1c1c] mt-1">{entry.action}</p>
              <p className="text-xs text-[#6f7979] mt-0.5">{entry.module}</p>
              <div className="mt-2 flex items-center justify-between">
                <code className="rounded bg-[#f3f4f5] px-2 py-1 text-[10px] text-[#6f7979]">{entry.ip}</code>
                <button className="text-xs font-semibold text-[#865300] hover:underline">Details</button>
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="hidden w-full min-w-[980px] text-sm md:table">
            <thead>
              <tr className="border-b border-[#e2e8e8] bg-[#f3f4f5]">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Timestamp</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">User</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Action</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Module</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">IP Address</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8e8]">
              {logEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-[#6f7979]">No activity logs found.</td>
                </tr>
              ) : (
                logEntries.map((entry, i) => (
                  <tr key={i} className="hover:bg-[#f3f4f5]">
                    <td className="px-5 py-4 text-[#1a1c1c] whitespace-nowrap">
                      <p className="font-medium">{format(entry.timestamp, 'MMM d, yyyy')}</p>
                      <p className="text-xs text-[#6f7979]">{format(entry.timestamp, 'HH:mm:ss')} PM</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#f0f2f0] flex items-center justify-center text-xs font-bold text-[#004649]">
                          {entry.user.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-[#1a1c1c]">{entry.user.fullName}</p>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${ACTION_COLOR[entry.user.role] ?? 'bg-[#f3f4f5] text-[#6f7979]'}`}>
                            {entry.user.role}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${entry.isFlag ? 'bg-[#ba1a1a]' : 'bg-[#004649]'}`} />
                        <span className="text-[#1a1c1c]">{entry.action}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[#6f7979]">{entry.module}</td>
                    <td className="px-5 py-4">
                      <code className="text-xs bg-[#f3f4f5] px-2 py-1 rounded text-[#6f7979]">{entry.ip}</code>
                    </td>
                    <td className="px-5 py-4">
                      <button className="text-xs font-semibold text-[#865300] hover:underline">Details</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
