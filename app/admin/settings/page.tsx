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
    <div className="space-y-6">
      <section className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Settings</p>
        <h2 className="font-headline mt-1 text-4xl font-extrabold tracking-[-0.03em] text-[#124346] md:text-5xl">Configuration Hub</h2>
        <p className="mt-2 text-[#596364]">Configure institution profile, preferences, and system controls.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-[#f3f4f3] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Active Users</p><p className="font-headline mt-2 text-3xl font-extrabold text-[#124346]">{activeUsers}</p></div>
          <div className="rounded-xl bg-[#f3f4f3] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Inactive Users</p><p className="font-headline mt-2 text-3xl font-extrabold text-[#895100]">{inactiveUsers}</p></div>
          <div className="rounded-xl bg-[#f3f4f3] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Academic Entities</p><p className="font-headline mt-2 text-3xl font-extrabold text-[#124346]">{classes + subjects + assignments}</p></div>
          <div className="rounded-xl bg-[#f3f4f3] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Uploaded Files</p><p className="font-headline mt-2 text-3xl font-extrabold text-[#124346]">{files._count._all}</p><p className="text-xs text-[#596364]">{storageMb} MB</p></div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
          <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#124346]">Admin Profile</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-xl bg-[#f3f4f3] px-4 py-3"><p className="text-[#6e7778]">Name</p><p className="font-semibold text-[#1a1c1c]">{admin?.fullName ?? 'System Admin'}</p></div>
            <div className="rounded-xl bg-[#f3f4f3] px-4 py-3"><p className="text-[#6e7778]">Email</p><p className="font-semibold text-[#1a1c1c]">{admin?.email ?? '-'}</p></div>
            <div className="rounded-xl bg-[#f3f4f3] px-4 py-3"><p className="text-[#6e7778]">Phone</p><p className="font-semibold text-[#1a1c1c]">{admin?.phone ?? '-'}</p></div>
          </div>
        </div>

        <div className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
          <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#124346]">Role Distribution</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-[#f3f4f3] px-4 py-3"><span className="text-[#596364]">Admins</span><span className="font-bold">{roleMap.get('ADMIN') ?? 0}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-[#f3f4f3] px-4 py-3"><span className="text-[#596364]">Teachers</span><span className="font-bold">{roleMap.get('TEACHER') ?? 0}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-[#f3f4f3] px-4 py-3"><span className="text-[#596364]">Students</span><span className="font-bold">{roleMap.get('STUDENT') ?? 0}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-[#f3f4f3] px-4 py-3"><span className="text-[#596364]">Parents</span><span className="font-bold">{roleMap.get('PARENT') ?? 0}</span></div>
          </div>
        </div>

        <div className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
          <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#124346]">System Modules</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-[#f3f4f3] px-4 py-3"><span className="text-[#596364]">Classes</span><span className="font-bold">{classes}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-[#f3f4f3] px-4 py-3"><span className="text-[#596364]">Subjects</span><span className="font-bold">{subjects}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-[#f3f4f3] px-4 py-3"><span className="text-[#596364]">Assignments</span><span className="font-bold">{assignments}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-[#f3f4f3] px-4 py-3"><span className="text-[#596364]">Files</span><span className="font-bold">{files._count._all}</span></div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#124346]">Recently Added Users</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f4f3] text-[#596364]"><tr><th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Name</th><th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Email</th><th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Role</th><th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Status</th><th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Created</th></tr></thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-semibold text-[#1a1c1c]">{u.fullName}</td>
                  <td className="px-3 py-3">{u.email}</td>
                  <td className="px-3 py-3">{u.role}</td>
                  <td className="px-3 py-3">{u.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-3 py-3">{u.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentUsers.length === 0 ? <p className="mt-4 text-sm text-[#596364]">No users found.</p> : null}
        </div>
      </section>
    </div>
  );
}
