'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { ArrowLeft, Camera, Mail, Phone, User, Calendar } from 'lucide-react';

type State = { ok: boolean; message: string };

type ProfileData = {
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  createdAtLabel: string;
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export default function ProfileClient({
  admin,
  action,
}: {
  admin: ProfileData;
  action: (prev: State, formData: FormData) => Promise<State>;
}) {
  const [state, formAction, isPending] = useActionState(action, { ok: false, message: '' });
  const [avatarPreview, setAvatarPreview] = useState(admin.avatarUrl);
  const [avatarDataUrl, setAvatarDataUrl] = useState('');
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    if (!state.message) return;
    setToastOpen(true);
    const timer = setTimeout(() => setToastOpen(false), 2600);
    return () => clearTimeout(timer);
  }, [state]);

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const v = typeof reader.result === 'string' ? reader.result : '';
      if (!v) return;
      setAvatarPreview(v);
      setAvatarDataUrl(v);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Back */}
      <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0C3D2E] hover:text-[#1a5c41] transition">
        <ArrowLeft className="h-4 w-4" /> Back to Settings
      </Link>

      {/* Page header banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3D2E] to-[#1a5c41] p-5 text-white shadow-[0_4px_20px_rgba(12,61,46,0.3)]">
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold backdrop-blur-sm ring-2 ring-white/30 overflow-hidden">
            {avatarPreview
              ? <Image src={avatarPreview} alt="" fill className="object-cover rounded-2xl" />
              : <span>{initials(admin.fullName) || 'AD'}</span>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Settings</p>
            <h1 className="text-xl font-bold">Profile</h1>
            <p className="text-sm text-white/70">Update identity and avatar</p>
          </div>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        {/* Avatar card */}
        <div className="rounded-2xl bg-white p-5 border border-[#e5e7eb] shadow-[0_2px_8px_rgba(12,61,46,0.06)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-3.5 w-1 rounded-full bg-[#C9952A]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#64748b]">Avatar</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-[#d4c5a0] bg-[#fdf6e9]">
              {avatarPreview
                ? <Image src={avatarPreview} alt="Avatar" fill className="object-cover" />
                : <div className="flex h-full w-full items-center justify-center text-2xl font-black text-[#0C3D2E]">{initials(admin.fullName) || 'AD'}</div>
              }
            </div>
            <div className="space-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#C9952A]/40 bg-[#fdf6e9] px-4 py-2.5 text-sm font-semibold text-[#0C3D2E] hover:bg-[#f5eddc] transition">
                <Camera className="h-4 w-4 text-[#C9952A]" />
                Upload Photo
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
              </label>
              <p className="text-xs text-[#94a3b8]">JPG, PNG or WebP · max 2MB</p>
            </div>
          </div>
          <input name="avatarDataUrl" value={avatarDataUrl} onChange={(e) => setAvatarDataUrl(e.target.value)} type="hidden" />
        </div>

        {/* Info card */}
        <div className="rounded-2xl bg-white p-5 border border-[#e5e7eb] shadow-[0_2px_8px_rgba(12,61,46,0.06)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-3.5 w-1 rounded-full bg-[#C9952A]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#64748b]">Personal Info</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                <User className="h-3.5 w-3.5" /> Full Name
              </label>
              <input name="fullName" defaultValue={admin.fullName} required
                className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-[#f8f7f4] px-4 text-sm text-[#0f172a] outline-none focus:border-[#C9952A] focus:ring-2 focus:ring-[#C9952A]/15 transition" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                <Mail className="h-3.5 w-3.5" /> Email Address
              </label>
              <input name="email" type="email" defaultValue={admin.email} required
                className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-[#f8f7f4] px-4 text-sm text-[#0f172a] outline-none focus:border-[#C9952A] focus:ring-2 focus:ring-[#C9952A]/15 transition" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                <Phone className="h-3.5 w-3.5" /> Phone
              </label>
              <input name="phone" defaultValue={admin.phone}
                className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-[#f8f7f4] px-4 text-sm text-[#0f172a] outline-none focus:border-[#C9952A] focus:ring-2 focus:ring-[#C9952A]/15 transition" />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-[#f8f7f4] border border-[#e5e7eb] px-4 py-3">
              <Calendar className="h-4 w-4 text-[#94a3b8]" />
              <p className="text-xs text-[#64748b]">Account created <span className="font-semibold text-[#334155]">{admin.createdAtLabel}</span></p>
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div className="flex justify-end">
          <button type="submit" disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C9952A] to-[#e0aa38] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(201,149,42,0.35)] hover:shadow-[0_6px_20px_rgba(201,149,42,0.45)] disabled:opacity-60 disabled:cursor-not-allowed transition">
            {isPending ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </form>

      {toastOpen && state.message && (
        <div className={`fixed right-4 top-20 z-50 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-xl transition ${state.ok ? 'bg-[#0C3D2E]' : 'bg-[#dc2626]'}`}>
          {state.message}
        </div>
      )}
    </div>
  );
}
