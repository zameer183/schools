'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BellOff,
  GraduationCap,
  Mail,
  MailCheck,
  Megaphone,
  Plus,
  Send,
  Trash2,
  X
} from 'lucide-react';

type ClassItem = { id: string; name: string; section: string };
type StudentItem = { id: string; userId: string; fullName: string; admissionNo: string; classId: string | null };
type InboxItem = {
  id: string;
  title: string;
  body: string;
  type: 'SYSTEM' | 'ACADEMIC' | 'FINANCIAL' | 'ATTENDANCE' | 'MESSAGE';
  isRead: boolean;
  createdAt: string;
};
type HistoryItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  recipientCount: number;
  unreadRecipients: number;
};

type RecipientType = 'ALL_ASSIGNED' | 'CLASS' | 'STUDENT';
type Priority = 'NORMAL' | 'IMPORTANT' | 'URGENT';

const PRIORITY_TONE: Record<Priority, string> = {
  NORMAL: 'bg-[#ECFDF3] text-[#166534] border-[#BBF7D0]',
  IMPORTANT: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  URGENT: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
};

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

export default function TeacherNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedInboxIds, setSelectedInboxIds] = useState<string[]>([]);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [recipientType, setRecipientType] = useState<RecipientType>('ALL_ASSIGNED');
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');

  const classStudents = useMemo(
    () => (classId ? students.filter((student) => student.classId === classId) : []),
    [students, classId]
  );

  async function loadData() {
    setLoading(true);
    setNotice('');
    try {
      const res = await fetch('/api/teacher/notifications', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Unable to load notifications');

      setClasses(Array.isArray(json.classes) ? json.classes : []);
      setStudents(Array.isArray(json.students) ? json.students : []);
      setInbox(Array.isArray(json.inbox) ? json.inbox : []);
      setHistory(Array.isArray(json.history) ? json.history : []);
      setUnreadCount(typeof json.unreadCount === 'number' ? json.unreadCount : 0);
      setSelectedInboxIds([]);
      setSelectedHistoryIds([]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load notifications');
    } finally {
      setLoading(false);
    }
  }

  const allSelected = inbox.length > 0 && selectedInboxIds.length === inbox.length;
  const allHistorySelected = history.length > 0 && selectedHistoryIds.length === history.length;

  function onToggleSelectAll() {
    if (loading || deleting) return;
    if (inbox.length === 0) {
      setNotice('No notifications available to select.');
      return;
    }
    setSelectedInboxIds(allSelected ? [] : inbox.map((x) => x.id));
  }

  async function onDeleteSelected() {
    if (selectedInboxIds.length === 0) {
      setNotice('Please select at least one notification first.');
      return;
    }
    setDeleting(true);
    setNotice('');
    try {
      const res = await fetch('/api/teacher/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedInboxIds })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Unable to delete selected notifications');
      setNotice(`${json.deletedCount ?? 0} notification(s) deleted.`);
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to delete selected notifications');
    } finally {
      setDeleting(false);
    }
  }

  async function onDeleteAll() {
    if (inbox.length === 0) {
      setNotice('No notifications available to delete.');
      return;
    }
    setDeleting(true);
    setNotice('');
    try {
      const res = await fetch('/api/teacher/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Unable to delete all notifications');
      setNotice(`${json.deletedCount ?? 0} notification(s) deleted from database.`);
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to delete all notifications');
    } finally {
      setDeleting(false);
    }
  }

  function onToggleSelectAllHistory() {
    if (loading || deleting) return;
    if (history.length === 0) {
      setNotice('No history available to select.');
      return;
    }
    setSelectedHistoryIds(allHistorySelected ? [] : history.map((x) => x.id));
  }

  async function onDeleteSelectedHistory() {
    if (selectedHistoryIds.length === 0) {
      setNotice('Please select at least one history item first.');
      return;
    }
    setDeleting(true);
    setNotice('');
    try {
      const res = await fetch('/api/teacher/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'history', ids: selectedHistoryIds })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Unable to delete selected history');
      setNotice(`${json.deletedCount ?? 0} history item(s) deleted.`);
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to delete selected history');
    } finally {
      setDeleting(false);
    }
  }

  async function onClearHistory() {
    if (history.length === 0) {
      setNotice('No history available to clear.');
      return;
    }
    setDeleting(true);
    setNotice('');
    try {
      const res = await fetch('/api/teacher/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'history', all: true })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Unable to clear history');
      setNotice(`${json.deletedCount ?? 0} history item(s) cleared from database.`);
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to clear history');
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  async function onMarkAllRead() {
    setMarkingRead(true);
    setNotice('');
    try {
      const res = await fetch('/api/teacher/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'mark-all-read' })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Unable to mark notifications read');
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to mark notifications read');
    } finally {
      setMarkingRead(false);
    }
  }

  async function onSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setNotice('');
    try {
      const res = await fetch('/api/teacher/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientType,
          classId,
          studentId,
          title,
          message,
          priority
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Unable to send notification');

      setSheetOpen(false);
      setTitle('');
      setMessage('');
      setRecipientType('ALL_ASSIGNED');
      setClassId('');
      setStudentId('');
      setPriority('NORMAL');
      setNotice(`Notification sent to ${json.recipientCount ?? 0} student(s).`);
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to send notification');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="-mx-4 -my-6 min-h-screen space-y-6 bg-[#F4F7F8] px-4 py-5 pb-28 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="rounded-[24px] border border-white bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#006A61]">Teacher Portal</p>
            <h1 className="mt-2 text-[28px] font-black leading-tight tracking-[-0.04em] text-[#111827]">Notifications</h1>
            <p className="mt-1 max-w-md text-sm leading-6 text-[#4B5563]">Send alerts to your assigned students and track delivery history with academic clarity.</p>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#F8FAFC] text-[#00507D] ring-1 ring-[#E2E8F0]">
            <GraduationCap className="h-6 w-6" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="mt-5 inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#084750] px-4 text-sm font-black text-white shadow-[0_16px_28px_rgba(8,71,80,0.24)] transition hover:brightness-105 active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          Send Notification
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[24px] border border-white bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#8BE8D8] text-[#007A70]">
              <Mail className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-[#EEF2F7] px-3 py-1 text-xs font-bold text-[#94A3B8]">Updates daily</span>
          </div>
          <p className="mt-5 text-sm font-bold text-[#4B5563]">Unread Notifications</p>
          <p className="mt-2 text-[42px] font-black leading-none tracking-[-0.05em] text-[#111827]">{unreadCount}</p>
        </div>

        <div className="rounded-[24px] border border-white bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">Clean Slate</h2>
              <p className="mt-2 text-base leading-6 text-[#4B5563]">
                {unreadCount === 0 ? 'All caught up! No new messages requiring your immediate attention.' : `${unreadCount} unread update(s) need your review.`}
              </p>
            </div>
          <button
            type="button"
            disabled={markingRead || unreadCount === 0}
            onClick={onMarkAllRead}
            className="shrink-0 rounded-2xl px-3 py-2 text-sm font-black text-[#007A70] transition hover:bg-[#E6F4F1] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {markingRead ? 'Marking...' : 'Mark All Read'}
          </button>
          </div>
        </div>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-[#DCE7EA] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] shadow-sm">{notice}</div>
      ) : null}

      <div className="overflow-hidden rounded-[24px] border border-[#E5EAF0] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)]">
        <div className="flex items-center gap-2 bg-[#F8FAFC] px-5 py-4">
          <Bell className="h-5 w-5 text-[#007A70]" />
          <h2 className="text-sm font-black uppercase tracking-wide text-[#1F2937]">Inbox</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF2F7] px-5 py-3">
          <button
            type="button"
            onClick={onToggleSelectAll}
            disabled={loading || deleting}
            className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-semibold text-[#475569] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allSelected ? 'Unselect All' : 'Select All'}
          </button>
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={loading || deleting}
            className="inline-flex items-center gap-1 rounded-xl border border-[#FBE0E0] bg-[#FDECEC] px-4 py-2 text-xs font-semibold text-[#C94A4A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Selected ({selectedInboxIds.length})
          </button>
          <button
            type="button"
            onClick={onDeleteAll}
            disabled={loading || deleting}
            className="inline-flex items-center gap-1 rounded-xl border border-transparent bg-white px-4 py-2 text-xs font-semibold text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete All
          </button>
        </div>

        {loading ? (
          <p className="px-5 py-10 text-sm text-[#64748B]">Loading...</p>
        ) : inbox.length === 0 ? (
          <div className="relative px-8 py-14 text-center">
            <div className="relative mx-auto grid h-44 w-44 place-items-center rounded-full bg-[#F1F5F9]">
              <BellOff className="h-20 w-20 text-[#CBD5E1]" />
              <span className="absolute right-2 top-3 h-6 w-6 rounded-full bg-[#6EE7D8]" />
            </div>
            <h3 className="mt-7 text-2xl font-black tracking-[-0.04em] text-[#111827]">No notifications yet</h3>
            <p className="mx-auto mt-3 max-w-xs text-base leading-6 text-[#4B5563]">Your inbox is empty. When students or the system send you updates, they will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2.5 p-5">
            {inbox.map((item) => (
              <div key={item.id} className={`rounded-2xl border p-3 ${item.isRead ? 'border-[#E2E8F0] bg-white' : 'border-[#BAE6FD] bg-[#F0F9FF]'}`}>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedInboxIds.includes(item.id)}
                    onChange={(e) => {
                      setSelectedInboxIds((prev) => {
                        if (e.target.checked) return [...prev, item.id];
                        return prev.filter((id) => id !== item.id);
                      });
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-[#94a3b8] text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0F172A]">{item.title}</p>
                      {!item.isRead ? <span className="rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[10px] font-bold text-[#1D4ED8]">Unread</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-[#475569]">{item.body}</p>
                    <p className="mt-1.5 text-[11px] text-[#64748B]">{formatDate(item.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[#E5EAF0] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)]">
        <div className="flex items-center gap-2 bg-[#F8FAFC] px-5 py-4">
          <Megaphone className="h-5 w-5 text-[#00507D]" />
          <h2 className="text-sm font-black uppercase tracking-wide text-[#1F2937]">Sent Notifications History</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF2F7] px-5 py-3">
          <button
            type="button"
            onClick={onToggleSelectAllHistory}
            disabled={loading || deleting}
            className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-semibold text-[#475569] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allHistorySelected ? 'Unselect All' : 'Select All'}
          </button>
          <button
            type="button"
            onClick={onDeleteSelectedHistory}
            disabled={loading || deleting}
            className="inline-flex items-center gap-1 rounded-xl border border-[#FBE0E0] bg-[#FDECEC] px-4 py-2 text-xs font-semibold text-[#C94A4A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Selected ({selectedHistoryIds.length})
          </button>
          <button
            type="button"
            onClick={onClearHistory}
            disabled={loading || deleting}
            className="inline-flex items-center gap-1 rounded-xl border border-transparent bg-white px-4 py-2 text-xs font-semibold text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear History
          </button>
        </div>

        {loading ? (
          <p className="px-5 py-10 text-sm text-[#64748B]">Loading...</p>
        ) : history.length === 0 ? (
          <div className="relative px-8 py-14 text-center">
            <div className="relative mx-auto grid h-44 w-44 place-items-center rounded-full bg-[#F1F5F9]">
              <MailCheck className="h-20 w-20 text-[#CBD5E1]" />
              <span className="absolute bottom-2 left-1 h-6 w-6 rounded-full bg-[#93C5FD]" />
            </div>
            <h3 className="mt-7 text-2xl font-black tracking-[-0.04em] text-[#111827]">No sent messages</h3>
            <p className="mx-auto mt-3 max-w-xs text-base leading-6 text-[#4B5563]">You have not sent any notifications to your students yet. Start by creating a new alert.</p>
            <button type="button" onClick={() => setSheetOpen(true)} className="mt-5 text-sm font-black text-[#00507D]">Compose your first notification</button>
          </div>
        ) : (
          <div className="space-y-2.5 p-5">
            {history.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-3">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedHistoryIds.includes(item.id)}
                    onChange={(e) => {
                      setSelectedHistoryIds((prev) => {
                        if (e.target.checked) return [...prev, item.id];
                        return prev.filter((id) => id !== item.id);
                      });
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-[#94a3b8] text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0F172A]">{item.title}</p>
                      <span className="rounded-full bg-[#E6F4F1] px-2 py-0.5 text-[10px] font-semibold text-[#0F766E]">
                        {item.recipientCount} recipients
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#475569]">{item.body}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[#64748B]">
                      <span>{formatDate(item.createdAt)}</span>
                      <span>•</span>
                      <span>{item.unreadRecipients} unread</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          />

          <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] border-t border-white/60 bg-white p-4 pb-6 shadow-[0_-18px_42px_rgba(15,23,42,0.26)] sm:max-w-xl sm:left-1/2 sm:-translate-x-1/2">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#CBD5E1]" />

            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0F172A]">Send Notification</h3>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={onSend} className="space-y-3.5">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#64748B]">Recipient Type</span>
                <select
                  value={recipientType}
                  onChange={(e) => {
                    const next = e.target.value as RecipientType;
                    setRecipientType(next);
                    if (next !== 'CLASS') setClassId('');
                    if (next !== 'STUDENT') setStudentId('');
                  }}
                  className="h-11 w-full rounded-2xl border border-[#DCE3EA] bg-[#F8FAFC] px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15"
                >
                  <option value="ALL_ASSIGNED">All assigned students</option>
                  <option value="CLASS">Selected class</option>
                  <option value="STUDENT">Single student</option>
                </select>
              </label>

              {recipientType === 'CLASS' ? (
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[#64748B]">Class</span>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    required
                    className="h-11 w-full rounded-2xl border border-[#DCE3EA] bg-[#F8FAFC] px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15"
                  >
                    <option value="">Select class</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} - {item.section}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {recipientType === 'STUDENT' ? (
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[#64748B]">Student</span>
                  <select
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                    className="h-11 w-full rounded-2xl border border-[#DCE3EA] bg-[#F8FAFC] px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15"
                  >
                    <option value="">Select student</option>
                    {(classId ? classStudents : students).map((item) => (
                      <option key={item.id} value={item.id}>{item.fullName} ({item.admissionNo})</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#64748B]">Notification Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="h-11 w-full rounded-2xl border border-[#DCE3EA] bg-[#F8FAFC] px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15"
                  placeholder="e.g. Class timing update"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#64748B]">Message</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  className="w-full rounded-2xl border border-[#DCE3EA] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15"
                  placeholder="Write notification message"
                />
              </label>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#64748B]">Priority</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['NORMAL', 'IMPORTANT', 'URGENT'] as Priority[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPriority(value)}
                      className={`h-10 rounded-xl border text-xs font-semibold transition ${priority === value ? PRIORITY_TONE[value] : 'border-[#DCE3EA] bg-white text-[#475569]'}`}
                    >
                      {value === 'NORMAL' ? 'Normal' : value === 'IMPORTANT' ? 'Important' : 'Urgent'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#084750] text-sm font-semibold text-white shadow-[0_12px_22px_rgba(8,71,80,0.28)] transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {saving ? 'Sending...' : 'Send Notification'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

