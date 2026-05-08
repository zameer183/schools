'use client';

import Image from 'next/image';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, Building2, Camera, ChevronRight, LockKeyhole, Shield, UserRound } from 'lucide-react';

type SaveState = {
  ok: boolean;
  message: string;
};

type NavKey = 'profile' | 'institution' | 'system' | 'security';

type AdminData = {
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  createdAtLabel: string;
};

type SystemData = {
  totalUsers: number;
  totalStorageMb: string;
  activeTeachers: number;
  activeStudents: number;
};

const navItems: Array<{ key: NavKey; label: string; helper: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'profile', label: 'Profile', helper: 'Admin identity and avatar', icon: UserRound },
  { key: 'institution', label: 'Institution', helper: 'Brand and contact settings', icon: Building2 },
  { key: 'system', label: 'System', helper: 'Usage and overview metrics', icon: BadgeCheck },
  { key: 'security', label: 'Security', helper: 'Password and 2FA settings', icon: Shield }
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function SettingsWorkspace({
  admin,
  system,
  action
}: {
  admin: AdminData;
  system: SystemData;
  action: (prev: SaveState, formData: FormData) => Promise<SaveState>;
}) {
  const [state, formAction, isPending] = useActionState(action, { ok: false, message: '' });
  const [activeTab, setActiveTab] = useState<NavKey>('profile');
  const [avatarPreview, setAvatarPreview] = useState(admin.avatarUrl);
  const [toastOpen, setToastOpen] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState('');

  const profileRef = useRef<HTMLElement | null>(null);
  const institutionRef = useRef<HTMLElement | null>(null);
  const systemRef = useRef<HTMLElement | null>(null);
  const securityRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!state.message) return;
    setToastOpen(true);
    const timer = setTimeout(() => setToastOpen(false), 2600);
    return () => clearTimeout(timer);
  }, [state]);

  const sectionRefs = useMemo(
    () => ({
      profile: profileRef,
      institution: institutionRef,
      system: systemRef,
      security: securityRef
    }),
    []
  );

  const jumpTo = (key: NavKey) => {
    setActiveTab(key);
    sectionRefs[key].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAvatarFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      if (!value) return;
      setAvatarPreview(value);
      setAvatarDataUrl(value);
    };
    reader.readAsDataURL(file);
  };

  return (
    <form action={formAction} className="relative space-y-4">
      <section className="rounded-2xl bg-white px-5 py-6 shadow-[0_12px_40px_rgba(0,70,73,0.06)] sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Admin Settings</p>
        <h1 className="font-headline mt-2 text-2xl font-bold tracking-tight text-[#0f172a] sm:text-3xl">Workspace Settings</h1>
        <p className="mt-1 text-sm text-[#64748b]">Manage profile, institution preferences, system controls, and security from one place.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl bg-white p-3 shadow-[0_12px_40px_rgba(0,70,73,0.06)] lg:sticky lg:top-20">
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => jumpTo(item.key)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                    active ? 'border-[#99c8bc] bg-[#afedf2]/30' : 'border-transparent hover:border-[#dbe7e2] hover:bg-[#f3f4f5]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-[#004649] text-white' : 'bg-[#f1f5f9] text-[#475569]'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[#0f172a]">{item.label}</span>
                      <span className="block text-[11px] text-[#64748b]">{item.helper}</span>
                    </span>
                  </span>
                  <ChevronRight className={`h-4 w-4 ${active ? 'text-[#004649]' : 'text-[#94a3b8]'}`} />
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-4">
          <section ref={profileRef} className="rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)] sm:p-6">
            <h2 className="text-lg font-semibold text-[#0f172a]">Profile</h2>
            <p className="mt-1 text-sm text-[#64748b]">Update admin account details and display avatar.</p>

            <div className="mt-5 grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="relative h-28 w-28 overflow-hidden rounded-2xl border border-[#d3e2dc] bg-[#eff6f4]">
                  {avatarPreview ? (
                    <Image src={avatarPreview} alt="Admin avatar" fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-[#004649]">{initials(admin.fullName) || 'AD'}</div>
                  )}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#d1ded9] bg-white px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#f8fbfa]">
                  <Camera className="h-4 w-4" />
                  Upload Avatar
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                </label>
                <input name="avatarDataUrl" value={avatarDataUrl} onChange={(e) => setAvatarDataUrl(e.target.value)} type="hidden" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Full Name</label>
                  <input name="fullName" defaultValue={admin.fullName} required className="h-11 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#0f172a] outline-none focus:ring-2 focus:ring-[#004649]/20" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Email</label>
                  <input name="email" type="email" defaultValue={admin.email} required className="h-11 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#0f172a] outline-none focus:ring-2 focus:ring-[#004649]/20" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Phone</label>
                  <input name="phone" defaultValue={admin.phone} className="h-11 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#0f172a] outline-none focus:ring-2 focus:ring-[#004649]/20" />
                </div>
                <div className="sm:col-span-2 rounded-xl border border-[#e2ece8] bg-[#f8fbfa] p-3 text-xs text-[#64748b]">
                  Account created on <span className="font-semibold text-[#334155]">{admin.createdAtLabel}</span>
                </div>
              </div>
            </div>
          </section>

          <section ref={institutionRef} className="rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)] sm:p-6">
            <h2 className="text-lg font-semibold text-[#0f172a]">Institution</h2>
            <p className="mt-1 text-sm text-[#64748b]">Configure contact and campus details shown across dashboards.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Institution Name</label>
                <input name="institutionName" defaultValue="Manarah Institute" className="h-11 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Timezone</label>
                <select name="timezone" defaultValue="Asia/Karachi" className="h-11 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20">
                  <option value="Asia/Karachi">Asia/Karachi (GMT+05:00)</option>
                  <option value="UTC">UTC (GMT+00:00)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GMT+04:00)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Support Email</label>
                <input name="supportEmail" defaultValue={admin.email} className="h-11 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Support Phone</label>
                <input name="supportPhone" defaultValue={admin.phone} className="h-11 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Campus Address</label>
                <textarea name="campusAddress" rows={3} defaultValue="Main Academic Block, Central Campus" className="w-full rounded-xl bg-[#edeeef] border-none p-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" />
              </div>
            </div>
          </section>

          <section ref={systemRef} className="rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)] sm:p-6">
            <h2 className="text-lg font-semibold text-[#0f172a]">System Overview</h2>
            <p className="mt-1 text-sm text-[#64748b]">Live operational metrics for monitoring platform health.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Total Users</p>
                <p className="mt-2 text-2xl font-bold text-[#0f172a]">{system.totalUsers}</p>
              </article>
              <article className="rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Storage Used</p>
                <p className="mt-2 text-2xl font-bold text-[#0f172a]">{system.totalStorageMb} MB</p>
              </article>
              <article className="rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Active Teachers</p>
                <p className="mt-2 text-2xl font-bold text-[#0f172a]">{system.activeTeachers}</p>
              </article>
              <article className="rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Active Students</p>
                <p className="mt-2 text-2xl font-bold text-[#0f172a]">{system.activeStudents}</p>
              </article>
            </div>
          </section>

          <section ref={securityRef} className="rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)] sm:p-6">
            <h2 className="text-lg font-semibold text-[#0f172a]">Security</h2>
            <p className="mt-1 text-sm text-[#64748b]">Manage password and additional sign-in protections.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Current Password</label>
                <input name="currentPassword" type="password" autoComplete="current-password" className="h-11 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">New Password</label>
                <input name="newPassword" type="password" autoComplete="new-password" className="h-11 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Confirm Password</label>
                <input name="confirmPassword" type="password" autoComplete="new-password" className="h-11 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" />
              </div>
              <div className="sm:col-span-2 rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <LockKeyhole className="h-4 w-4 text-[#004649]" />
                    <p className="text-sm font-semibold text-[#0f172a]">Two-factor authentication (2FA)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTwoFaEnabled((prev) => !prev)}
                    className={`relative h-7 w-12 rounded-full transition ${twoFaEnabled ? 'bg-[#004649]' : 'bg-[#cbd5e1]'}`}
                    aria-pressed={twoFaEnabled}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${twoFaEnabled ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <p className="mt-1 text-xs text-[#64748b]">Require a verification code in addition to password.</p>
                <input name="twoFaEnabled" type="hidden" value={twoFaEnabled ? '1' : '0'} />
              </div>
            </div>
          </section>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-2 rounded-2xl border border-[#d5e3dd] bg-white/95 px-4 py-3 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
        <p className="text-xs text-[#64748b]">All editable sections are grouped here. Save applies profile and security updates.</p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-xl bg-[#004649] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#005a5e] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {toastOpen && state.message ? (
        <div className={`fixed right-4 top-20 z-50 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg ${state.ok ? 'bg-[#27ae60]' : 'bg-[#e74c3c]'}`}>
          {state.message}
        </div>
      ) : null}
    </form>
  );
}
