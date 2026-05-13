'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellRing, CircleDot, MailPlus, Search, SendHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';

type FilterKey = 'all' | 'unread' | 'sent';

type NotificationItem = {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  type: string;
  target: string;
  status: 'Unread' | 'Sent';
};

type NotificationStats = {
  total: number;
  unread: number;
  sent: number;
  readRate: number;
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const delta = Date.now() - date.getTime();
  if (delta < 60_000) return 'Now';
  if (delta < 86_400_000) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function badgeTone(type: string) {
  if (type === 'FINANCIAL') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (type === 'ATTENDANCE') return 'bg-cyan-50 text-cyan-700 border-cyan-200';
  if (type === 'ACADEMIC') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (type === 'MESSAGE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function getMinuteBucket(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.MIN_SAFE_INTEGER;
  return Math.floor(date.getTime() / 60_000);
}

export default function AdminNotificationsWorkspace({
  stats,
  notifications,
  composeAction
}: {
  stats: NotificationStats;
  notifications: NotificationItem[];
  composeAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [items, setItems] = useState<NotificationItem[]>(notifications);
  const [selectedId, setSelectedId] = useState<string>(notifications[0]?.id ?? '');
  const [showPanel, setShowPanel] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState('');

  useEffect(() => {
    setItems(notifications);
  }, [notifications]);

  useEffect(() => {
    if (!items.length) {
      setSelectedId('');
      return;
    }
    if (!items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesFilter =
        activeFilter === 'all' ? true : activeFilter === 'unread' ? item.status === 'Unread' : item.status === 'Sent';
      const q = query.trim().toLowerCase();
      const matchesQuery = q
        ? `${item.title} ${item.subtitle} ${item.target} ${item.type}`.toLowerCase().includes(q)
        : true;
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, items, query]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  const filterCount = {
    all: items.length,
    unread: items.filter((item) => item.status === 'Unread').length,
    sent: items.filter((item) => item.status === 'Sent').length
  };

  const deleteNotification = async (item: NotificationItem) => {
    const confirmed = window.confirm(
      `Delete notification "${item.title}"?\nThis removes this broadcast from database.`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setDeleteMessage('');

    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'broadcast',
          id: item.id,
          title: item.title,
          body: item.subtitle,
          type: item.type,
          createdAt: item.createdAt
        })
      });

      const payload = await response.json().catch(() => ({} as { deletedCount?: number; error?: string }));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete notification.');
      }

      const targetBucket = getMinuteBucket(item.createdAt);
      setItems((prev) =>
        prev.filter(
          (current) =>
            !(
              current.title === item.title &&
              current.subtitle === item.subtitle &&
              current.type === item.type &&
              getMinuteBucket(current.createdAt) === targetBucket
            )
        )
      );

      setDeleteMessage(`Deleted ${payload.deletedCount ?? 1} notification(s).`);
      router.refresh();
    } catch (error) {
      setDeleteMessage(error instanceof Error ? error.message : 'Failed to delete notification.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-[0_12px_40px_rgba(0,70,73,0.06)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-headline text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Notifications</h2>
            <p className="mt-1 text-sm text-slate-500">Inbox-style broadcasts with faster compose and tracking.</p>
          </div>
          <Button type="button" onClick={() => setShowPanel((prev) => !prev)}>
            <MailPlus size={16} />
            New Notification
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Unread</p>
            <p className="mt-2 text-2xl font-semibold text-red-700">{stats.unread}</p>
          </article>
          <article className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Sent</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">{stats.sent}</p>
          </article>
          <article className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Read Rate</p>
            <p className="mt-2 text-2xl font-semibold text-blue-700">{stats.readRate}%</p>
          </article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="border-b border-slate-200 p-3 sm:p-4">
            <label className="flex h-11 w-full items-center gap-2 rounded-xl bg-[#edeeef] border-none px-3">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search notifications"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              {([
                ['all', 'All'],
                ['unread', 'Unread'],
                ['sent', 'Sent']
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFilter(key)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    activeFilter === key
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                  <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[11px]">{filterCount[key]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[66vh] overflow-y-auto p-3 sm:p-4">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <BellRing className="mx-auto h-7 w-7 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-800">No notifications found</p>
                <p className="mt-1 text-xs text-slate-500">Try changing filters or search terms.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((item) => {
                  const active = selected?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setSelectedId(item.id); setShowPanel(true); }}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        active
                          ? 'border-blue-200 bg-blue-50/70 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.subtitle}</p>
                        </div>
                        <p className="shrink-0 text-[11px] text-slate-500">{formatTime(item.createdAt)}</p>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeTone(item.type)}`}>
                          {item.type}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {item.target}
                        </span>
                        {item.status === 'Unread' ? <CircleDot className="ml-auto h-3.5 w-3.5 text-blue-500" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className={`${showPanel ? 'block' : 'hidden xl:block'} space-y-4`}>
          {showPanel && (
            <button
              type="button"
              onClick={() => setShowPanel(false)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0C3D2E] xl:hidden"
            >
              ← Back to list
            </button>
          )}
          <section className="rounded-2xl bg-white p-4 shadow-[0_12px_40px_rgba(0,70,73,0.06)] sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900">Detail</h3>
            {selected ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeTone(selected.type)}`}>
                    {selected.type}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {selected.status}
                  </span>
                </div>
                <h4 className="text-base font-semibold text-slate-900">{selected.title}</h4>
                <p className="text-sm leading-relaxed text-slate-600">{selected.subtitle}</p>
                <p className="text-xs text-slate-500">
                  {new Date(selected.createdAt).toLocaleString('en-US')} - Target: {selected.target}
                </p>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => void deleteNotification(selected)}
                  disabled={deletingId === selected.id}
                >
                  <Trash2 size={14} />
                  {deletingId === selected.id ? 'Deleting...' : 'Delete'}
                </Button>
                {deleteMessage ? (
                  <p className={`text-xs ${deleteMessage.startsWith('Deleted') ? 'text-emerald-700' : 'text-red-600'}`}>
                    {deleteMessage}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Select any notification from inbox to preview details.</p>
            )}
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-[0_12px_40px_rgba(0,70,73,0.06)] sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900">Create Notification</h3>
            <form action={composeAction} className="mt-3 space-y-3">
              <input
                name="title"
                required
                placeholder="Title"
                className="h-11 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none transition focus:ring-2 focus:ring-[#004649]/20"
              />

              <select
                name="type"
                className="h-11 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none transition focus:ring-2 focus:ring-[#004649]/20"
              >
                <option value="SYSTEM">System</option>
                <option value="ACADEMIC">Academic</option>
                <option value="FINANCIAL">Financial</option>
                <option value="ATTENDANCE">Attendance</option>
                <option value="MESSAGE">Message</option>
              </select>

              <select
                name="targetRole"
                className="h-11 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none transition focus:ring-2 focus:ring-[#004649]/20"
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="PARENT">Parent</option>
                <option value="ADMIN">Admin</option>
              </select>

              <textarea
                name="body"
                required
                rows={5}
                placeholder="Write a concise message..."
                className="w-full rounded-xl bg-[#edeeef] border-none p-3 text-sm outline-none transition focus:ring-2 focus:ring-[#004649]/20"
              />

              <Button type="submit" fullWidth size="lg">
                <SendHorizontal size={16} />
                Send Notification
              </Button>
            </form>
          </section>
        </aside>
      </section>
    </div>
  );
}
