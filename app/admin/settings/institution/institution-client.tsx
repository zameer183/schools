'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, Clock, Globe, Mail, MapPin, Phone } from 'lucide-react';

type InstitutionData = {
  supportEmail: string;
  supportPhone: string;
};

export default function InstitutionClient({ data }: { data: InstitutionData }) {
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
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Settings</p>
            <h1 className="text-xl font-bold">Institution</h1>
            <p className="text-sm text-white/70">Brand, address & contact info</p>
          </div>
        </div>
      </div>

      {/* Coming soon badge */}
      <div className="flex items-center gap-3 rounded-2xl border border-[#d4c5a0] bg-[#fdf6e9] px-5 py-3.5">
        <div className="h-2 w-2 rounded-full bg-[#C9952A] animate-pulse" />
        <p className="text-sm font-medium text-[#7a5c10]">Full persistence coming soon — fields are display-only for now.</p>
      </div>

      <div className="space-y-4">
        {/* Identity card */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-[#e5e7eb]">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-1 w-4 rounded-full bg-[#C9952A]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Identity</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                <Building2 className="h-3.5 w-3.5" /> Institution Name
              </label>
              <input name="institutionName" defaultValue="Manarah Institute"
                className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 text-sm text-[#0f172a] outline-none focus:border-[#C9952A] focus:ring-2 focus:ring-[#C9952A]/15 transition" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                <Globe className="h-3.5 w-3.5" /> Website
              </label>
              <input name="website" placeholder="https://manarah.edu.pk"
                className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 text-sm text-[#0f172a] outline-none focus:border-[#C9952A] focus:ring-2 focus:ring-[#C9952A]/15 transition" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                <Clock className="h-3.5 w-3.5" /> Timezone
              </label>
              <select name="timezone" defaultValue="Asia/Karachi"
                className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 text-sm text-[#0f172a] outline-none focus:border-[#C9952A] focus:ring-2 focus:ring-[#C9952A]/15 transition">
                <option value="Asia/Karachi">Asia/Karachi (GMT+05:00)</option>
                <option value="UTC">UTC (GMT+00:00)</option>
                <option value="Asia/Dubai">Asia/Dubai (GMT+04:00)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (GMT+05:30)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact card */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-[#e5e7eb]">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-1 w-4 rounded-full bg-[#C9952A]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Contact Info</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                <Mail className="h-3.5 w-3.5" /> Support Email
              </label>
              <input name="supportEmail" defaultValue={data.supportEmail}
                className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 text-sm text-[#0f172a] outline-none focus:border-[#C9952A] focus:ring-2 focus:ring-[#C9952A]/15 transition" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                <Phone className="h-3.5 w-3.5" /> Support Phone
              </label>
              <input name="supportPhone" defaultValue={data.supportPhone}
                className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 text-sm text-[#0f172a] outline-none focus:border-[#C9952A] focus:ring-2 focus:ring-[#C9952A]/15 transition" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                <MapPin className="h-3.5 w-3.5" /> Campus Address
              </label>
              <textarea name="campusAddress" rows={3} defaultValue="Main Academic Block, Central Campus"
                className="w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4 text-sm text-[#0f172a] outline-none focus:border-[#C9952A] focus:ring-2 focus:ring-[#C9952A]/15 transition resize-none" />
            </div>
          </div>
        </div>

        {/* Save (disabled) */}
        <div className="flex justify-end">
          <button type="button" disabled
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C9952A] to-[#e0aa38] px-6 py-2.5 text-sm font-semibold text-white opacity-40 cursor-not-allowed shadow-[0_4px_12px_rgba(201,149,42,0.2)]">
            Save Institution
          </button>
        </div>
      </div>
    </div>
  );
}
