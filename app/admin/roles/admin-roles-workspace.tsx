'use client';

import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  BookOpen,
  CreditCard,
  FileBarChart2,
  Filter,
  GraduationCap,
  Megaphone,
  Plus,
  Search,
  Settings,
  Shield,
  Users
} from 'lucide-react';

type RoleKey = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
type Tier = 'All' | 'Superuser' | 'Departmental' | 'Operational' | 'Financial';

type RoleItem = {
  key: RoleKey;
  label: string;
  description: string;
  tier: Exclude<Tier, 'All'>;
  userCount: number;
};

type PermissionGroup = {
  id: string;
  label: string;
  icon: typeof Shield;
  permissions: Array<{ key: string; label: string; helper: string }>;
};

const ROLE_STYLES: Record<RoleKey, string> = {
  ADMIN: 'bg-amber-50 text-amber-700 border-amber-200',
  TEACHER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  STUDENT: 'bg-blue-50 text-blue-700 border-blue-200',
  PARENT: 'bg-rose-50 text-rose-700 border-rose-200'
};

const ROLE_ICON: Record<RoleKey, typeof Shield> = {
  ADMIN: Shield,
  TEACHER: GraduationCap,
  STUDENT: BookOpen,
  PARENT: Users
};

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'core',
    label: 'Core Controls',
    icon: Settings,
    permissions: [
      { key: 'dashboard_view', label: 'View Dashboard', helper: 'Access admin home metrics and widgets' },
      { key: 'users_manage', label: 'Manage Users', helper: 'Create, edit, and disable accounts' },
      { key: 'roles_manage', label: 'Manage Roles', helper: 'Edit role capabilities and boundaries' }
    ]
  },
  {
    id: 'academics',
    label: 'Academic Modules',
    icon: BookOpen,
    permissions: [
      { key: 'classes_manage', label: 'Manage Classes', helper: 'Create classes and assign teachers' },
      { key: 'attendance_manage', label: 'Manage Attendance', helper: 'Mark and review attendance records' },
      { key: 'exams_reports', label: 'Exams & Reports', helper: 'Publish marks and generate reports' }
    ]
  },
  {
    id: 'finance',
    label: 'Finance & Communication',
    icon: CreditCard,
    permissions: [
      { key: 'finance_manage', label: 'Manage Finance', helper: 'Collect fees and monitor dues' },
      { key: 'notifications_send', label: 'Send Notifications', helper: 'Broadcast role-based notices' },
      { key: 'messages_send', label: 'Send Messages', helper: 'Direct in-app messaging access' }
    ]
  }
];

const DEFAULT_PERMISSIONS: Record<RoleKey, Record<string, boolean>> = {
  ADMIN: {
    dashboard_view: true,
    users_manage: true,
    roles_manage: true,
    classes_manage: true,
    attendance_manage: true,
    exams_reports: true,
    finance_manage: true,
    notifications_send: true,
    messages_send: true
  },
  TEACHER: {
    dashboard_view: true,
    users_manage: false,
    roles_manage: false,
    classes_manage: true,
    attendance_manage: true,
    exams_reports: true,
    finance_manage: false,
    notifications_send: true,
    messages_send: true
  },
  STUDENT: {
    dashboard_view: true,
    users_manage: false,
    roles_manage: false,
    classes_manage: false,
    attendance_manage: false,
    exams_reports: true,
    finance_manage: false,
    notifications_send: false,
    messages_send: true
  },
  PARENT: {
    dashboard_view: true,
    users_manage: false,
    roles_manage: false,
    classes_manage: false,
    attendance_manage: true,
    exams_reports: true,
    finance_manage: true,
    notifications_send: true,
    messages_send: true
  }
};

function Toggle({
  checked,
  onChange
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-7 w-12 rounded-full transition ${
        checked ? 'bg-emerald-600' : 'bg-slate-300'
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );
}

export default function AdminRolesWorkspace({ roles }: { roles: RoleItem[] }) {
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<Tier>('All');
  const [selectedRole, setSelectedRole] = useState<RoleKey>(roles[0]?.key ?? 'ADMIN');
  const [draft, setDraft] = useState(DEFAULT_PERMISSIONS);
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [showCreate, setShowCreate] = useState(false);

  const filteredRoles = useMemo(
    () =>
      roles.filter((role) => {
        const matchesTier = tier === 'All' ? true : role.tier === tier;
        const q = query.trim().toLowerCase();
        const matchesQuery = q ? `${role.label} ${role.description}`.toLowerCase().includes(q) : true;
        return matchesTier && matchesQuery;
      }),
    [roles, query, tier]
  );

  const selected = filteredRoles.find((role) => role.key === selectedRole) ?? roles.find((role) => role.key === selectedRole) ?? null;

  const selectedPermissions = selected ? draft[selected.key] : DEFAULT_PERMISSIONS.ADMIN;

  function togglePermission(key: string) {
    if (!selected) return;
    setDraft((prev) => ({
      ...prev,
      [selected.key]: {
        ...prev[selected.key],
        [key]: !prev[selected.key][key]
      }
    }));
    setStatus('idle');
  }

  function savePermissions() {
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 1800);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-[0_12px_40px_rgba(0,70,73,0.06)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-headline text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Role Management</h2>
            <p className="mt-1 text-sm text-slate-500">Manage role access with clean controls and permission boundaries.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#1F5A5C] to-[#2D7578] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(31,90,92,0.12)] active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Role
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="flex h-11 items-center gap-2 rounded-xl bg-[#E0EBEC] border-none px-3">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search role by name or function"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="flex h-11 items-center gap-2 rounded-xl bg-[#E0EBEC] border-none px-3 text-sm text-slate-600">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={tier}
              onChange={(event) => setTier(event.target.value as Tier)}
              className="w-full bg-transparent outline-none"
            >
              <option>All</option>
              <option>Superuser</option>
              <option>Departmental</option>
              <option>Operational</option>
              <option>Financial</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Roles</p>
          </div>
          <div className="max-h-[72vh] space-y-2 overflow-y-auto p-3">
            {filteredRoles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="text-sm font-medium text-slate-800">No role found</p>
                <p className="mt-1 text-xs text-slate-500">Adjust your search or tier filter.</p>
              </div>
            ) : (
              filteredRoles.map((role) => {
                const active = role.key === selected?.key;
                const Icon = ROLE_ICON[role.key];
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setSelectedRole(role.key)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      active
                        ? 'border-blue-200 bg-blue-50/70 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{role.label}</p>
                          <p className="truncate text-xs text-slate-500">{role.description}</p>
                        </div>
                      </div>
                      <span className={`self-start rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:self-auto ${ROLE_STYLES[role.key]}`}>{role.tier}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {role.userCount} users
                      </span>
                      {active ? <BadgeCheck className="h-4 w-4 text-blue-600" /> : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          {selected ? (
            <>
              <header className="border-b border-slate-200 px-4 py-4 sm:px-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    {(() => {
                      const Icon = ROLE_ICON[selected.key];
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{selected.label} Permissions</h3>
                    <p className="text-xs text-slate-500">{selected.description}</p>
                  </div>
                </div>
              </header>

              <div className="max-h-[62vh] space-y-4 overflow-y-auto p-3 sm:p-5">
                {PERMISSION_GROUPS.map((group) => {
                  const GroupIcon = group.icon;
                  return (
                    <article key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <GroupIcon className="h-4 w-4 text-slate-600" />
                        <h4 className="text-sm font-semibold text-slate-900">{group.label}</h4>
                      </div>
                      <div className="space-y-2">
                        {group.permissions.map((perm) => (
                          <div key={perm.key} className="flex flex-col gap-3 rounded-xl bg-[#f3f4f5] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900">{perm.label}</p>
                              <p className="text-xs text-slate-500">{perm.helper}</p>
                            </div>
                            <Toggle checked={Boolean(selectedPermissions[perm.key])} onChange={() => togglePermission(perm.key)} />
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>

              <footer className="sticky bottom-0 flex flex-col items-stretch gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <span className={`text-xs font-medium ${status === 'saved' ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {status === 'saved' ? 'Changes saved' : 'Unsaved changes'}
                </span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2 md:flex md:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selected) return;
                      setDraft((prev) => ({ ...prev, [selected.key]: DEFAULT_PERMISSIONS[selected.key] }));
                      setStatus('idle');
                    }}
                    className="rounded-xl bg-[#f3f4f5] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#f3f4f5]"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={savePermissions}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#1F5A5C] to-[#2D7578] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(31,90,92,0.12)] active:scale-[0.98] transition-all"
                  >
                    <FileBarChart2 className="h-4 w-4" />
                    Save Changes
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">Select a role to view permissions.</div>
          )}
        </section>
      </section>

      {showCreate ? (
        <section className="rounded-2xl bg-white p-4 shadow-[0_12px_40px_rgba(0,70,73,0.06)] sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-900">Create Role</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              placeholder="Role name"
              className="h-11 rounded-xl bg-[#E0EBEC] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#1F5A5C]/20"
            />
            <select className="h-11 rounded-xl bg-[#E0EBEC] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#1F5A5C]/20">
              <option>Departmental</option>
              <option>Operational</option>
              <option>Financial</option>
              <option>Superuser</option>
            </select>
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black">
              Save New Role
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
