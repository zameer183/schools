'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, MessageSquarePlus, Search, Send, Trash2, X } from 'lucide-react';

type MessageDirection = 'received' | 'sent';

export type SerializedMessage = {
  id: string;
  subject: string;
  body: string;
  senderId?: string;
  senderName: string;
  senderRole: string;
  createdAt: string;
  isRead: boolean;
  direction: MessageDirection;
  recipients?: { id: string; name: string }[];
};

export type RecipientOption = {
  userId: string;
  fullName: string;
  className: string;
};

type CategoryKey = 'all' | 'received' | 'sent';

type ConvMessage = {
  id: string;
  body: string;
  subject: string;
  createdAt: string;
  direction: 'in' | 'out';
  pending?: boolean;
};

type Conversation = {
  personId: string;
  personName: string;
  isOnline: boolean;
  unreadCount: number;
  latestAt: string;
  latestPreview: string;
  category: 'received' | 'sent' | 'both';
  messages: ConvMessage[];
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 86_400_000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172_800_000) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' - ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

type InboxApiRow = {
  id: string;
  isRead: boolean;
  message: {
    id: string;
    subject: string;
    body: string;
    createdAt: string;
    sender: {
      id: string;
      fullName: string;
      role: string;
    };
  };
};

function parseReceivedFromApi(rows: InboxApiRow[]): SerializedMessage[] {
  return rows.map((item) => ({
    id: item.message.id,
    subject: item.message.subject,
    body: item.message.body,
    senderId: item.message.sender.id,
    senderName: item.message.sender.fullName,
    senderRole: item.message.sender.role,
    createdAt: item.message.createdAt,
    isRead: item.isRead,
    direction: 'received' as const,
    recipients: undefined
  }));
}

function mergeReceivedMessages(existing: SerializedMessage[], incoming: SerializedMessage[]) {
  const sent = existing.filter((m) => m.direction === 'sent');
  const receivedMap = new Map<string, SerializedMessage>();
  for (const item of [...existing.filter((m) => m.direction === 'received'), ...incoming]) {
    const key = `${item.id}:${item.senderId ?? ''}`;
    receivedMap.set(key, item);
  }
  return [...Array.from(receivedMap.values()), ...sent].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function buildConversations(
  messages: SerializedMessage[],
  locallyRead: Set<string>,
  localSent: Map<string, ConvMessage[]>
): Conversation[] {
  const map = new Map<string, Conversation>();

  for (const msg of messages) {
    if (msg.direction === 'received' && msg.senderId) {
      const pid = msg.senderId;
      const existing = map.get(pid);
      const convMsg: ConvMessage = { id: msg.id, body: msg.body, subject: msg.subject, createdAt: msg.createdAt, direction: 'in' };
      if (!existing) {
        map.set(pid, {
          personId: pid,
          personName: msg.senderName,
          isOnline: false, // computed post-mount to avoid hydration mismatch
          unreadCount: msg.isRead || locallyRead.has(pid) ? 0 : 1,
          latestAt: msg.createdAt,
          latestPreview: msg.body,
          category: 'received',
          messages: [convMsg]
        });
      } else {
        existing.messages.push(convMsg);
        if (!msg.isRead && !locallyRead.has(pid)) existing.unreadCount += 1;
        if (new Date(msg.createdAt).getTime() > new Date(existing.latestAt).getTime()) {
          existing.latestAt = msg.createdAt;
          existing.latestPreview = msg.body;
        }
        if (existing.category === 'sent') existing.category = 'both';
      }
    }

    if (msg.direction === 'sent' && msg.recipients) {
      for (const r of msg.recipients) {
        const pid = r.id;
        const convMsg: ConvMessage = { id: msg.id, body: msg.body, subject: msg.subject, createdAt: msg.createdAt, direction: 'out' };
        const existing = map.get(pid);
        if (!existing) {
          map.set(pid, {
            personId: pid,
            personName: r.name,
            isOnline: false,
            unreadCount: 0,
            latestAt: msg.createdAt,
            latestPreview: msg.body,
            category: 'sent',
            messages: [convMsg]
          });
        } else {
          existing.messages.push(convMsg);
          if (new Date(msg.createdAt).getTime() > new Date(existing.latestAt).getTime()) {
            existing.latestAt = msg.createdAt;
            existing.latestPreview = msg.body;
          }
          if (existing.category === 'received') existing.category = 'both';
        }
      }
    }
  }

  // merge local optimistic sent messages
  for (const [pid, extras] of localSent.entries()) {
    const existing = map.get(pid);
    if (existing) {
      existing.messages.push(...extras);
      const latest = extras[extras.length - 1];
      if (latest && new Date(latest.createdAt).getTime() > new Date(existing.latestAt).getTime()) {
        existing.latestAt = latest.createdAt;
        existing.latestPreview = latest.body;
      }
    }
  }

  return Array.from(map.values())
    .map((c) => ({
      ...c,
      messages: c.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }))
    .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

interface TeacherMessagesClientProps {
  messages: SerializedMessage[];
  recipients: RecipientOption[];
}

export function TeacherMessagesClient({ messages, recipients }: TeacherMessagesClientProps) {
  const [mounted, setMounted] = useState(false);
  const [liveMessages, setLiveMessages] = useState<SerializedMessage[]>(messages);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState<CategoryKey>('all');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [locallyRead, setLocallyRead] = useState<Set<string>>(new Set());
  const [localSent, setLocalSent] = useState<Map<string, ConvMessage[]>>(new Map());
  const [showCompose, setShowCompose] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [isComposeSending, setIsComposeSending] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setLiveMessages(messages); }, [messages]);

  useEffect(() => {
    let cancelled = false;
    const syncInbox = async () => {
      try {
        const response = await fetch('/api/messages?limit=50', { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as InboxApiRow[];
        if (cancelled) return;
        const received = parseReceivedFromApi(data);
        setLiveMessages((prev) => mergeReceivedMessages(prev, received));
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

  const allConversations = useMemo(
    () => buildConversations(liveMessages, locallyRead, localSent),
    [liveMessages, locallyRead, localSent]
  );

  const filtered = useMemo(() => {
    return allConversations.filter((c) => {
      const catMatch =
        category === 'all' ||
        (category === 'received' && (c.category === 'received' || c.category === 'both')) ||
        (category === 'sent' && (c.category === 'sent' || c.category === 'both'));
      const q = search.toLowerCase();
      const searchMatch = !q || c.personName.toLowerCase().includes(q) || c.latestPreview.toLowerCase().includes(q);
      return catMatch && searchMatch;
    });
  }, [allConversations, category, search]);

  const activeConv = filtered.find((c) => c.personId === activeId) ?? null;

  useEffect(() => {
    if (!activeConv || activeConv.unreadCount === 0) return;
    setLocallyRead((prev) => new Set(prev).add(activeConv.personId));
  }, [activeConv]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages.length]);

  const counts = useMemo(() => ({
    all: allConversations.length,
    received: allConversations.filter((c) => c.category === 'received' || c.category === 'both').length,
    sent: allConversations.filter((c) => c.category === 'sent' || c.category === 'both').length,
  }), [allConversations]);

  // After all hooks, render a stable loading state before mounting full UI.
  if (!mounted) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e0eff0] border-t-[#2b676e]" />
      </div>
    );
  }

  const toggleRecipient = (id: string) => {
    setSelectedRecipients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!activeConv || draft.trim().length < 2 || isSending) return;
    const text = draft.trim();
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ConvMessage = {
      id: tempId,
      body: text,
      subject: `Re: ${(activeConv.messages.find((m) => m.subject)?.subject ?? 'Message').replace(/^(re:\s*)+/i, '')}`,
      createdAt: new Date().toISOString(),
      direction: 'out',
      pending: true
    };
    setLocalSent((prev) => {
      const next = new Map(prev);
      next.set(activeConv.personId, [...(next.get(activeConv.personId) ?? []), optimistic]);
      return next;
    });
    setDraft('');
    setIsSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: optimistic.subject,
          body: text,
          recipientIds: [activeConv.personId]
        })
      });
      if (!res.ok) {
        setLocalSent((prev) => {
          const next = new Map(prev);
          const arr = (next.get(activeConv.personId) ?? []).filter((m) => m.id !== tempId);
          next.set(activeConv.personId, arr);
          return next;
        });
      } else {
        const created = (await res.json()) as { id?: string; createdAt?: string };
        setLocalSent((prev) => {
          const next = new Map(prev);
          const arr = (next.get(activeConv.personId) ?? []).map((m) =>
            m.id === tempId
              ? { ...m, id: created.id ?? m.id, createdAt: created.createdAt ?? m.createdAt, pending: false }
              : m
          );
          next.set(activeConv.personId, arr);
          return next;
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string, direction: 'in' | 'out') => {
    if (!messageId || messageId.startsWith('tmp-')) return;
    const confirmed = window.confirm('Delete this message?');
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/messages?id=${messageId}`, { method: 'DELETE' });
      if (!res.ok) return;
      if (direction === 'out') {
        setLiveMessages((prev) => prev.filter((m) => !(m.direction === 'sent' && m.id === messageId)));
        setLocalSent((prev) => {
          const next = new Map(prev);
          for (const [key, value] of next.entries()) {
            next.set(key, value.filter((msg) => msg.id !== messageId));
          }
          return next;
        });
      } else {
        setLiveMessages((prev) => prev.filter((m) => !(m.direction === 'received' && m.id === messageId)));
      }
    } catch {
      // no-op
    }
  };

  const handleComposeSend = async () => {
    if (!composeBody.trim() || selectedRecipients.size === 0 || isComposeSending) return;
    setIsComposeSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: composeSubject.trim() || 'New Message',
          body: composeBody.trim(),
          recipientIds: Array.from(selectedRecipients)
        })
      });
      if (res.ok) {
        const data = await res.json() as { id: string; createdAt: string };
        const newMsgs: ConvMessage[] = [{
          id: data.id,
          body: composeBody.trim(),
          subject: composeSubject.trim() || 'New Message',
          createdAt: data.createdAt ?? new Date().toISOString(),
          direction: 'out',
          pending: false
        }];
        for (const rid of selectedRecipients) {
          setLocalSent((prev) => {
            const next = new Map(prev);
            next.set(rid, [...(next.get(rid) ?? []), ...newMsgs]);
            return next;
          });
        }
        setShowCompose(false);
        setComposeSubject('');
        setComposeBody('');
        setSelectedRecipients(new Set());
        // open first recipient's conversation
        const firstId = Array.from(selectedRecipients)[0];
        if (firstId) setActiveId(firstId);
      }
    } finally {
      setIsComposeSending(false);
    }
  };

  const catItems: { key: CategoryKey; label: string; count: number }[] = [
    { key: 'all', label: 'All Messages', count: counts.all },
    { key: 'received', label: 'Received', count: counts.received },
    { key: 'sent', label: 'Sent', count: counts.sent }
  ];

  /* -- Left panel -- */
  const leftPanel = (
    <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(43,103,110,0.06)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold font-headline text-[#1a2b3d]">Categories</h3>
        <button
          onClick={() => setShowCompose(true)}
          className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-[#2b676e] to-[#1a5058] shadow-[0_8px_20px_rgba(43,103,110,0.12)] active:scale-[0.98] transition-all px-2.5 py-1.5 text-xs font-semibold text-white"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          New
        </button>
      </div>
      <div className="space-y-1.5">
        {catItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setCategory(item.key)}
            className={`flex w-full items-center justify-between rounded-xl border-l-4 px-3 py-2 text-left text-sm transition ${
              category === item.key
                ? 'border-l-[#1a5058] bg-[#e9f5f4] text-[#1a5058]'
                : 'border-l-transparent bg-[#f7fafb] text-[#5b6b7c] hover:bg-[#edf4f7]'
            }`}
          >
            <span className="font-medium">{item.label}</span>
            <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-xs font-bold text-[#1d4ed8]">{item.count}</span>
          </button>
        ))}
      </div>

      {/* Student quick-access avatars */}
      {recipients.length > 0 && (
        <div className="mt-4 border-t border-[#e9f0f4] pt-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#8293a3]">Your Students</p>
          <div className="flex flex-wrap gap-2">
            {recipients.slice(0, 8).map((r) => (
              <button
                key={r.userId}
                onClick={() => {
                  setSelectedRecipients(new Set([r.userId]));
                  setShowCompose(true);
                }}
                title={r.fullName}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="h-9 w-9 rounded-full bg-[#1a5058]/10 flex items-center justify-center text-xs font-bold text-[#1a5058] ring-2 ring-white group-hover:ring-[#1a5058]/20 transition-all">
                  {initials(r.fullName)}
                </div>
                <span className="text-[9px] text-[#8293a3] max-w-[36px] truncate text-center leading-none">
                  {r.fullName.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* -- Middle panel -- */
  const middlePanel = (
    <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(43,103,110,0.06)] p-4">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c8b99]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations..."
          className="h-11 w-full rounded-full bg-[#edeeef] border-none pl-10 pr-4 text-sm text-[#1a2b3d] outline-none focus:ring-2 focus:ring-[#1a5058]/20"
        />
      </div>

      <div className="space-y-1 overflow-auto pr-1" style={{maxHeight: 'calc(100dvh - 360px)', minHeight: '200px'}}>
        {filtered.map((conv) => (
          <button
            key={conv.personId}
            onClick={() => { setActiveId(conv.personId); setShowMobileFilters(false); }}
            className={`w-full rounded-xl border p-3 text-left transition ${
              activeId === conv.personId
                ? 'border-[#1a5058] bg-[#e9f5f4]'
                : 'border-[#e5edf2] bg-white hover:bg-[#f7fafb]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#1a5058]/10 text-sm font-bold text-[#1a5058]">
                  {initials(conv.personName)}
                </div>
                {conv.isOnline && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#22c55e] ring-2 ring-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`truncate text-sm font-bold text-[#1a2b3d] ${conv.unreadCount > 0 ? 'font-extrabold' : ''}`}>
                    {conv.personName}
                  </p>
                  <p className="shrink-0 text-[11px] text-[#8293a3]" suppressHydrationWarning>{mounted ? formatTime(conv.latestAt) : ''}</p>
                </div>
                <p className={`truncate text-xs ${conv.unreadCount > 0 ? 'text-[#1a2b3d] font-semibold' : 'text-[#5b6b7c]'}`}>
                  {conv.latestPreview}
                </p>
              </div>
            </div>
            {conv.unreadCount > 0 && (
              <div className="mt-2 flex justify-end">
                <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#2563eb] px-1 text-[10px] font-bold text-white">
                  {conv.unreadCount}
                </span>
              </div>
            )}
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#cdd9e1] bg-[#f7fafb] p-5 text-center text-sm text-[#5b6b7c]">
            {search ? 'No results found.' : 'No conversations yet.'}
          </div>
        )}
      </div>
    </div>
  );

  /* -- Right chat panel -- */
  const rightPanel = (
    <div className="flex flex-col rounded-2xl bg-white shadow-[0_12px_40px_rgba(43,103,110,0.06)]" style={{height: 'calc(100dvh - 280px)', minHeight: '400px'}}>
      {activeConv ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#e6edf2] px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveId(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#d7e2ea] text-[#607080] lg:hidden"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#1a5058]/10 text-sm font-bold text-[#1a5058]">
                {initials(activeConv.personName)}
              </div>
              <div>
                <p className="text-sm font-bold text-[#1a2b3d]">{activeConv.personName}</p>
                <p className="text-xs text-[#607080]">Student</p>
              </div>
            </div>
            <p className="hidden sm:block text-[10px] text-[#8293a3]" suppressHydrationWarning>
              {mounted ? formatFullDate(activeConv.latestAt) : ''}
            </p>
          </div>

          {/* Bubbles */}
          <div className="flex-1 space-y-2 overflow-auto bg-[#eef2f5] px-4 py-4">
            {activeConv.messages.map((msg) => (
              <div key={msg.id} className={`group flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  msg.direction === 'out'
                    ? 'rounded-br-sm bg-[#1a5058] text-white'
                    : 'rounded-bl-sm bg-white text-[#1a2b3d]'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className={`text-[10px] ${msg.direction === 'out' ? 'text-[#d8f2f2]' : 'text-[#8aa0b3]'}`} suppressHydrationWarning>
                      {mounted ? formatTime(msg.createdAt) : ''}{msg.pending ? ' · Sending...' : ''}
                    </div>
                    {!msg.pending && !msg.id.startsWith('tmp-') ? (
                      <button
                        type="button"
                        onClick={() => void handleDeleteMessage(msg.id, msg.direction)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity ${msg.direction === 'out' ? 'text-white/70 hover:text-white' : 'text-[#8aa0b3] hover:text-red-400'}`}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div ref={chatBottomRef} />

          {/* Reply bar */}
          <div className="border-t border-[#e6edf2] bg-white px-3 pt-3 pb-[84px] lg:pb-3">
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); }
                }}
                placeholder={`Reply to ${activeConv.personName.split(' ')[0]}...`}
                className="h-11 flex-1 rounded-full bg-[#edeeef] border-none px-4 text-sm text-[#1a2b3d] outline-none focus:ring-2 focus:ring-[#1a5058]/20"
              />
              <button
                onClick={() => void handleSend()}
                disabled={isSending || draft.trim().length < 1}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#1a5058] text-white hover:bg-[#1a5058] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="grid flex-1 place-items-center bg-[#f5f7fa] p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#e0f0f1]">
              <MessageSquarePlus className="h-9 w-9 text-[#2b676e]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1a2b3d]">Select a conversation</h3>
              <p className="mt-1 text-sm text-[#607080]">Or start a new message to your students.</p>
            </div>
            <button
              onClick={() => setShowCompose(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#2b676e] to-[#1a5058] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(43,103,110,0.12)] active:scale-[0.98] transition-all"
            >
              <MessageSquarePlus className="h-4 w-4" />
              New Message
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Page header card */}
      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(43,103,110,0.06)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold font-headline text-[#1a2b3d]">Communications Hub</h2>
            <p className="text-sm text-[#607080]">Message your students and stay on top of your class.</p>
          </div>
          <button
            onClick={() => setShowCompose(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#2b676e] to-[#1a5058] px-3 py-2 text-sm font-semibold text-white shadow-sm lg:hidden"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New
          </button>
        </div>
      </div>

      {/* Mobile category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {catItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setCategory(item.key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              category === item.key
                ? 'bg-[#1a5058] text-white'
                : 'bg-white text-[#5b6b7c] border border-[#e5edf2]'
            }`}
          >
            {item.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              category === item.key ? 'bg-white/20 text-white' : 'bg-[#dbeafe] text-[#1d4ed8]'
            }`}>{item.count}</span>
          </button>
        ))}
      </div>

      {/* 3-col grid */}
      <div className="grid gap-4 lg:grid-cols-[230px_360px_minmax(0,1fr)]">
        <div className="hidden lg:block">{leftPanel}</div>
        <div className={`${activeConv ? 'hidden lg:block' : 'block'}`}>{middlePanel}</div>
        <div className={`${activeConv ? 'block' : 'hidden lg:block'}`}>{rightPanel}</div>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1a2b3d]">New Message</h3>
              <button
                onClick={() => setShowCompose(false)}
                className="h-7 w-7 rounded-full bg-[#edeeef] flex items-center justify-center text-[#607080] hover:bg-[#dde0e2]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Recipients */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7c8b99] mb-1.5">
                  To - {selectedRecipients.size > 0 ? `${selectedRecipients.size} selected` : 'Select students'}
                </label>
                {recipients.length === 0 ? (
                  <p className="text-sm text-[#607080]">No students in your classes.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-xl bg-[#f7fafb] border border-[#e5edf2] divide-y divide-[#edf0f2]">
                    {recipients.map((r) => {
                      const checked = selectedRecipients.has(r.userId);
                      return (
                        <label
                          key={r.userId}
                          className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors ${checked ? 'bg-[#e9f5f4]' : 'hover:bg-[#edf4f7]'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRecipient(r.userId)}
                            className="accent-[#1a5058] h-3.5 w-3.5"
                          />
                          <div className="h-7 w-7 rounded-full bg-[#1a5058]/10 flex items-center justify-center text-xs font-bold text-[#1a5058]">
                            {initials(r.fullName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#1a2b3d] truncate">{r.fullName}</p>
                            <p className="text-[10px] text-[#8293a3] truncate">{r.className}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7c8b99] mb-1">Subject</label>
                <input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="e.g. Assignment Reminder"
                  className="h-10 w-full rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#1a2b3d] outline-none focus:ring-2 focus:ring-[#1a5058]/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7c8b99] mb-1">Message</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={4}
                  placeholder="Write your message..."
                  className="w-full rounded-xl bg-[#edeeef] border-none px-3 py-2.5 text-sm text-[#1a2b3d] outline-none focus:ring-2 focus:ring-[#1a5058]/20 resize-none"
                />
              </div>

              <button
                onClick={() => void handleComposeSend()}
                disabled={selectedRecipients.size === 0 || !composeBody.trim() || isComposeSending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#2b676e] to-[#1a5058] py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(43,103,110,0.12)] hover:shadow-[0_8px_28px_rgba(43,103,110,0.22)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="h-4 w-4" />
                {isComposeSending
                  ? 'Sending...'
                  : selectedRecipients.size > 0
                    ? `Send to ${selectedRecipients.size} student${selectedRecipients.size > 1 ? 's' : ''}`
                    : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
