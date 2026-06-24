'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, RotateCw, Zap, Users, Phone, UserX, CheckCircle2 } from 'lucide-react';
import { KpiCard } from '@/components/ui';
import { FinanceToast } from '../finance-toast';

type ReminderCampaign = {
  id: string;
  createdAt: string;
  type: 'REMINDER' | 'CONFIRMATION';
  status: 'DRAFT' | 'APPROVED' | 'SENT';
  totalStudents: number;
  totalWithWhatsApp: number;
  totalSkipped: number;
  scheduledAt: string | null;
};

type ReminderCampaignItem = {
  id: string;
  campaignId: string;
  studentId: string | null;
  studentName: string;
  whatsApp: string | null;
  hasWhatsApp: boolean;
  message: string;
  status: 'PENDING' | 'SENT' | 'SKIPPED';
  sentAt?: string | null;
  whatsappUrl: string | null;
  templateData?: {
    amountDue: string;
    dueDate: string;
  };
};

type ReminderPreviewResponse = {
  campaign: ReminderCampaign;
  items: ReminderCampaignItem[];
};

function parseOverdueCount(message: string): number {
  const m = message.match(/Overdue Fees: (\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return isoString.slice(0, 10);
  }
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `AED ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusBadgeClass(status: 'PENDING' | 'SENT' | 'SKIPPED') {
  if (status === 'PENDING') return 'bg-[#fff7ed] text-[#b45309]';
  if (status === 'SENT') return 'bg-[#dcfce7] text-[#15803d]';
  return 'bg-[#f3f4f5] text-[#6f7979]';
}

function statusBorderClass(status: 'PENDING' | 'SENT' | 'SKIPPED') {
  if (status === 'PENDING') return 'border-l-[#f39c12]';
  if (status === 'SENT') return 'border-l-[#27ae60]';
  return 'border-l-[#d1d5db]';
}

export default function AdminFinanceRemindersPage() {
  const [data, setData] = useState<ReminderPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [markingItemId, setMarkingItemId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  const campaign = data?.campaign ?? null;
  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const createdAt = useMemo(() => {
    if (!campaign?.createdAt) return '-';
    const d = new Date(campaign.createdAt);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('en-GB');
  }, [campaign?.createdAt]);

  const overdueCount = useMemo(() => {
    return items.filter(i => parseOverdueCount(i.message) > 0).length;
  }, [items]);

  const generateCampaign = async () => {
    setGenerating(true);
    setError(null);
    setToast(null);
    try {
      const createResponse = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const createPayload = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok || !createPayload?.campaignId) {
        throw new Error(createPayload?.error ?? 'Failed to create campaign');
      }

      const campaignId = String(createPayload.campaignId);

      const approveResponse = await fetch(`/api/campaigns/${campaignId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const approvePayload = await approveResponse.json().catch(() => ({}));
      if (!approveResponse.ok) {
        throw new Error(approvePayload?.error ?? 'Failed to approve campaign');
      }

      const getResponse = await fetch(`/api/campaigns/${campaignId}`, { cache: 'no-store' });
      const getPayload = await getResponse.json().catch(() => ({}));
      if (!getResponse.ok) {
        throw new Error(getPayload?.error ?? 'Failed to load campaign');
      }

      setData(getPayload as ReminderPreviewResponse);
      setToast({ message: 'Campaign generated and approved.', type: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate campaign');
      setToast({ message: err instanceof Error ? err.message : 'Failed to generate campaign', type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const refreshCampaign = async () => {
    if (!campaign?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to refresh');
      setData(payload as ReminderPreviewResponse);
      setToast({ message: 'Campaign refreshed.', type: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWhatsApp = async (item: ReminderCampaignItem) => {
    if (!item.whatsappUrl || item.status !== 'PENDING') return;

    window.open(item.whatsappUrl, '_blank', 'noopener,noreferrer');

    setMarkingItemId(item.id);
    setError(null);
    try {
      const response = await fetch(`/api/campaigns/${item.campaignId}/items/${item.id}/mark-sent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to mark as sent');
      }

      const updatedItem = payload?.item as Partial<ReminderCampaignItem> | undefined;

      setData((prev) => {
        if (!prev || prev.campaign.id !== item.campaignId) return prev;
        return {
          ...prev,
          items: prev.items.map((current) => {
            if (current.id !== item.id) return current;
            return {
              ...current,
              status: 'SENT',
              sentAt: updatedItem?.sentAt ?? new Date().toISOString(),
              whatsappUrl: null,
            };
          }),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as sent');
    } finally {
      setMarkingItemId(null);
    }
  };

  const sendAllPending = async () => {
    const pendingItems = items.filter(i => i.status === 'PENDING' && i.whatsappUrl);
    if (pendingItems.length === 0) return;

    setSendingAll(true);
    setError(null);

    for (const item of pendingItems) {
      window.open(item.whatsappUrl!, '_blank', 'noopener,noreferrer');
      try {
        const response = await fetch(`/api/campaigns/${item.campaignId}/items/${item.id}/mark-sent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          setError(payload?.error ?? `Failed to mark ${item.studentName} as sent`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark as sent');
      }
    }

    setSendingAll(false);
    await refreshCampaign();
  };

  const pendingCount = items.filter(i => i.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Finance</p>
            <h1 className="mt-0.5 text-2xl font-extrabold text-[#1a1c1c] sm:text-3xl">Reminder Campaign</h1>
            <p className="mt-1 text-sm text-[#6f7979]">Build one WhatsApp reminder list for unpaid and overdue students, then send and track status from one place.</p>
          </div>
          <div className="flex gap-2">
            {data ? (
              <button
                onClick={refreshCampaign}
                disabled={loading}
                className="h-10 flex items-center gap-1.5 rounded-xl bg-[#f0f2f5] px-3 text-xs font-semibold text-[#2c3e50] hover:bg-[#e8ecf0] active:scale-[0.98] disabled:opacity-60 transition-all"
              >
                <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            ) : null}
            <button
              onClick={generateCampaign}
              disabled={generating}
              className="h-10 flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-4 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(0,70,73,0.2)] hover:scale-105 hover:shadow-[0_6px_16px_rgba(0,70,73,0.3)] active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              <Zap className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              Build Campaign
            </button>
          </div>
        </div>
      </div>

      {!data ? (
        <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
          <h3 className="text-sm font-bold text-[#1a1c1c]">How this works</h3>
          <ul className="mt-2 space-y-1 text-xs text-[#6f7979]">
            <li>1. Build Campaign collects students with unpaid or overdue fee.</li>
            <li>2. Students without WhatsApp are automatically skipped.</li>
            <li>3. Open WhatsApp sends reminder message and marks item as sent.</li>
          </ul>
        </div>
      ) : null}

      {/* ── Empty State ── */}
      {!data && !generating && !loading && !error ? (
        <div className="rounded-2xl bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-[#f0f2f5] p-4">
              <AlertCircle className="h-8 w-8 text-[#6f7979]" />
            </div>
            <h2 className="text-lg font-bold text-[#1a1c1c]">No campaign built yet.</h2>
            <p className="mt-2 text-sm text-[#6f7979] max-w-sm">Click Build Campaign to prepare reminder items for students whose fee is unpaid or overdue.</p>
            <button
              onClick={generateCampaign}
              disabled={generating}
              className="mt-6 h-11 flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(0,70,73,0.2)] hover:scale-105 hover:shadow-[0_6px_16px_rgba(0,70,73,0.3)] active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              <Zap className="h-4 w-4" />
              Build Reminder Campaign
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Loading ── */}
      {generating && !data ? (
        <div className="rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 text-sm text-[#6f7979]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#004649] border-t-transparent" />
            <span>Generating campaign...</span>
          </div>
        </div>
      ) : null}

      {/* ── Error ── */}
      {error ? (
        <div className="rounded-2xl bg-[#fef2f2] border border-[#fca5a5] px-4 py-3 sm:p-6">
          <p className="text-sm font-semibold text-[#b91c1c]">{error}</p>
        </div>
      ) : null}

      {/* ── Content (when data exists) ── */}
      {data && campaign ? (
        <>
          {/* KPI Cards */}
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard variant="primary" icon={<Users size={20} />} label="Total Students" value={campaign.totalStudents} />
            <KpiCard variant="success" icon={<Phone size={20} />} label="With WhatsApp" value={campaign.totalWithWhatsApp} />
            <KpiCard variant="accent" icon={<UserX size={20} />} label="Skipped" value={campaign.totalSkipped} />
            <KpiCard variant="danger" icon={<AlertCircle size={20} />} label="Overdue 🔴" value={overdueCount} />
          </div>

          {/* Campaign Status Bar */}
          <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-[#6f7979] uppercase font-bold">Campaign Status</p>
                <div className="mt-1.5 flex gap-2">
                  {campaign.status === 'DRAFT' ? (
                    <span className="rounded-full bg-[#f3f4f5] px-3 py-1 text-xs font-bold text-[#6f7979]">DRAFT</span>
                  ) : campaign.status === 'APPROVED' ? (
                    <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#b45309]">APPROVED</span>
                  ) : (
                    <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#15803d]">SENT</span>
                  )}
                </div>
              </div>
              <div className="text-xs text-[#6f7979]">
                <p>Created: <span className="font-semibold text-[#1a1c1c]">{createdAt}</span></p>
                {campaign.scheduledAt ? (
                  <p className="mt-1">Scheduled: <span className="font-semibold text-[#1a1c1c]">{new Date(campaign.scheduledAt).toLocaleString('en-GB')}</span></p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {pendingCount > 0 ? (
            <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={sendAllPending}
                  disabled={sendingAll || loading}
                  className="h-11 flex items-center gap-1.5 rounded-xl bg-[#25d366] px-4 text-xs font-bold text-white hover:bg-[#1fa456] active:scale-[0.98] disabled:opacity-60 transition-all"
                >
                  <Zap className="h-4 w-4" />
                  Send All Pending ({pendingCount})
                </button>
                <button
                  onClick={async () => {
                    for (const item of items.filter(i => i.status === 'PENDING')) {
                      setMarkingItemId(item.id);
                      try {
                        await fetch(`/api/campaigns/${item.campaignId}/items/${item.id}/mark-sent`, { method: 'POST' });
                      } catch {}
                    }
                    setMarkingItemId(null);
                    await refreshCampaign();
                  }}
                  disabled={sendingAll || loading}
                  className="h-11 flex items-center gap-1.5 rounded-xl bg-[#27ae60] px-4 text-xs font-bold text-white hover:bg-[#229954] active:scale-[0.98] disabled:opacity-60 transition-all"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark All Sent
                </button>
              </div>
            </div>
          ) : null}

          {/* Items List */}
          <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
            <h3 className="text-lg font-bold text-[#1a1c1c] mb-4">Campaign Items ({items.length})</h3>

            {items.length === 0 ? (
              <p className="text-sm text-[#6f7979]">No items in campaign.</p>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="space-y-2 sm:hidden">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border-l-4 p-4 ${statusBorderClass(item.status)} bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06)]`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-semibold text-[#1a1c1c] flex-1 truncate">{item.studentName}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2 mb-3 text-xs text-[#6f7979]">
                        <span>
                          {item.templateData?.amountDue ? formatCurrency(item.templateData.amountDue) : 'N/A'} due •{' '}
                          {item.templateData?.dueDate ? formatDate(item.templateData.dueDate) : 'N/A'}
                        </span>
                      </div>
                      {item.whatsappUrl ? (
                        <button
                          type="button"
                          onClick={() => void handleOpenWhatsApp(item)}
                          disabled={item.status !== 'PENDING' || markingItemId === item.id}
                          className={`w-full h-11 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                            item.status === 'SENT'
                              ? 'bg-[#dcfce7] text-[#15803d] disabled:cursor-not-allowed'
                              : 'bg-[#25d366] text-white hover:bg-[#1fa456] active:scale-[0.98]'
                          } disabled:opacity-50`}
                        >
                          {item.status === 'SENT' ? '✓ Sent' : markingItemId === item.id ? 'Sending...' : '📱 Send WhatsApp'}
                        </button>
                      ) : (
                        <div className="w-full h-11 flex items-center justify-center rounded-lg bg-[#f3f4f5] text-xs font-bold text-[#6f7979]">
                          No Phone
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full min-w-[800px] text-sm">
                    <thead>
                      <tr className="bg-[#f3f4f5] border-b border-[#e2e8e8]">
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Student</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Fee Amount</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Due Date</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Status</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b border-[#f0f2f0] last:border-0 hover:bg-[#f9fafb]">
                          <td className="px-4 py-3.5 font-medium text-[#1a1c1c]">{item.studentName}</td>
                          <td className="px-4 py-3.5 text-[#6f7979]">
                            {item.templateData?.amountDue ? formatCurrency(item.templateData.amountDue) : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-[#6f7979]">
                            {item.templateData?.dueDate ? formatDate(item.templateData.dueDate) : '-'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold inline-block ${statusBadgeClass(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {item.whatsappUrl ? (
                              <button
                                type="button"
                                onClick={() => void handleOpenWhatsApp(item)}
                                disabled={item.status !== 'PENDING' || markingItemId === item.id}
                                className={`h-10 flex items-center justify-center gap-1 rounded-lg px-3 text-xs font-bold transition-all ${
                                  item.status === 'SENT'
                                    ? 'bg-[#dcfce7] text-[#15803d] disabled:cursor-not-allowed'
                                    : 'bg-[#25d366] text-white hover:bg-[#1fa456] active:scale-[0.98]'
                                } disabled:opacity-50`}
                              >
                                {item.status === 'SENT' ? '✓ Sent' : markingItemId === item.id ? '...' : '📱 Send'}
                              </button>
                            ) : (
                              <span className="inline-flex h-10 items-center justify-center px-3 text-xs font-bold text-[#6f7979] bg-[#f3f4f5] rounded-lg">
                                N/A
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      ) : null}

      {/* Toast */}
      {toast ? <FinanceToast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
