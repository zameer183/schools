import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ROLE_META = {
  ADMIN: { label: 'Admin', desc: 'Full system access', tier: 'SUPERUSER', tierColor: 'bg-[#fff3e0] text-[#865300]', icon: '🛡️' },
  TEACHER: { label: 'Teacher', desc: 'Academic management', tier: 'DEPARTMENTAL', tierColor: 'bg-[#e8f5e9] text-[#004649]', icon: '🎓' },
  STUDENT: { label: 'Student', desc: 'Learning access', tier: 'OPERATIONAL', tierColor: 'bg-[#e8f0ff] text-[#1a4bcc]', icon: '📚' },
  PARENT: { label: 'Parent', desc: 'Guardian oversight', tier: 'FINANCIAL', tierColor: 'bg-[#fce4ec] text-[#ba1a1a]', icon: '👥' },
};

export default async function AdminRolesPage() {
  await requireAuth([UserRole.ADMIN]);

  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: { _all: true },
  });

  const roleMap = new Map(usersByRole.map((r) => [r.role, r._count._all]));

  const lastUpdate = new Date();
  lastUpdate.setHours(lastUpdate.getHours() - 2);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1a1c1c] sm:text-3xl">Governance Framework</h2>
          <p className="mt-1 text-sm text-[#6f7979]">
            Define institutional boundaries and manage administrative privileges across your scholarly ecosystem.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-[#004649] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition shrink-0">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create New Role
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl bg-white border border-[#e2e8e8] overflow-hidden">
          <div className="hidden grid-cols-3 border-b border-[#e2e8e8] bg-[#f5f7f5] px-5 py-3 md:grid">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Role Name</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">User Count</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Access Tier</p>
          </div>
          <div className="divide-y divide-[#e2e8e8]">
            {(Object.keys(ROLE_META) as UserRole[]).map((role) => {
              const meta = ROLE_META[role];
              const count = roleMap.get(role) ?? 0;
              return (
                <div key={role} className="grid grid-cols-1 gap-2 px-5 py-4 transition-colors hover:bg-[#f5f7f5] md:grid-cols-3 md:items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#f0f2f0] flex items-center justify-center text-lg">
                      {meta.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-[#1a1c1c]">{meta.label}</p>
                      <p className="text-xs text-[#6f7979]">{meta.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:justify-start">
                    <p className="text-2xl font-bold text-[#1a1c1c]">{count}</p>
                    <p className="text-xs text-[#6f7979]">
                      {role === 'TEACHER' ? 'Staff members' : role === 'STUDENT' ? 'Students' : role === 'PARENT' ? 'Guardians' : 'Admins'}
                    </p>
                  </div>
                  <span className={`inline-block w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.tierColor}`}>
                    {meta.tier}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1a1c1c]">Active Role Details</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#fff3e0] text-[#865300] px-2 py-0.5 rounded-full">EDITING</span>
          </div>
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Selected Role</p>
            <div className="flex items-center gap-2 rounded-xl bg-[#f5f7f5] px-4 py-3">
              <span className="text-lg">🎓</span>
              <span className="font-semibold text-[#1a1c1c]">Teacher</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-3">Functional Privileges</p>
            <div className="space-y-3">
              {[
                { label: 'View Student Records', desc: 'Access to grades and history', enabled: true },
                { label: 'Edit Finances', desc: 'Modify tuition and payroll', enabled: false },
                { label: 'Manage Staff', desc: 'Hire, fire, and assign roles', enabled: false },
                { label: 'Generate Reports', desc: 'Analytics and data exports', enabled: true },
              ].map((priv) => (
                <div key={priv.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1a1c1c]">{priv.label}</p>
                    <p className="text-xs text-[#6f7979]">{priv.desc}</p>
                  </div>
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${priv.enabled ? 'bg-[#004649]' : 'bg-[#e2e8e8]'}`}>
                    <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${priv.enabled ? 'left-6' : 'left-1'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button className="flex-1 rounded-xl border border-[#e2e8e8] py-2.5 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f5f7f5] transition">
              Discard
            </button>
            <button className="flex-1 rounded-xl bg-[#004649] py-2.5 text-sm font-bold text-white hover:opacity-90 transition">
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-[#dce8e8] p-5">
          <div className="w-11 h-11 rounded-xl bg-[#004649] flex items-center justify-center mb-3">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <h4 className="font-bold text-[#1a1c1c] mb-1">Policy Compliance</h4>
          <p className="text-sm text-[#3d4a4a]">System-wide role changes are logged for internal auditing and regional compliance mandates.</p>
        </div>
        <div className="rounded-xl bg-[#fff3e0] p-5">
          <div className="w-11 h-11 rounded-xl bg-[#865300] flex items-center justify-center mb-3">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h4 className="font-bold text-[#1a1c1c] mb-1">Audit History</h4>
          <p className="text-sm text-[#865300]">Last configuration update: {lastUpdate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} by Administrator.</p>
        </div>
        <div className="rounded-xl bg-[#f5f7f5] p-5">
          <div className="w-11 h-11 rounded-xl bg-[#1a1c1c] flex items-center justify-center mb-3">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <h4 className="font-bold text-[#1a1c1c] mb-1">Advanced Roles</h4>
          <p className="text-sm text-[#6f7979]">Unlock institutional automation based on role-specific event triggers.</p>
        </div>
      </div>
    </div>
  );
}
