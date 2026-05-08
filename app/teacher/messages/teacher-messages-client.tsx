'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Send, ChevronLeft, MessageSquarePlus, X } from 'lucide-react';

type MessageDirection = 'received' | 'sent';
type CategoryFilter = 'all' | 'received' | 'sent';

export type SerializedMessage = {
  id: string;
  subject: string;
  body: string;
  senderName: string;
  senderRole: string;
  createdAt: string;
  isRead: boolean;
  direction: MessageDirection;
};

export type RecipientOption = {
  userId: string;
  fullName: string;
  className: string;
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function timeAgo(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const diff = Date.now() - date.getTime();
  if (diff < 86_400_000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172_800_000) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface TeacherMessagesClientProps {
  messages: SerializedMessage[];
  recipients: RecipientOption[];
}

export function TeacherMessagesClient({ messages, recipients }: TeacherMessagesClientProps) {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeSending, setComposeSending] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [localMessages, setLocalMessages] = useState<SerializedMessage[]>(messages);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const filtered = useMemo(() => {
    return localMessages.filter((msg) => {
      const catMatch =
        category === 'all' ||
        (category === 'received' && msg.direction === 'received') ||
        (category === 'sent' && msg.direction === 'sent');
      const searchMatch =
        !search ||
        msg.senderName.toLowerCase().includes(search.toLowerCase()) ||
        msg.subject.toLowerCase().includes(search.toLowerCase()) ||
        msg.body.toLowerCase().includes(search.toLowerCase());
      return catMatch && searchMatch;
    });
  }, [localMessages, category, search]);

  const activeMessage = filtered.find((m) => m.id === activeId) ?? null;

  useEffect(() => {
    if (!activeId && filtered[0]) setActiveId(filtered[0].id);
  }, [activeId, filtered]);

  const showToast = (text: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const handleSend = async () => {
    if (!composeSubject.trim() || !composeBody.trim() || selectedRecipients.size === 0 || composeSending) return;
    setComposeSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: composeSubject.trim(),
          body: composeBody.trim(),
          recipientIds: Array.from(selectedRecipients)
        })
      });
      if (res.ok) {
        const data = await res.json() as { id: string; createdAt: string };
        const recipientNames = recipients
          .filter((r) => selectedRecipients.has(r.userId))
          .map((r) => r.fullName.split(' ')[0])
          .join(', ');
        const newMsg: SerializedMessage = {
          id: data.id,
          subject: composeSubject.trim(),
          body: composeBody.trim(),
          senderName: 'You',
          senderRole: 'TEACHER',
          createdAt: data.createdAt ?? new Date().toISOString(),
          isRead: true,
          direction: 'sent'
        };
        setLocalMessages((prev) => [newMsg, ...prev]);
        setActiveId(newMsg.id);
        setShowCompose(false);
        setComposeSubject('');
        setComposeBody('');
        setSelectedRecipients(new Set());
        showToast(`Sent to ${recipientNames}`, true);
      } else {
        showToast('Failed to send. Try again.', false);
      }
    } catch {
      showToast('Network error. Try again.', false);
    } finally {
      setComposeSending(false);
    }
  };

  const counts = useMemo(() => ({
    all: localMessages.length,
    received: localMessages.filter((m) => m.direction === 'received').length,
    sent: localMessages.filter((m) => m.direction === 'sent').length
  }), [localMessages]);

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'All Messages' },
    { key: 'received', label: 'Received' },
    { key: 'sent', label: 'Sent' }
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_minmax(0,1.2fr)]">

      {/* ── Col 1: Sidebar ── */}
      <div className="space-y-3">
        <div className="rounded-2xl bg-white border border-[#E5E7EB] p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#6B7280]">Categories</h3>
            <button
              onClick={() => setShowCompose(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#1F5A5C] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#184c4e] transition-colors"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              New
            </button>
          </div>
          <div className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => { setCategory(cat.key); setActiveId(null); }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  category === cat.key
                    ? 'bg-[#E0EBEC] font-semibold text-[#1F5A5C]'
                    : 'text-[#374151] hover:bg-[#F3F4F6]'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  category === cat.key ? 'bg-[#1F5A5C] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'
                }`}>
                  {counts[cat.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {recipients.length > 0 && (
          <div className="rounded-2xl bg-white border border-[#E5E7EB] p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#6B7280]">Your Students</p>
            <div className="flex flex-wrap gap-2">
              {recipients.slice(0, 8).map((r) => (
                <div key={r.userId} className="flex flex-col items-center gap-1">
                  <div className="h-10 w-10 rounded-full bg-[#E0EBEC] flex items-center justify-center text-xs font-bold text-[#1F5A5C] ring-2 ring-white border border-[#D1D5DB]">
                    {initials(r.fullName)}
                  </div>
                  <span className="text-[9px] text-[#6B7280] max-w-[40px] truncate text-center">{r.fullName.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Col 2: Message List ── */}
      <div className="rounded-2xl bg-white border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 py-2">
            <Search className="h-4 w-4 text-[#9CA3AF] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="bg-transparent text-sm text-[#1F2937] placeholder:text-[#9CA3AF] outline-none flex-1"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[#9CA3AF] hover:text-[#6B7280]">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F3F4F6]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="h-12 w-12 rounded-full bg-[#F3F4F6] flex items-center justify-center mb-3">
                <Search className="h-5 w-5 text-[#D1D5DB]" />
              </div>
              <p className="text-sm font-medium text-[#374151]">No messages</p>
              <p className="mt-1 text-xs text-[#9CA3AF]">
                {search ? 'Try a different search term.' : 'Your inbox is empty.'}
              </p>
            </div>
          ) : (
            filtered.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setActiveId(msg.id)}
                className={`w-full text-left flex gap-3 px-4 py-3.5 transition-colors ${
                  activeId === msg.id
                    ? 'bg-[#E0EBEC]'
                    : 'hover:bg-[#F9FAFB]'
                } ${!msg.isRead && msg.direction === 'received' ? 'border-l-[3px] border-l-[#1F5A5C]' : ''}`}
              >
                <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                  msg.direction === 'sent' ? 'bg-[#E0EBEC] text-[#1F5A5C]' : 'bg-[#F3F4F6] text-[#374151]'
                }`}>
                  {initials(msg.senderName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={`text-sm truncate ${!msg.isRead && msg.direction === 'received' ? 'font-bold text-[#111827]' : 'font-medium text-[#374151]'}`}>
                      {msg.direction === 'sent' ? `To: ${recipients.find(r => true)?.fullName.split(' ')[0] ?? 'Student'}` : msg.senderName}
                    </p>
                    <span className="text-[10px] text-[#9CA3AF] shrink-0">{timeAgo(msg.createdAt)}</span>
                  </div>
                  <p className="text-xs font-medium text-[#374151] truncate">{msg.subject}</p>
                  <p className="text-xs text-[#9CA3AF] truncate">{msg.body}</p>
                </div>
                {!msg.isRead && msg.direction === 'received' && (
                  <div className="shrink-0 h-2 w-2 rounded-full bg-[#1F5A5C] mt-2" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Col 3: Detail / Compose ── */}
      <div className="rounded-2xl bg-white border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
        {showCompose ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
              <h3 className="text-sm font-bold text-[#1F2937]">New Message</h3>
              <button
                onClick={() => setShowCompose(false)}
                className="h-7 w-7 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:bg-[#E5E7EB]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-1.5">Subject</label>
                <input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="e.g. Assignment Reminder"
                  className="h-10 w-full rounded-xl bg-[#F3F4F6] border-none px-3 text-sm text-[#1F2937] outline-none focus:ring-2 focus:ring-[#1F5A5C]/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-1.5">Message</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={5}
                  placeholder="Write your message here..."
                  className="w-full rounded-xl bg-[#F3F4F6] border-none px-3 py-2.5 text-sm text-[#1F2937] outline-none focus:ring-2 focus:ring-[#1F5A5C]/20 resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-1.5">
                  Recipients ({selectedRecipients.size} selected)
                </label>
                {recipients.length === 0 ? (
                  <p className="text-sm text-[#9CA3AF]">No students in your assigned classes.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {recipients.map((r) => (
                      <label
                        key={r.userId}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                          selectedRecipients.has(r.userId) ? 'bg-[#E0EBEC]' : 'bg-[#F9FAFB] hover:bg-[#F3F4F6]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.has(r.userId)}
                          onChange={() => toggleRecipient(r.userId)}
                          className="accent-[#1F5A5C] h-3.5 w-3.5"
                        />
                        <div className="h-7 w-7 rounded-full bg-[#E0EBEC] flex items-center justify-center text-xs font-bold text-[#1F5A5C]">
                          {initials(r.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1F2937] truncate">{r.fullName}</p>
                          <p className="text-[10px] text-[#9CA3AF] truncate">{r.className}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-[#E5E7EB] p-4">
              <button
                onClick={() => void handleSend()}
                disabled={!composeSubject.trim() || !composeBody.trim() || selectedRecipients.size === 0 || composeSending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F5A5C] py-2.5 text-sm font-bold text-white hover:bg-[#184c4e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
                {composeSending ? 'Sending...' : `Send${selectedRecipients.size > 0 ? ` to ${selectedRecipients.size}` : ''}`}
              </button>
            </div>
          </div>
        ) : activeMessage ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 border-b border-[#E5E7EB] px-5 py-4">
              <button
                onClick={() => setActiveId(null)}
                className="h-8 w-8 rounded-xl border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] lg:hidden"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                activeMessage.direction === 'sent' ? 'bg-[#E0EBEC] text-[#1F5A5C]' : 'bg-[#F3F4F6] text-[#374151]'
              }`}>
                {initials(activeMessage.senderName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#1F2937] truncate">{activeMessage.senderName}</p>
                <p className="text-[10px] text-[#9CA3AF]">{timeAgo(activeMessage.createdAt)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeMessage.direction === 'sent' ? 'bg-[#E0EBEC] text-[#1F5A5C]' : 'bg-[#DBEAFE] text-[#1D4ED8]'
              }`}>
                {activeMessage.direction === 'sent' ? 'Sent' : 'Received'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="mb-4 pb-4 border-b border-[#E5E7EB]">
                <p className="text-base font-bold text-[#1F2937]">{activeMessage.subject}</p>
                <p className="mt-1 text-[11px] text-[#9CA3AF]">
                  {activeMessage.direction === 'sent' ? 'Sent' : `From: ${activeMessage.senderName}`} · {timeAgo(activeMessage.createdAt)}
                </p>
              </div>
              <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">{activeMessage.body}</p>
            </div>

            <div className="border-t border-[#E5E7EB] p-4">
              <button
                onClick={() => setShowCompose(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#F3F4F6] transition-colors"
              >
                <MessageSquarePlus className="h-4 w-4 text-[#6B7280]" />
                Compose New Message
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="h-16 w-16 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#374151]">Select a message to read</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">Choose from the list or compose a new one.</p>
            <button
              onClick={() => setShowCompose(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#1F5A5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#184c4e] transition-colors"
            >
              <MessageSquarePlus className="h-4 w-4" />
              New Message
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg ${
          toast.ok ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]'
        }`}>
          {toast.text}
          <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
