'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, MessageSquarePlus, Search, Send, SlidersHorizontal, Trash2 } from 'lucide-react';

type SenderRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
type CategoryKey = 'all' | 'academic' | 'finance';

type ChatMessage = {
  id: string;
  body: string;
  subject: string;
  createdAt: string;
  direction: 'in' | 'out';
  pending?: boolean;
};

type Conversation = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: SenderRole;
  isOnline: boolean;
  unreadCount: number;
  latestAt: string;
  latestPreview: string;
  latestSubject: string;
  category: Exclude<CategoryKey, 'all'>;
  messages: ChatMessage[];
};

export type StudentInboxItem = {
  id: string;
  isRead: boolean;
  readAt: string | null;
  message: {
    id: string;
    subject: string;
    body: string;
    createdAt: string;
    sender: {
      id: string;
      fullName: string;
      role: SenderRole;
    };
  };
};

export type StudentOutgoingMap = Record<string, ChatMessage[]>;

export type AvailableTeacher = { id: string; fullName: string };

type InboxApiRow = {
  id: string;
  isRead: boolean;
  readAt: string | null;
  message: {
    id: string;
    subject: string;
    body: string;
    createdAt: string;
    sender: {
      id: string;
      fullName: string;
      role: SenderRole;
    };
  };
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 86_400_000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172_800_000) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function categorize(subject: string, body: string, role: SenderRole): Exclude<CategoryKey, 'all'> {
  if (role === 'TEACHER') return 'academic';
  const haystack = `${subject} ${body}`.toLowerCase();
  if (haystack.includes('fee') || haystack.includes('finance') || haystack.includes('payment') || haystack.includes('due')) {
    return 'finance';
  }
  return 'academic';
}

function buildConversations(inbox: StudentInboxItem[], outgoing: Record<string, ChatMessage[]>, locallyRead: Set<string>) {
  const grouped = new Map<string, Conversation>();

  for (const row of inbox) {
    const sender = row.message.sender;
    const category = categorize(row.message.subject, row.message.body, sender.role);
    const baseMessage: ChatMessage = {
      id: row.message.id,
      body: row.message.body,
      subject: row.message.subject,
      createdAt: row.message.createdAt,
      direction: 'in'
    };

    const existing = grouped.get(sender.id);
    if (!existing) {
      grouped.set(sender.id, {
        id: sender.id,
        senderId: sender.id,
        senderName: sender.fullName,
        senderRole: sender.role,
        isOnline: false, // computed post-mount to avoid hydration mismatch
        unreadCount: row.isRead || locallyRead.has(sender.id) ? 0 : 1,
        latestAt: row.message.createdAt,
        latestPreview: row.message.body,
        latestSubject: row.message.subject,
        category,
        messages: [baseMessage]
      });
      continue;
    }

    existing.messages.push(baseMessage);
    if (!(row.isRead || locallyRead.has(sender.id))) {
      existing.unreadCount += 1;
    }
    if (new Date(row.message.createdAt).getTime() > new Date(existing.latestAt).getTime()) {
      existing.latestAt = row.message.createdAt;
      existing.latestPreview = row.message.body;
      existing.latestSubject = row.message.subject;
      existing.category = category;
    }
  }

  for (const [senderId, messages] of Object.entries(outgoing)) {
    const target = grouped.get(senderId);
    if (!target) continue;
    target.messages.push(...messages);
    const latestOutgoing = messages.reduce((latest, item) => {
      if (!latest) return item;
      return new Date(item.createdAt).getTime() > new Date(latest.createdAt).getTime() ? item : latest;
    }, null as ChatMessage | null);
    if (latestOutgoing && new Date(latestOutgoing.createdAt).getTime() > new Date(target.latestAt).getTime()) {
      target.latestAt = latestOutgoing.createdAt;
      target.latestPreview = latestOutgoing.body;
      target.latestSubject = latestOutgoing.subject;
    }
  }

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      messages: item.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }))
    .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

export function StudentMessagesChatClient({
  initialInbox,
  initialOutgoing = {},
  availableTeachers = []
}: {
  initialInbox: StudentInboxItem[];
  initialOutgoing?: StudentOutgoingMap;
  availableTeachers?: AvailableTeacher[];
}) {
  const [mounted, setMounted] = useState(false);
  const [liveInbox, setLiveInbox] = useState<StudentInboxItem[]>(initialInbox);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState<CategoryKey>('all');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [locallyRead, setLocallyRead] = useState<Set<string>>(new Set());
  const [localOutgoing, setLocalOutgoing] = useState<StudentOutgoingMap>(initialOutgoing);
  const [showCompose, setShowCompose] = useState(false);
  const [composeTeacherId, setComposeTeacherId] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isComposeSending, setIsComposeSending] = useState(false);

  const conversations = useMemo(
    () => buildConversations(liveInbox, localOutgoing, locallyRead),
    [liveInbox, localOutgoing, locallyRead]
  );

  const filteredConversations = useMemo(() => {
    return conversations.filter((chat) => {
      const categoryMatch = category === 'all' || chat.category === category;
      const searchMatch =
        !search ||
        chat.senderName.toLowerCase().includes(search.toLowerCase()) ||
        chat.latestPreview.toLowerCase().includes(search.toLowerCase()) ||
        chat.latestSubject.toLowerCase().includes(search.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [conversations, category, search]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setLiveInbox(initialInbox); }, [initialInbox]);

  useEffect(() => {
    let cancelled = false;
    const syncInbox = async () => {
      try {
        const response = await fetch('/api/messages?limit=50', { cache: 'no-store' });
        if (!response.ok) return;
        const rows = (await response.json()) as InboxApiRow[];
        if (cancelled) return;
        const merged = rows.map<StudentInboxItem>((item) => ({
          id: item.id,
          isRead: item.isRead,
          readAt: item.readAt,
          message: {
            id: item.message.id,
            subject: item.message.subject,
            body: item.message.body,
            createdAt: item.message.createdAt,
            sender: item.message.sender
          }
        }));
        setLiveInbox(merged);
      } catch {
        // ignore transient polling errors
      }
    };

    const timer = window.setInterval(() => {
      void syncInbox();
    }, 5000);
    void syncInbox();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!activeId && filteredConversations[0]?.id) {
      setActiveId(filteredConversations[0].id);
    }
  }, [activeId, filteredConversations]);

  useEffect(() => {
    setIsTyping(draft.trim().length > 0);
  }, [draft]);

  const activeConversation = filteredConversations.find((item) => item.id === activeId) ?? null;

  useEffect(() => {
    if (!activeConversation) return;
    if (activeConversation.unreadCount === 0) return;
    setLocallyRead((prev) => new Set(prev).add(activeConversation.id));
  }, [activeConversation]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages.length]);

  const categoryCounts = useMemo(() => {
    const academic = conversations.filter((item) => item.category === 'academic').length;
    const finance = conversations.filter((item) => item.category === 'finance').length;
    return {
      all: conversations.length,
      academic,
      finance
    };
  }, [conversations]);

  // After all hooks, render a stable loading state before mounting full UI.
  if (!mounted) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e0eff0] border-t-[#004649]" />
      </div>
    );
  }

  const handleComposeSend = async () => {
    if (!composeTeacherId || composeBody.trim().length < 2 || isComposeSending) return;
    setIsComposeSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: composeSubject.trim() || 'New Message',
          body: composeBody.trim(),
          recipientIds: [composeTeacherId]
        })
      });
      if (response.ok) {
        const msg = await response.json() as { id?: string; subject?: string; body?: string; createdAt?: string };
        setLocalOutgoing((prev) => ({
          ...prev,
          [composeTeacherId]: [
            ...(prev[composeTeacherId] ?? []),
            {
              id: msg.id ?? `temp-${Date.now()}`,
              body: composeBody.trim(),
              subject: composeSubject.trim() || 'New Message',
              createdAt: msg.createdAt ?? new Date().toISOString(),
              direction: 'out' as const,
              pending: false
            }
          ]
        }));
        setShowCompose(false);
        setComposeSubject('');
        setComposeBody('');
        setComposeTeacherId('');
      }
    } finally {
      setIsComposeSending(false);
    }
  };

  const handleSend = async () => {
    if (!activeConversation || draft.trim().length < 2 || isSending) return;

    const text = draft.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      body: text,
      subject: `Re: ${(activeConversation.latestSubject || 'Message').replace(/^(re:\s*)+/i, '')}`,
      createdAt: new Date().toISOString(),
      direction: 'out',
      pending: true
    };

    setLocalOutgoing((prev) => ({
      ...prev,
      [activeConversation.senderId]: [...(prev[activeConversation.senderId] ?? []), optimisticMessage]
    }));
    setDraft('');
    setIsSending(true);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: optimisticMessage.subject,
          body: text,
          recipientIds: [activeConversation.senderId]
        })
      });

      if (!response.ok) {
        setLocalOutgoing((prev) => ({
          ...prev,
          [activeConversation.senderId]: (prev[activeConversation.senderId] ?? []).filter((item) => item.id !== tempId)
        }));
        return;
      }

      const created = (await response.json()) as { id?: string; createdAt?: string };
      setLocalOutgoing((prev) => ({
        ...prev,
        [activeConversation.senderId]: (prev[activeConversation.senderId] ?? []).map((item) =>
          item.id === tempId
            ? { ...item, id: created.id ?? item.id, createdAt: created.createdAt ?? item.createdAt, pending: false }
            : item
        )
      }));
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string, direction: 'in' | 'out') => {
    if (!messageId || messageId.startsWith('temp-')) return;
    if (!activeConversation) return;
    const confirmed = window.confirm('Delete this message?');
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/messages?id=${messageId}`, { method: 'DELETE' });
      if (!response.ok) return;
      if (direction === 'out') {
        setLocalOutgoing((prev) => ({
          ...prev,
          [activeConversation.senderId]: (prev[activeConversation.senderId] ?? []).filter((item) => item.id !== messageId)
        }));
      } else {
        setLiveInbox((prev) => prev.filter((item) => item.message.id !== messageId));
      }
    } catch {
      // no-op
    }
  };

  const categories = [
    { key: 'all' as const, label: 'All Messages', count: categoryCounts.all },
    { key: 'academic' as const, label: 'Academic', count: categoryCounts.academic },
    { key: 'finance' as const, label: 'Finance', count: categoryCounts.finance }
  ];

  const leftCategoriesPanel = (
    <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold font-headline text-[#1a2b3d]">Categories</h3>
        <button
          onClick={() => setShowCompose(true)}
          className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] shadow-[0_8px_20px_rgba(0,70,73,0.12)] active:scale-[0.98] transition-all px-2.5 py-1.5 text-xs font-semibold text-white"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          New
        </button>
      </div>
      <div className="space-y-1.5">
        {categories.map((item) => (
          <button
            key={item.key}
            onClick={() => setCategory(item.key)}
            className={`flex w-full items-center justify-between rounded-xl border-l-4 px-3 py-2 text-left text-sm transition ${
              category === item.key
                ? 'border-l-[#004649] bg-[#e9f5f4] text-[#004649]'
                : 'border-l-transparent bg-[#f7fafb] text-[#5b6b7c] hover:bg-[#edf4f7]'
            }`}
          >
            <span className="font-medium">{item.label}</span>
            <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-xs font-bold text-[#1d4ed8]">{item.count}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const middleChatListPanel = (
    <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-4">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c8b99]" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search chats..."
          className="h-11 w-full rounded-full bg-[#edeeef] border-none pl-10 pr-4 text-sm text-[#1a2b3d] outline-none focus:ring-2 focus:ring-[#004649]/20"
        />
      </div>

      <div className="max-h-[62vh] space-y-1 overflow-auto pr-1">
        {filteredConversations.map((chat) => (
          <button
            key={chat.id}
            onClick={() => {
              setActiveId(chat.id);
              setShowMobileFilters(false);
            }}
            className={`w-full rounded-xl border p-3 text-left transition ${
              activeId === chat.id
                ? 'border-[#004649] bg-[#e9f5f4]'
                : 'border-[#e5edf2] bg-white hover:bg-[#f7fafb]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#004649]/10 text-sm font-bold text-[#004649]">
                {initials(chat.senderName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-bold text-[#1a2b3d]">{chat.senderName}</p>
                  <p className="shrink-0 text-[11px] text-[#8293a3]" suppressHydrationWarning>{mounted ? formatTime(chat.latestAt) : ''}</p>
                </div>
                <p className="truncate text-xs text-[#5b6b7c]">{chat.latestPreview}</p>
              </div>
            </div>
            {chat.unreadCount > 0 ? (
              <div className="mt-2 flex justify-end">
                <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#2563eb] px-1 text-[10px] font-bold text-white">
                  {chat.unreadCount}
                </span>
              </div>
            ) : null}
          </button>
        ))}

        {filteredConversations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#cdd9e1] bg-[#f7fafb] p-5 text-center text-sm text-[#5b6b7c]">
            No conversations in this filter.
          </div>
        ) : null}
      </div>
    </div>
  );

  const rightChatPanel = (
    <div className="flex h-[72vh] flex-col rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
      {activeConversation ? (
        <>
          <div className="flex items-center justify-between border-b border-[#e6edf2] px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveId(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#d7e2ea] text-[#607080] lg:hidden"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#004649]/10 text-sm font-bold text-[#004649]">
                {initials(activeConversation.senderName)}
              </div>
              <div>
                <p className="text-sm font-bold text-[#1a2b3d]">{activeConversation.senderName}</p>
                <p className="text-xs text-[#607080]">Teacher</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-auto bg-[#f5f7fa] px-4 py-4">
            {activeConversation.messages.map((message) => (
              <div key={message.id} className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    message.direction === 'out'
                      ? 'rounded-br-sm bg-[#004649] text-white'
                      : 'rounded-bl-sm bg-white text-[#1a2b3d]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className={`text-[10px] ${message.direction === 'out' ? 'text-[#d8f2f2]' : 'text-[#8aa0b3]'}`} suppressHydrationWarning>
                      {mounted ? formatTime(message.createdAt) : ''} {message.pending ? '- Sending...' : ''}
                    </div>
                    {!message.pending && !message.id.startsWith('temp-') ? (
                      <button
                        type="button"
                        onClick={() => void handleDeleteMessage(message.id, message.direction)}
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] ${message.direction === 'out' ? 'text-white/85 hover:bg-white/15' : 'text-[#8aa0b3] hover:bg-[#e8eff3]'}`}
                        title="Delete message"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div ref={chatBottomRef} />

          <div className="border-t border-[#e6edf2] bg-white p-3">
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Write a message..."
                className="h-11 flex-1 rounded-full bg-[#edeeef] border-none px-4 text-sm text-[#1a2b3d] outline-none focus:ring-2 focus:ring-[#004649]/20"
              />
              <button
                onClick={() => void handleSend()}
                disabled={isSending || draft.trim().length < 2}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#004649] text-white hover:bg-[#005a5e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="grid flex-1 place-items-center bg-[#f5f7fa] p-8">
          <div className="max-w-sm rounded-2xl border border-dashed border-[#ccd8e0] bg-white p-8 text-center">
            <h3 className="text-lg font-bold text-[#1a2b3d]">No Chat Selected</h3>
            <p className="mt-2 text-sm text-[#607080]">Choose a conversation from the chat list to start messaging.</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold font-headline text-[#1a2b3d]">Communications Hub</h2>
            <p className="text-sm text-[#607080]">Modern chat experience for academic and finance conversations.</p>
          </div>
          <button
            onClick={() => setShowMobileFilters((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-xl border border-[#d3e0e7] px-3 py-2 text-sm font-semibold text-[#1a2b3d] lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Panels
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[230px_360px_minmax(0,1fr)]">
        <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block`}>{leftCategoriesPanel}</div>

        <div className={`${activeConversation ? 'hidden lg:block' : 'block'}`}>{middleChatListPanel}</div>

        <div className={`${activeConversation ? 'block' : 'hidden lg:block'}`}>{rightChatPanel}</div>
      </div>

      {/* Compose new message modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1a2b3d]">New Message</h3>
              <button
                onClick={() => setShowCompose(false)}
                className="h-7 w-7 rounded-full bg-[#edeeef] flex items-center justify-center text-[#607080] hover:bg-[#dde0e2]"
              >X</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7c8b99] mb-1">To (Teacher)</label>
                <select
                  value={composeTeacherId}
                  onChange={(e) => setComposeTeacherId(e.target.value)}
                  className="h-10 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#1a2b3d] outline-none focus:ring-2 focus:ring-[#004649]/20"
                >
                  <option value="">Select teacher...</option>
                  {availableTeachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7c8b99] mb-1">Subject</label>
                <input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="e.g. Question about homework"
                  className="h-10 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#1a2b3d] outline-none focus:ring-2 focus:ring-[#004649]/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7c8b99] mb-1">Message</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={4}
                  placeholder="Write your message..."
                  className="w-full rounded-xl bg-[#edeeef] border-none px-3 py-2.5 text-sm text-[#1a2b3d] outline-none focus:ring-2 focus:ring-[#004649]/20 resize-none"
                />
              </div>
              <button
                onClick={() => void handleComposeSend()}
                disabled={!composeTeacherId || composeBody.trim().length < 2 || isComposeSending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#004649] py-2.5 text-sm font-bold text-white hover:bg-[#005a5e] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isComposeSending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
