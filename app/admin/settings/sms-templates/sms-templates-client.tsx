'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, MessageSquare, Pencil, X, Sparkles, RefreshCw } from 'lucide-react';

type SmsTemplate = {
  id: string;
  key: string;
  name: string;
  description: string;
  body: string;
  variables: string;
  isActive: boolean;
};

const KEY_COLORS: Record<string, { gradient: string; accent: string; badge: string; badgeText: string }> = {
  registration:  { gradient: 'from-[#1d4ed8] to-[#3b82f6]', accent: 'border-l-[#3b82f6]', badge: 'bg-[#dbeafe] text-[#1d4ed8]', badgeText: 'Registration' },
  fee_reminder:  { gradient: 'from-[#b45309] to-[#d97706]', accent: 'border-l-[#d97706]', badge: 'bg-[#fef3c7] text-[#b45309]', badgeText: 'Fees' },
  fee_receipt:   { gradient: 'from-[#15803d] to-[#22c55e]', accent: 'border-l-[#22c55e]', badge: 'bg-[#dcfce7] text-[#15803d]', badgeText: 'Fees' },
  attendance:    { gradient: 'from-[#7c3aed] to-[#a78bfa]', accent: 'border-l-[#a78bfa]', badge: 'bg-[#ede9fe] text-[#7c3aed]', badgeText: 'Attendance' },
  exam:          { gradient: 'from-[#be185d] to-[#ec4899]', accent: 'border-l-[#ec4899]', badge: 'bg-[#fce7f3] text-[#be185d]', badgeText: 'Exam' },
  enquiry:       { gradient: 'from-[#0e7490] to-[#06b6d4]', accent: 'border-l-[#06b6d4]', badge: 'bg-[#cffafe] text-[#0e7490]', badgeText: 'Enquiry' },
};

const DEFAULT_COLOR = { gradient: 'from-[#64748b] to-[#94a3b8]', accent: 'border-l-[#94a3b8]', badge: 'bg-[#f1f5f9] text-[#64748b]', badgeText: 'Other' };

export default function SmsTemplatesClient() {
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [smsLoading, setSmsLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [editBody, setEditBody] = useState('');
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsToast, setSmsToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadSmsTemplates = useCallback(async () => {
    if (smsTemplates.length > 0) return;
    setSmsLoading(true);
    try {
      const res = await fetch('/api/sms-templates');
      if (res.ok) setSmsTemplates(await res.json());
    } finally {
      setSmsLoading(false);
    }
  }, [smsTemplates.length]);

  useEffect(() => {
    loadSmsTemplates();
  }, [loadSmsTemplates]);

  function openEdit(t: SmsTemplate) {
    setEditingTemplate(t);
    setEditBody(t.body);
  }

  async function saveTemplate() {
    if (!editingTemplate) return;
    setSmsSaving(true);
    try {
      const res = await fetch('/api/sms-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTemplate.id, templateBody: editBody }),
      });
      if (res.ok) {
        const updated: SmsTemplate = await res.json();
        setSmsTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setEditingTemplate(null);
        setSmsToast({ ok: true, msg: 'Template saved!' });
      } else {
        setSmsToast({ ok: false, msg: 'Failed to save.' });
      }
    } finally {
      setSmsSaving(false);
      setTimeout(() => setSmsToast(null), 2500);
    }
  }

  function resetTemplate() {
    if (!editingTemplate) return;
    const original = smsTemplates.find((t) => t.id === editingTemplate.id);
    if (original) setEditBody(original.body);
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Back link */}
      <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0C3D2E] hover:text-[#1a5c41] transition">
        <ArrowLeft className="h-4 w-4" /> Back to Settings
      </Link>

      {/* Header banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3D2E] to-[#1a5c41] p-5 text-white shadow-[0_4px_20px_rgba(12,61,46,0.25)]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-2 ring-white/30">
            <MessageSquare className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Settings</p>
            <h1 className="text-xl font-bold">SMS Templates</h1>
            <p className="text-sm text-white/70">WhatsApp & SMS message editor</p>
          </div>
        </div>
      </div>

      {/* Info badge */}
      <div className="flex items-center gap-3 rounded-2xl border border-[#d4c5a0] bg-[#fdf6e9] px-5 py-3.5">
        <Sparkles className="h-4 w-4 text-[#C9952A] shrink-0" />
        <p className="text-sm font-medium text-[#7a5c10]">Click <span className="font-bold">Edit</span> on any template to customize the message. Use the variable chips to insert placeholders.</p>
      </div>

      {/* Templates */}
      <div className="rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-[#e5e7eb]">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-1 w-4 rounded-full bg-[#C9952A]" />
          <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Message Templates</p>
          <span className="ml-auto text-xs font-semibold text-[#94a3b8]">{smsTemplates.length} templates</span>
        </div>

        {smsLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#0C3D2E]">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading templates…
          </div>
        ) : smsTemplates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#e2e8f0] p-10 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-[#cbd5e1] mb-3" />
            <p className="text-sm font-medium text-[#94a3b8]">No templates found.</p>
            <button type="button" onClick={loadSmsTemplates} className="mt-2 text-sm font-semibold text-[#0C3D2E] hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {smsTemplates.map((t) => {
              const colors = KEY_COLORS[t.key] ?? DEFAULT_COLOR;
              return (
                <div key={t.id} className={`rounded-xl border border-[#e2e8f0] border-l-4 ${colors.accent} bg-white p-4 transition hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-bold text-[#0f172a]">{t.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colors.badge}`}>
                          {colors.badgeText}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          t.isActive ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#be123c]'
                        }`}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748b] mb-2">{t.description}</p>
                      <pre className="whitespace-pre-wrap rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3 text-xs text-[#374151] font-mono leading-relaxed">
                        {t.body}
                      </pre>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-semibold text-[#94a3b8]">Variables:</span>
                        {t.variables.split(',').map((v) => (
                          <code key={v} className="rounded bg-[#f1f5f9] border border-[#e2e8f0] px-1.5 py-0.5 text-[10px] font-mono text-[#334155]">
                            {v.trim()}
                          </code>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      className={`shrink-0 flex items-center gap-1.5 rounded-xl bg-gradient-to-r ${colors.gradient} px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {smsToast && (
        <div className={`fixed right-4 top-20 z-50 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-xl transition ${
          smsToast.ok ? 'bg-[#0C3D2E]' : 'bg-[#dc2626]'
        }`}>
          {smsToast.msg}
        </div>
      )}

      {/* Edit modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            {/* Modal header — keeps per-template gradient for visual variety */}
            <div className={`flex items-center justify-between rounded-t-2xl bg-gradient-to-r ${(KEY_COLORS[editingTemplate.key] ?? DEFAULT_COLOR).gradient} px-5 py-4`}>
              <div>
                <p className="text-sm font-bold text-white">{editingTemplate.name}</p>
                <p className="text-xs text-white/70">{editingTemplate.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="rounded-lg p-1.5 bg-white/20 hover:bg-white/30 transition"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                  Message Body
                </label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={10}
                  className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-sm font-mono text-[#0f172a] outline-none focus:border-[#0C3D2E] focus:ring-2 focus:ring-[#0C3D2E]/10 resize-none transition"
                />
              </div>
              <div className="rounded-xl bg-[#fdf6e9] border border-[#d4c5a0] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a5c10] mb-2">
                  Available Variables — click to insert
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {editingTemplate.variables.split(',').map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEditBody((prev) => prev + v.trim())}
                      className="rounded-lg bg-white border border-[#d4c5a0] px-2.5 py-1 text-xs font-mono text-[#7a5c10] hover:bg-[#0C3D2E] hover:text-white hover:border-[#0C3D2E] transition"
                      title="Click to insert"
                    >
                      {v.trim()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#e2e8f0] px-5 py-4">
              <button
                type="button"
                onClick={resetTemplate}
                className="text-xs font-semibold text-[#94a3b8] hover:text-[#64748b] transition"
              >
                Reset changes
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="rounded-xl border border-[#e2e8f0] px-4 py-2 text-xs font-semibold text-[#64748b] hover:bg-[#f1f5f9] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveTemplate}
                  disabled={smsSaving}
                  className={`rounded-xl bg-gradient-to-r ${(KEY_COLORS[editingTemplate.key] ?? DEFAULT_COLOR).gradient} px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60 transition`}
                >
                  {smsSaving ? 'Saving…' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
