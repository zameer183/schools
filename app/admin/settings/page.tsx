import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const session = await requireAuth([UserRole.ADMIN]);

  const [admin, usersByRole, activeUsers, inactiveUsers, classes, subjects, assignments, files, recentUsers] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.id },
        select: { fullName: true, email: true, phone: true, createdAt: true }
      }),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.class.count(),
      prisma.subject.count(),
      prisma.assignment.count(),
      prisma.fileAsset.aggregate({ _sum: { sizeInBytes: true }, _count: { _all: true } }),
      prisma.user.findMany({
        select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 8
      })
    ]);

  const roleMap = new Map(usersByRole.map((row) => [row.role, row._count._all]));
  const storageMb = (Number(files._sum.sizeInBytes ?? 0) / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-2xl font-bold text-[#1a1c1c]">Settings</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Configure institution profile, preferences, and system controls.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg bg-[#f5f7f5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Active Users</p>
            <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{activeUsers}</p>
          </div>
          <div className="rounded-lg bg-[#f5f7f5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Inactive Users</p>
            <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{inactiveUsers}</p>
          </div>
          <div className="rounded-lg bg-[#f5f7f5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Academic Entities</p>
            <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{classes + subjects + assignments}</p>
          </div>
          <div className="rounded-lg bg-[#f5f7f5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Uploaded Files</p>
            <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{files._count._all} ({storageMb} MB)</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-semibold text-[#1a1c1c] mb-4">Admin Profile</h3>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-[#f5f7f5] px-4 py-3">
              <p className="text-[10px] text-[#6f7979] uppercase tracking-widest">Name</p>
              <p className="font-semibold text-[#1a1c1c] mt-0.5">{admin?.fullName ?? 'System Admin'}</p>
            </div>
            <div className="rounded-lg bg-[#f5f7f5] px-4 py-3">
              <p className="text-[10px] text-[#6f7979] uppercase tracking-widest">Email</p>
              <p className="font-semibold text-[#1a1c1c] mt-0.5">{admin?.email ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-[#f5f7f5] px-4 py-3">
              <p className="text-[10px] text-[#6f7979] uppercase tracking-widest">Phone</p>
              <p className="font-semibold text-[#1a1c1c] mt-0.5">{admin?.phone ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-[#f5f7f5] px-4 py-3">
              <p className="text-[10px] text-[#6f7979] uppercase tracking-widest">Joined</p>
              <p className="font-semibold text-[#1a1c1c] mt-0.5">{admin?.createdAt.toISOString().slice(0, 10) ?? '-'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-semibold text-[#1a1c1c] mb-4">Role Distribution</h3>
          <div className="space-y-2 text-sm">
            {(['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] as const).map((role) => (
              <div key={role} className="flex items-center justify-between rounded-lg bg-[#f5f7f5] px-4 py-3">
                <span className="text-[#6f7979]">{role.charAt(0) + role.slice(1).toLowerCase()}s</span>
                <span className="font-bold text-[#1a1c1c]">{roleMap.get(role) ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-semibold text-[#1a1c1c] mb-4">System Modules</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-[#f5f7f5] px-4 py-3">
              <span className="text-[#6f7979]">Classes</span>
              <span className="font-bold text-[#1a1c1c]">{classes}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#f5f7f5] px-4 py-3">
              <span className="text-[#6f7979]">Subjects</span>
              <span className="font-bold text-[#1a1c1c]">{subjects}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#f5f7f5] px-4 py-3">
              <span className="text-[#6f7979]">Assignments</span>
              <span className="font-bold text-[#1a1c1c]">{assignments}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#f5f7f5] px-4 py-3">
              <span className="text-[#6f7979]">Files</span>
              <span className="font-bold text-[#1a1c1c]">{files._count._all}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h3 className="font-semibold text-[#1a1c1c] mb-4">Recently Added Users</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8e8]">
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Name</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Email</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Role</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Status</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8e8]">
              {recentUsers.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 font-medium text-[#1a1c1c]">{u.fullName}</td>
                  <td className="py-3 text-[#6f7979]">{u.email}</td>
                  <td className="py-3 text-[#6f7979]">{u.role}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.isActive ? 'bg-[#e8f5e9] text-[#004649]' : 'bg-[#f5f7f5] text-[#6f7979]'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 text-[#6f7979]">{u.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentUsers.length === 0 ? <p className="mt-4 text-sm text-[#6f7979]">No users found.</p> : null}
        </div>
      </div>
    </div>
  );
}
