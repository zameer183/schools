'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Send, ChevronLeft, MessageSquarePlus, X, Inbox, ArrowUpRight, LayoutGrid, CheckCheck } from 'lucide-react';

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
  recipientNames?: string[];
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
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172_800_000) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) +
    ' · ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const AVATAR_COLORS = [
  ['bg-[#E0EBEC] text-[#1F5A5C]', 'ring-[#C7DFE0]'],
  ['bg-[#FEF3C7] text-[#92400E]', 'ring-[#FDE68A]'],
  ['bg-[#DBEAFE] text-[#1E40AF]', 'ring-[#BFDBFE]'],
  ['bg-[#F3E8FF] text-[#6B21A8]', 'ring-[#E9D5FF]'],
  ['bg-[#DCFCE7] text-[#14532D]', 'ring-[#BBF7D0]'],
];

function avatarColor(name: string) {
  const idx = (name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
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
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const filtered = useMemo(() => {
    return localMessages.filter((msg) => {
      const catMatch =
        category === 'all' ||
        (category === 'received' && msg.direction === 'received') ||
        (category === 'sent' && msg.direction === 'sent');
      const q = search.toLowerCase();
      const searchMatch =
        !q ||
        msg.senderName.toLowerCase().includes(q) ||
        msg.subject.toLowerCase().includes(q) ||
        msg.body.toLowerCase().includes(q) ||
        (msg.recipientNames ?? []).some((n) => n.toLowerCase().includes(q));
      return catMatch && searchMatch;
    });
  }, [localMessages, category, search]);

  const activeMessage = filtered.find((m) => m.id === activeId) ?? null;
  const unreadCount = localMessages.filter((m) => m.direction === 'received' && !m.isRead).length;

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
          .map((r) => r.fullName);
        const newMsg: SerializedMessage = {
          id: data.id,
          subject: composeSubject.trim(),
          body: composeBody.trim(),
          senderName: 'You',
          senderRole: 'TEACHER',
          createdAt: data.createdAt ?? new Date().toISOString(),
          isRead: true,
          direction: 'sent',
          recipientNames
        };
        setLocalMessages((prev) => [newMsg, ...prev]);
        setActiveId(newMsg.id);
        setShowCompose(false);
        setComposeSubject('');
        setComposeBody('');
        setSelectedRecipients(new Set());
        setMobileView('detail');
        showToast(`Sent to ${recipientNames.map((n) => n.split(' ')[0]).join(', ')}`, true);
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
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const selectMsg = (id: string) => {
    setActiveId(id);
    setShowCompose(false);
    setMobileView('detail');
  };

  const openCompose = () => {
    setShowCompose(true);
    setMobileView('detail');
  };

  const categories: { key: CategoryFilter; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { key: 'received', label: 'Received', icon: <Inbox className="h-3.5 w-3.5" /> },
    { key: 'sent', label: 'Sent', icon: <ArrowUpRight className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* ── Top action bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-xl bg-white border border-[#E5E7EB] p-1 shadow-sm">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setCategory(cat.key); setActiveId(null); }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                category === cat.key
                  ? 'bg-[#1F5A5C] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-[#374151] hover:bg-[#F3F4F6]'
              }`}
            >
              {cat.icon}
              {cat.label}
              <span className={`rounded-full px-1.5 py-px text-[10px] font-bold leading-none ${
                category === cat.key ? 'bg-white/20 text-white' : 'bg-[#F3F4F6] text-[#9CA3AF]'
              }`}>
                {counts[cat.key]}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={openCompose}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1F5A5C] to-[#155052] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(31,90,92,0.3)] hover:shadow-[0_4px_20px_rgba(31,90,92,0.45)] active:scale-[0.98] transition-all"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span className="hidden sm:inline">New Message</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* ── Main 3-column grid ── */}
      <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1.4fr)]">

        {/* ── Col 1: Sidebar ── */}
        <div className={`space-y-3 ${mobileView === 'detail' ? 'hidden lg:block' : ''}`}>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] px-4 py-2.5">
              <div className="h-2 w-2 rounded-full bg-[#3B82F6] animate-pulse" />
              <p className="text-xs font-semibold text-[#1D4ED8]">{unreadCount} unread {unreadCount === 1 ? 'message' : 'messages'}</p>
            </div>
          )}

          {/* Student avatars */}
          {recipients.length > 0 && (
            <div className="rounded-2xl bg-white border border-[#E5E7EB] p-4 shadow-sm">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Your Students</p>
              <div className="flex flex-wrap gap-2.5">
                {recipients.slice(0, 10).map((r) => {
                  const [bg] = avatarColor(r.fullName);
                  return (
                    <button
                      key={r.userId}
                      onClick={() => {
                        setComposeSubject('');
                        setComposeBody('');
                        setSelectedRecipients(new Set([r.userId]));
                        openCompose();
                      }}
                      title={`Message ${r.fullName}`}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white border border-[#E5E7EB] group-hover:ring-[#1F5A5C]/30 transition-all ${bg}`}>
                        {initials(r.fullName)}
                      </div>
                      <span className="text-[9px] text-[#9CA3AF] group-hover:text-[#374151] transition-colors max-w-[40px] truncate text-center leading-none">
                        {r.fullName.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Col 2: Message List ── */}
        <div className={`rounded-2xl bg-white border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col min-h-[520px] ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'}`}>

          {/* Search */}
          <div className="p-3 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-2 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-2">
              <Search className="h-3.5 w-3.5 text-[#9CA3AF] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages..."
                className="bg-transparent text-sm text-[#1F2937] placeholder:text-[#9CA3AF] outline-none flex-1 min-w-0"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-[#9CA3AF] hover:text-[#6B7280] shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="h-14 w-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-4">
                  <Inbox className="h-6 w-6 text-[#D1D5DB]" />
                </div>
                <p className="text-sm font-semibold text-[#374151]">
                  {search ? 'No results found' : 'No messages yet'}
                </p>
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  {search ? 'Try different keywords.' : 'Send your first message to a student.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F3F4F6]">
                {filtered.map((msg) => {
                  const isActive = activeId === msg.id;
                  const isUnread = !msg.isRead && msg.direction === 'received';
                  const displayName = msg.direction === 'sent'
                    ? (msg.recipientNames && msg.recipientNames.length > 0
                        ? msg.recipientNames.map((n) => n.split(' ')[0]).join(', ')
                        : 'Student')
                    : msg.senderName;
                  const [avatarBg] = avatarColor(displayName);
                  return (
                    <button
                      key={msg.id}
                      onClick={() => selectMsg(msg.id)}
                      className={`w-full text-left flex gap-3 px-4 py-3.5 transition-colors relative ${
                        isActive ? 'bg-[#F0F7F7]' : 'hover:bg-[#FAFAFA]'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#1F5A5C]" />
                      )}
                      {isUnread && !isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#3B82F6]" />
                      )}
                      <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${avatarBg}`}>
                        {initials(displayName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className={`text-sm truncate ${isUnread ? 'font-bold text-[#111827]' : 'font-medium text-[#374151]'}`}>
                            {msg.direction === 'sent' ? <span className="text-[#9CA3AF] text-[11px] font-normal">To: </span> : null}
                            {displayName}
                          </p>
                          <span className="text-[10px] text-[#9CA3AF] shrink-0 tabular-nums">{timeAgo(msg.createdAt)}</span>
                        </div>
                        <p className={`text-xs truncate mb-0.5 ${isUnread ? 'font-semibold text-[#1F2937]' : 'text-[#374151]'}`}>
                          {msg.subject}
                        </p>
                        <p className="text-[11px] text-[#9CA3AF] truncate leading-relaxed">{msg.body}</p>
                      </div>
                      {isUnread && (
                        <div className="shrink-0 h-2 w-2 rounded-full bg-[#3B82F6] mt-2 self-start" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Col 3: Detail / Compose ── */}
        <div className={`rounded-2xl bg-white border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col min-h-[520px] ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>

          {/* Back button on mobile */}
          {mobileView === 'detail' && (
            <button
              onClick={() => setMobileView('list')}
              className="lg:hidden flex items-center gap-1.5 px-4 pt-4 pb-2 text-xs font-semibold text-[#1F5A5C]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to messages
            </button>
          )}

          {showCompose ? (
            /* ── Compose panel ── */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#F3F4F6] px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#1F5A5C] to-[#155052] flex items-center justify-center">
                    <MessageSquarePlus className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1F2937]">New Message</p>
                    <p className="text-[10px] text-[#9CA3AF]">to your students</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCompose(false)}
                  className="h-7 w-7 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:bg-[#E5E7EB] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5">Subject</label>
                  <input
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="e.g. Assignment Reminder"
                    className="h-10 w-full rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] px-3 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] outline-none focus:border-[#1F5A5C] focus:ring-2 focus:ring-[#1F5A5C]/10 transition-colors"
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5">Message</label>
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    rows={4}
                    placeholder="Write your message..."
                    className="w-full rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] outline-none focus:border-[#1F5A5C] focus:ring-2 focus:ring-[#1F5A5C]/10 resize-none transition-colors"
                  />
                </div>

                {/* Recipients */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                      Recipients
                    </label>
                    {selectedRecipients.size > 0 && (
                      <span className="text-[10px] font-semibold text-[#1F5A5C] bg-[#E0EBEC] px-2 py-0.5 rounded-full">
                        {selectedRecipients.size} selected
                      </span>
                    )}
                  </div>
                  {recipients.length === 0 ? (
                    <div className="rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] px-4 py-6 text-center">
                      <p className="text-sm text-[#9CA3AF]">No students in your assigned classes.</p>
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] p-2">
                      {recipients.map((r) => {
                        const checked = selectedRecipients.has(r.userId);
                        const [avatarBg] = avatarColor(r.fullName);
                        return (
                          <label
                            key={r.userId}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                              checked ? 'bg-[#E0EBEC]' : 'hover:bg-white'
                            }`}
                          >
                            <div className={`h-2 w-2 rounded-sm border-2 flex items-center justify-center shrink-0 transition-colors ${
                              checked ? 'bg-[#1F5A5C] border-[#1F5A5C]' : 'border-[#D1D5DB] bg-white'
                            }`}>
                              {checked && <CheckCheck className="h-1.5 w-1.5 text-white" strokeWidth={3} />}
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRecipient(r.userId)}
                              className="sr-only"
                            />
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${avatarBg}`}>
                              {initials(r.fullName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[#1F2937] truncate">{r.fullName}</p>
                              <p className="text-[10px] text-[#9CA3AF] truncate">{r.className}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Send button */}
              <div className="border-t border-[#F3F4F6] p-4">
                <button
                  onClick={() => void handleSend()}
                  disabled={!composeSubject.trim() || !composeBody.trim() || selectedRecipients.size === 0 || composeSending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#1F5A5C] to-[#155052] py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(31,90,92,0.25)] hover:shadow-[0_4px_20px_rgba(31,90,92,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.99] transition-all"
                >
                  <Send className="h-4 w-4" />
                  {composeSending
                    ? 'Sending...'
                    : selectedRecipients.size > 0
                      ? `Send to ${selectedRecipients.size} student${selectedRecipients.size > 1 ? 's' : ''}`
                      : 'Send Message'}
                </button>
              </div>
            </div>

          ) : activeMessage ? (
            /* ── Message detail ── */
            <div className="flex flex-col h-full overflow-hidden">
              {/* Detail header */}
              <div className="border-b border-[#F3F4F6] px-5 py-4">
                <div className="flex items-start gap-3">
                  {(() => {
                    const displayName = activeMessage.direction === 'sent'
                      ? (activeMessage.recipientNames && activeMessage.recipientNames.length > 0
                          ? activeMessage.recipientNames.join(', ')
                          : 'Student')
                      : activeMessage.senderName;
                    const [avatarBg] = avatarColor(displayName);
                    return (
                      <>
                        <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${avatarBg}`}>
                          {initials(displayName.split(',')[0]?.trim() ?? displayName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-[#1F2937]">
                              {activeMessage.direction === 'sent' ? (
                                <><span className="font-normal text-[#9CA3AF] text-xs">To: </span>{displayName}</>
                              ) : displayName}
                            </p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              activeMessage.direction === 'sent'
                                ? 'bg-[#E0EBEC] text-[#1F5A5C]'
                                : 'bg-[#DBEAFE] text-[#1D4ED8]'
                            }`}>
                              {activeMessage.direction === 'sent' ? 'Sent' : 'Received'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#9CA3AF] mt-0.5">{formatFullDate(activeMessage.createdAt)}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Subject + body */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <h2 className="text-base font-bold text-[#1F2937] mb-4 leading-snug">{activeMessage.subject}</h2>
                <div className="rounded-2xl bg-[#F9FAFB] border border-[#F3F4F6] px-5 py-4">
                  <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">{activeMessage.body}</p>
                </div>
              </div>

              {/* Reply / compose */}
              <div className="border-t border-[#F3F4F6] p-4">
                <button
                  onClick={openCompose}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#F3F4F6] hover:border-[#D1D5DB] transition-colors"
                >
                  <MessageSquarePlus className="h-4 w-4 text-[#6B7280]" />
                  Compose New Message
                </button>
              </div>
            </div>

          ) : (
            /* ── Empty state ── */
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-[#F0F7F7] to-[#E0EBEC] flex items-center justify-center mb-5 shadow-inner">
                <svg className="h-9 w-9 text-[#1F5A5C]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <p className="text-sm font-bold text-[#1F2937]">Select a conversation</p>
              <p className="mt-1.5 text-xs text-[#9CA3AF] max-w-[180px] leading-relaxed">
                Choose a message from the list or start a new one.
              </p>
              <button
                onClick={openCompose}
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#1F5A5C] to-[#155052] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(31,90,92,0.25)] hover:shadow-[0_4px_20px_rgba(31,90,92,0.4)] active:scale-[0.98] transition-all"
              >
                <MessageSquarePlus className="h-4 w-4" />
                New Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur-sm border transition-all ${
          toast.ok
            ? 'bg-[#D1FAE5]/95 text-[#065F46] border-[#A7F3D0]'
            : 'bg-[#FEE2E2]/95 text-[#991B1B] border-[#FECACA]'
        }`}>
          {toast.text}
          <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100 transition-opacity">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
