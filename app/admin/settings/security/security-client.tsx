'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, ShieldCheck, ShieldOff } from 'lucide-react';

type State = { ok: boolean; message: string };

export default function SecurityClient({
  createdAtLabel,
  action,
}: {
  createdAtLabel: string;
  action: (prev: State, formData: FormData) => Promise<State>;
}) {
  const [state, formAction, isPending] = useActionState(action, { ok: false, message: '' });
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!state.message) return;
    setToastOpen(true);
    const t = setTimeout(() => setToastOpen(false), 2600);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <div className="space-y-5 pb-8">
      {/* Back */}
      <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0C3D2E] hover:text-[#1a5c41] transition">
        <ArrowLeft className="h-4 w-4" /> Back to Settings
      </Link>

      {/* Header banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3D2E] to-[#1a5c41] p-5 text-white shadow-[0_4px_20px_rgba(12,61,46,0.25)]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-2 ring-white/30">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Settings</p>
            <h1 className="text-xl font-bold">Security</h1>
            <p className="text-sm text-white/70">Password & access protection</p>
          </div>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        {/* Account info */}
        <div className="flex items-center gap-3 rounded-2xl border border-[#f5eddc] bg-[#fdf6e9] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
            <KeyRound className="h-4 w-4 text-[#C9952A]" />
          </div>
          <p className="text-sm text-[#64748b]">Account registered on <span className="font-semibold text-[#334155]">{createdAtLabel}</span></p>
        </div>

        {/* Password card */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-[#e5e7eb]">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-1 w-4 rounded-full bg-[#C9952A]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Change Password</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Current password */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Current Password</label>
              <div className="relative">
                <input name="currentPassword" type={showCurrent ? 'text' : 'password'} autoComplete="current-password"
                  className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 pr-10 text-sm text-[#0f172a] outline-none focus:border-[#C9952A] focus:ring-2 focus:ring-[#C9952A]/15 transition" />
                <button type="button" onClick={() => setShowCurrent((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0C3D2E]">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#64748b]">New Password</label>
              <div className="relative">
                <input name="newPassword" type={showNew ? 'text' : 'password'} autoComplete="new-password"
                  className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 pr-10 text-sm text-[#0f172a] outline-none focus:border-[#C9952A] focus:ring-2 focus:ring-[#C9952A]/15 transition" />
                <button type="button" onClick={() => setShowNew((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0C3D2E]">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Confirm Password</label>
              <div className="relative">
                <input name="confirmPassword" type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                  className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 pr-10 text-sm text-[#0f172a] outline-none focus:border-[#C9952A] focus:ring-2 focus:ring-[#C9952A]/15 transition" />
                <button type="button" onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0C3D2E]">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2FA card */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-[#e5e7eb]">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-1 w-4 rounded-full bg-[#C9952A]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Two-Factor Authentication</p>
          </div>
          <div className={`rounded-xl border p-4 transition ${twoFaEnabled ? 'border-[#C9952A]/40 bg-[#fdf6e9]' : 'border-[#e5e7eb] bg-[#f8fafc]'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${twoFaEnabled ? 'bg-[#fdf6e9]' : 'bg-[#f1f5f9]'}`}>
                  {twoFaEnabled
                    ? <ShieldCheck className="h-5 w-5 text-[#C9952A]" />
                    : <ShieldOff className="h-5 w-5 text-[#94a3b8]" />
                  }
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">2FA {twoFaEnabled ? 'Enabled' : 'Disabled'}</p>
                  <p className="text-xs text-[#64748b]">Verification code required at login</p>
                </div>
              </div>
              <button type="button" onClick={() => setTwoFaEnabled((p) => !p)} aria-pressed={twoFaEnabled}
                className={`relative h-7 w-13 min-w-[52px] rounded-full transition-colors duration-200 ${twoFaEnabled ? 'bg-[#C9952A]' : 'bg-[#cbd5e1]'}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${twoFaEnabled ? 'left-[28px]' : 'left-1'}`} />
              </button>
            </div>
          </div>
          <input name="twoFaEnabled" type="hidden" value={twoFaEnabled ? '1' : '0'} />
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button type="submit" disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C9952A] to-[#e0aa38] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(201,149,42,0.3)] hover:shadow-[0_6px_20px_rgba(201,149,42,0.4)] disabled:opacity-60 disabled:cursor-not-allowed transition">
            <Lock className="h-4 w-4" />
            {isPending ? 'Updating…' : 'Update Security'}
          </button>
        </div>
      </form>

      {toastOpen && state.message && (
        <div className={`fixed right-4 top-20 z-50 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-xl ${state.ok ? 'bg-[#16a34a]' : 'bg-[#dc2626]'}`}>
          {state.message}
        </div>
      )}
    </div>
  );
}
