'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, EllipsisVertical, MessageSquarePlus, Search, Send, SlidersHorizontal, Trash2, X } from 'lucide-react';

type MessageDirection = 'received' | 'sent';
type CategoryKey = 'all' | 'received' | 'sent';

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
  const diff = Date.now() - date.getTime();
  if (diff < 86_400_000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172_800_000) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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

function mergeReceivedMessages(existing: SerializedMessage[], incoming: SerializedMessage[], deletedMessageIds: Set<string>) {
  const sent = existing.filter((item) => item.direction === 'sent');
  // Replace received set with latest server snapshot so deleted inbox rows do not reappear.
  const receivedMap = new Map<string, SerializedMessage>();
  for (const item of incoming) {
    if (deletedMessageIds.has(item.id)) continue;
    const key = `${item.id}:${item.senderId ?? ''}`;
    receivedMap.set(key, item);
  }
  const filteredSent = sent.filter((item) => !deletedMessageIds.has(item.id));
  return [...Array.from(receivedMap.values()), ...filteredSent].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function buildConversations(
  messages: SerializedMessage[],
  locallyRead: Set<string>,
  localSent: Map<string, ConvMessage[]>,
  recipientMeta: Map<string, RecipientOption>,
  deletedIds: Set<string> = new Set()
) {
  const grouped = new Map<string, Conversation>();

  for (const message of messages) {
    if (deletedIds.has(message.id)) continue;
    if (message.direction === 'received' && message.senderId) {
      const personId = message.senderId;
      const baseMessage: ConvMessage = {
        id: message.id,
        body: message.body,
        subject: message.subject,
        createdAt: message.createdAt,
        direction: 'in'
      };
      const existing = grouped.get(personId);

      if (!existing) {
        grouped.set(personId, {
          personId,
          personName: message.senderName,
          isOnline: false,
          unreadCount: message.isRead || locallyRead.has(personId) ? 0 : 1,
          latestAt: message.createdAt,
          latestPreview: message.body,
          category: 'received',
          messages: [baseMessage]
        });
        continue;
      }

      existing.messages.push(baseMessage);
      if (!message.isRead && !locallyRead.has(personId)) {
        existing.unreadCount += 1;
      }
      if (new Date(message.createdAt).getTime() > new Date(existing.latestAt).getTime()) {
        existing.latestAt = message.createdAt;
        existing.latestPreview = message.body;
      }
      if (existing.category === 'sent') {
        existing.category = 'both';
      }
    }

    if (message.direction === 'sent' && message.recipients) {
      for (const recipient of message.recipients) {
        const personId = recipient.id;
        const baseMessage: ConvMessage = {
          id: message.id,
          body: message.body,
          subject: message.subject,
          createdAt: message.createdAt,
          direction: 'out'
        };
        const existing = grouped.get(personId);

        if (!existing) {
          grouped.set(personId, {
            personId,
            personName: recipient.name,
            isOnline: false,
            unreadCount: 0,
            latestAt: message.createdAt,
            latestPreview: message.body,
            category: 'sent',
            messages: [baseMessage]
          });
          continue;
        }

        existing.messages.push(baseMessage);
        if (new Date(message.createdAt).getTime() > new Date(existing.latestAt).getTime()) {
          existing.latestAt = message.createdAt;
          existing.latestPreview = message.body;
        }
        if (existing.category === 'received') {
          existing.category = 'both';
        }
      }
    }
  }

  for (const [personId, rawExtras] of localSent.entries()) {
    const extras = rawExtras.filter((item) => !deletedIds.has(item.id));
    if (extras.length === 0) continue;
    const existing = grouped.get(personId);
    const latest = extras[extras.length - 1];
    if (!latest) continue;

    if (!existing) {
      const recipient = recipientMeta.get(personId);
      grouped.set(personId, {
        personId,
        personName: recipient?.fullName ?? 'Student',
        isOnline: false,
        unreadCount: 0,
        latestAt: latest.createdAt,
        latestPreview: latest.body,
        category: 'sent',
        messages: [...extras]
      });
      continue;
    }

    existing.messages.push(...extras);
    if (new Date(latest.createdAt).getTime() > new Date(existing.latestAt).getTime()) {
      existing.latestAt = latest.createdAt;
      existing.latestPreview = latest.body;
    }
  }

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      messages: item.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }))
    .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

interface TeacherMessagesClientProps {
  messages: SerializedMessage[];
  recipients: RecipientOption[];
}

export function TeacherMessagesClient({ messages, recipients }: TeacherMessagesClientProps) {
  const hiddenConversationStorageKey =
    typeof window === 'undefined'
      ? 'teacher:hidden-conversations'
      : `teacher:hidden-conversations:${window.location.host}`;
  const deletedMessageStorageKey =
    typeof window === 'undefined'
      ? 'teacher:deleted-message-ids'
      : `teacher:deleted-message-ids:${window.location.host}`;

  const [mounted, setMounted] = useState(false);
  const [liveMessages, setLiveMessages] = useState<SerializedMessage[]>(messages);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState<CategoryKey>('all');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [locallyRead, setLocallyRead] = useState<Set<string>>(new Set());
  const [localSent, setLocalSent] = useState<Map<string, ConvMessage[]>>(new Map());
  const [showCompose, setShowCompose] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showDeleteChatConfirm, setShowDeleteChatConfirm] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<{ id: string; direction: 'in' | 'out' } | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [chatDeleteToast, setChatDeleteToast] = useState<string | null>(null);
  const [hiddenConversationIds, setHiddenConversationIds] = useState<Set<string>>(new Set());
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeSearch, setComposeSearch] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [isComposeSending, setIsComposeSending] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const filteredRecipients = useMemo(() => {
    if (!composeSearch.trim()) return recipients;
    const q = composeSearch.toLowerCase();
    return recipients.filter(
      (r) => r.fullName.toLowerCase().includes(q) || r.className.toLowerCase().includes(q)
    );
  }, [recipients, composeSearch]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLiveMessages(messages.filter((item) => !deletedMessageIds.has(item.id)));
  }, [messages, deletedMessageIds]);

  useEffect(() => {
    let cancelled = false;
    let shouldStop = false;
    let intervalId: number | null = null;

    const syncInbox = async () => {
      if (document.hidden || shouldStop) return;
      try {
        const response = await fetch('/api/messages?limit=10', { cache: 'no-store', credentials: 'include' });
        if (cancelled || shouldStop) return;
        if (response.status === 401) {
          shouldStop = true;
          setAuthError('Your session expired. Reload and sign in again.');
          return;
        }
        if (response.status === 403) {
          shouldStop = true;
          setAuthError('Messages access is currently unavailable for this account.');
          return;
        }
        if (!response.ok) return;
        const data = (await response.json()) as InboxApiRow[];
        if (cancelled) return;
        setAuthError(null);
        const received = parseReceivedFromApi(data);
        setLiveMessages((prev) => mergeReceivedMessages(prev, received, deletedMessageIds));
      } catch {
        // ignore transient polling errors
      }
    };

    const startPolling = () => {
      if (intervalId !== null || shouldStop || document.hidden) return;
      intervalId = window.setInterval(() => {
        if (shouldStop || document.hidden) return;
        void syncInbox();
      }, 5000);
    };

    const stopPolling = () => {
      if (intervalId === null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
        return;
      }
      void syncInbox();
      startPolling();
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [deletedMessageIds]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(hiddenConversationStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { ids?: string[]; savedAt?: number } | string[];
      if (Array.isArray(parsed)) {
        // Backward compatibility with old format
        setHiddenConversationIds(new Set(parsed));
        return;
      }
      const ids = Array.isArray(parsed?.ids) ? parsed.ids : [];
      const savedAt = typeof parsed?.savedAt === 'number' ? parsed.savedAt : Date.now();
      const age = Date.now() - savedAt;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (age > maxAge) {
        window.localStorage.removeItem(hiddenConversationStorageKey);
        return;
      }
      if (ids.length > 0) {
        setHiddenConversationIds(new Set(ids));
      }
    } catch {
      // ignore storage parse errors
    }
  }, [hiddenConversationStorageKey]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(deletedMessageStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { ids?: string[]; savedAt?: number } | string[];
      let ids: string[] = [];
      if (Array.isArray(parsed)) {
        ids = parsed;
      } else if (Array.isArray(parsed?.ids)) {
        const savedAt = typeof parsed?.savedAt === 'number' ? parsed.savedAt : Date.now();
        const age = Date.now() - savedAt;
        const maxAge = 7 * 24 * 60 * 60 * 1000;
        if (age > maxAge) {
          window.localStorage.removeItem(deletedMessageStorageKey);
          return;
        }
        ids = parsed.ids;
      }
      if (ids.length > 0) {
        const idSet = new Set(ids);
        setDeletedMessageIds(idSet);
        setLiveMessages((prev) => prev.filter((item) => !idSet.has(item.id)));
      }
    } catch {
      // ignore storage parse errors
    }
  }, [deletedMessageStorageKey]);

  const allConversations = useMemo(
    () => buildConversations(liveMessages, locallyRead, localSent, new Map(recipients.map((item) => [item.userId, item] as const)), deletedMessageIds),
    [liveMessages, locallyRead, localSent, recipients, deletedMessageIds]
  );

  const recipientClassNameMap = useMemo(
    () => new Map(recipients.map((item) => [item.userId, item.className] as const)),
    [recipients]
  );

  const recipientIdSet = useMemo(() => new Set(recipients.map((item) => item.userId)), [recipients]);

  const visibleConversations = useMemo(
    () => allConversations.filter((item) => !hiddenConversationIds.has(item.personId)),
    [allConversations, hiddenConversationIds]
  );

  useEffect(() => {
    // Safety: never allow a state where all chats are hidden permanently.
    if (allConversations.length === 0 || hiddenConversationIds.size === 0) return;
    if (visibleConversations.length > 0) return;
    setHiddenConversationIds(new Set());
    try {
      window.localStorage.removeItem(hiddenConversationStorageKey);
    } catch {
      // ignore storage errors
    }
    setChatDeleteToast('Hidden chats reset. Messages restored.');
  }, [allConversations.length, hiddenConversationIds.size, visibleConversations.length, hiddenConversationStorageKey]);

  const filteredConversations = useMemo(() => {
    return visibleConversations.filter((conversation) => {
      const categoryMatch =
        category === 'all' ||
        (category === 'received' && (conversation.category === 'received' || conversation.category === 'both')) ||
        (category === 'sent' && (conversation.category === 'sent' || conversation.category === 'both'));
      const query = search.toLowerCase();
      const searchMatch =
        !query ||
        conversation.personName.toLowerCase().includes(query) ||
        conversation.latestPreview.toLowerCase().includes(query);
      return categoryMatch && searchMatch;
    });
  }, [visibleConversations, category, search]);

  const activeConversation = filteredConversations.find((item) => item.personId === activeId) ?? null;

  useEffect(() => {
    if (!activeConversation || activeConversation.unreadCount === 0) return;
    setLocallyRead((prev) => new Set(prev).add(activeConversation.personId));
  }, [activeConversation]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages.length]);

  useEffect(() => {
    setShowChatMenu(false);
  }, [activeId]);

  useEffect(() => {
    if (!chatDeleteToast) return;
    const timer = window.setTimeout(() => setChatDeleteToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [chatDeleteToast]);

  const categoryCounts = useMemo(() => ({
    all: visibleConversations.length,
    received: visibleConversations.filter((item) => item.category === 'received' || item.category === 'both').length,
    sent: visibleConversations.filter((item) => item.category === 'sent' || item.category === 'both').length,
  }), [visibleConversations]);

  const totalUnreadCount = useMemo(
    () => visibleConversations.reduce((sum, item) => sum + item.unreadCount, 0),
    [visibleConversations]
  );

  if (!mounted) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#F0E8DC] border-t-[#004D47]" />
      </div>
    );
  }

  const toggleRecipient = (id: string) => {
    setSelectedRecipients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSend = async () => {
    if (!activeConversation || draft.trim().length < 2 || isSending) return;

    const text = draft.trim();
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ConvMessage = {
      id: tempId,
      body: text,
      subject: `Re: ${(activeConversation.messages.find((item) => item.subject)?.subject ?? 'Message').replace(/^(re:\s*)+/i, '')}`,
      createdAt: new Date().toISOString(),
      direction: 'out',
      pending: true
    };

    setLocalSent((prev) => {
      const next = new Map(prev);
      next.set(activeConversation.personId, [...(next.get(activeConversation.personId) ?? []), optimistic]);
      return next;
    });
    setDraft('');
    setIsSending(true);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: optimistic.subject,
          body: text,
          recipientIds: [activeConversation.personId]
        })
      });

      if (!response.ok) {
        setLocalSent((prev) => {
          const next = new Map(prev);
          next.set(
            activeConversation.personId,
            (next.get(activeConversation.personId) ?? []).filter((message) => message.id !== tempId)
          );
          return next;
        });
        return;
      }

      const created = (await response.json()) as { id?: string; createdAt?: string };
      setLocalSent((prev) => {
        const next = new Map(prev);
        const updated = (next.get(activeConversation.personId) ?? []).map((message) =>
          message.id === tempId
            ? { ...message, id: created.id ?? message.id, createdAt: created.createdAt ?? message.createdAt, pending: false }
            : message
        );
        next.set(activeConversation.personId, updated);
        return next;
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    const { id: messageId, direction } = messageToDelete;
    if (!messageId || messageId.startsWith('tmp-')) {
      setMessageToDelete(null);
      return;
    }

    setIsDeletingMessage(true);
    try {
      const response = await fetch(`/api/messages?id=${messageId}`, { method: 'DELETE', credentials: 'include' });
      if (response.status === 401) {
        setAuthError('Your session expired. Reload and sign in again.');
        return;
      }
      if (!response.ok) return;

      if (direction === 'out') {
        setLiveMessages((prev) => prev.filter((item) => !(item.direction === 'sent' && item.id === messageId)));
        setLocalSent((prev) => {
          const next = new Map(prev);
          for (const [key, value] of next.entries()) {
            next.set(key, value.filter((message) => message.id !== messageId));
          }
          return next;
        });
      } else {
        setLiveMessages((prev) => prev.filter((item) => !(item.direction === 'received' && item.id === messageId)));
      }
      setDeletedMessageIds((prev) => {
        const next = new Set(prev);
        next.add(messageId);
        try {
          window.localStorage.setItem(
            deletedMessageStorageKey,
            JSON.stringify({ ids: Array.from(next), savedAt: Date.now() })
          );
        } catch {
          // ignore storage write errors
        }
        return next;
      });
      setMessageToDelete(null);
      setChatDeleteToast('Message deleted');
      setTimeout(() => setChatDeleteToast(null), 2500);
    } finally {
      setIsDeletingMessage(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!activeConversation || isDeletingChat) return;
    if (!recipientIdSet.has(activeConversation.personId)) {
      setShowDeleteChatConfirm(false);
      setShowChatMenu(false);
      return;
    }

    setIsDeletingChat(true);
    try {
      const persistedMessageIds = Array.from(new Set(
        activeConversation.messages
          .map((message) => message.id)
          .filter((messageId) => messageId && !messageId.startsWith('tmp-'))
      ));

      if (persistedMessageIds.length > 0) {
        const response = await fetch(
          `/api/messages?conversationWithUserId=${encodeURIComponent(activeConversation.personId)}`,
          { method: 'DELETE', credentials: 'include' }
        );

        if (response.status === 401) {
          setAuthError('Your session expired. Reload and sign in again.');
          setShowDeleteChatConfirm(false);
          setShowChatMenu(false);
          return;
        }

        if (!response.ok) return;

        setDeletedMessageIds((prev) => {
          const next = new Set(prev);
          for (const id of persistedMessageIds) next.add(id);
          try {
            window.localStorage.setItem(
              deletedMessageStorageKey,
              JSON.stringify({ ids: Array.from(next), savedAt: Date.now() })
            );
          } catch {
            // ignore storage write errors
          }
          return next;
        });
      }

      setLiveMessages((prev) =>
        prev.filter((message) => {
          if (message.direction === 'received') return message.senderId !== activeConversation.personId;
          if (message.direction === 'sent') return !(message.recipients ?? []).some((recipient) => recipient.id === activeConversation.personId);
          return true;
        })
      );
      setLocalSent((prev) => {
        const next = new Map(prev);
        next.delete(activeConversation.personId);
        return next;
      });
      setShowDeleteChatConfirm(false);
      setShowChatMenu(false);
      setHiddenConversationIds((prev) => {
        const next = new Set(prev);
        next.add(activeConversation.personId);
        try {
          window.localStorage.setItem(
            hiddenConversationStorageKey,
            JSON.stringify({ ids: Array.from(next), savedAt: Date.now() })
          );
        } catch {
          // ignore storage write errors
        }
        return next;
      });
      setActiveId(null);
      setChatDeleteToast('Chat deleted successfully.');
    } finally {
      setIsDeletingChat(false);
    }
  };

  const handleComposeSend = async () => {
    if (!composeBody.trim() || selectedRecipients.size === 0 || isComposeSending) return;

    setIsComposeSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: composeSubject.trim() || 'New Message',
          body: composeBody.trim(),
          recipientIds: Array.from(selectedRecipients)
        })
      });

      if (!response.ok) return;

      const data = (await response.json()) as { id: string; createdAt: string };
      const createdAt = data.createdAt ?? new Date().toISOString();
      const subject = composeSubject.trim() || 'New Message';

      setLocalSent((prev) => {
        const next = new Map(prev);
        for (const recipientId of selectedRecipients) {
          next.set(recipientId, [
            ...(next.get(recipientId) ?? []),
            {
              id: data.id,
              body: composeBody.trim(),
              subject,
              createdAt,
              direction: 'out',
              pending: false
            }
          ]);
        }
        return next;
      });

      setShowCompose(false);
      setComposeSubject('');
      setComposeBody('');
      const recipientIds = Array.from(selectedRecipients);
      setSelectedRecipients(new Set());
      if (recipientIds[0]) {
        setActiveId(recipientIds[0]);
      }
    } finally {
      setIsComposeSending(false);
    }
  };

  const categories = [
    { key: 'all' as const, label: 'All Messages', count: categoryCounts.all },
    { key: 'received' as const, label: 'Received', count: categoryCounts.received },
    { key: 'sent' as const, label: 'Sent', count: categoryCounts.sent }
  ];

  const leftPanel = (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-[24px] lg:border-white lg:shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#0F172A]">Categories</h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowCompose(true)}
            className="inline-flex items-center gap-1 rounded-xl bg-[#007A70] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#005a53] transition active:scale-95"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            New
          </button>
          <button
            type="button"
            onClick={() => setShowMobileFilters(false)}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 lg:hidden"
            title="Close filters"
            aria-label="Close filters"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        {categories.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setCategory(item.key);
              setShowMobileFilters(false);
            }}
            className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm transition ${
              category === item.key
                ? 'bg-[#007A70] font-bold text-white shadow-xs'
                : 'bg-slate-50 font-medium text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{item.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                category === item.key ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
              }`}
            >
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {recipients.length > 0 ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Your Students</p>
          <div className="flex flex-wrap gap-2">
            {recipients.slice(0, 10).map((recipient) => (
              <button
                key={recipient.userId}
                onClick={() => {
                  setSelectedRecipients(new Set([recipient.userId]));
                  setShowCompose(true);
                  setShowMobileFilters(false);
                }}
                title={recipient.fullName}
                className="group flex flex-col items-center gap-1 active:scale-95 transition"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#00507D] to-[#007A70] text-xs font-bold text-white ring-2 ring-white shadow-xs group-hover:scale-105 transition-all">
                  {initials(recipient.fullName)}
                </div>
                <span className="max-w-[40px] truncate text-center text-[9px] leading-tight text-slate-600">
                  {recipient.fullName.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  const middlePanel = (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm sm:rounded-[24px] lg:border-white lg:shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
      {/* Search and Filter Area */}
      <div className="border-b border-slate-100 p-3 sm:p-4 bg-white">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search students, parents, or messages..."
            className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-9 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#007A70] focus:bg-white focus:ring-4 focus:ring-[#7BE4D4]/25"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {/* Filter Pills */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {categories.map((item) => {
            const isActive = category === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setCategory(item.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                  isActive
                    ? 'bg-[#007A70] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Student Avatars Strip on Mobile */}
        {recipients.length > 0 && !search && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 sm:hidden">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Quick Message</p>
            <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
              {recipients.slice(0, 10).map((recipient) => (
                <button
                  key={recipient.userId}
                  type="button"
                  onClick={() => {
                    setSelectedRecipients(new Set([recipient.userId]));
                    setShowCompose(true);
                  }}
                  className="group flex flex-col items-center gap-1 shrink-0 active:scale-95 transition"
                  title={`Message ${recipient.fullName}`}
                >
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#00507D] to-[#007A70] text-xs font-extrabold text-white shadow-xs">
                    {initials(recipient.fullName)}
                  </div>
                  <span className="max-w-[48px] truncate text-[10px] font-medium text-slate-600">
                    {recipient.fullName.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {authError ? (
        <div className="m-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {authError}
        </div>
      ) : null}

      {/* Conversation List Rows (Clean WhatsApp / iOS style) */}
      <div className="divide-y divide-slate-100 lg:max-h-[calc(75vh-160px)] lg:overflow-y-auto">
        {filteredConversations.map((conversation) => {
          const isSelected = activeId === conversation.personId;
          const personClass = recipientClassNameMap.get(conversation.personId);
          return (
            <button
              key={conversation.personId}
              type="button"
              onClick={() => {
                setActiveId(conversation.personId);
                setShowMobileFilters(false);
              }}
              className={`w-full p-3 sm:p-3.5 text-left transition flex items-start gap-3 active:bg-slate-100 ${
                isSelected
                  ? 'bg-[#F0FDF4]/80 border-l-4 border-l-[#007A70]'
                  : 'hover:bg-slate-50/80'
              }`}
            >
              {/* Avatar with unread indicator */}
              <div className="relative shrink-0">
                <div className="grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-full bg-gradient-to-br from-[#E6F4F2] to-[#D0ECE7] text-sm font-black text-[#00507D] shadow-xs">
                  {initials(conversation.personName)}
                </div>
                {conversation.unreadCount > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#007A70]" />
                ) : null}
              </div>

              {/* Text content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <p className="truncate text-sm font-bold text-slate-900">{conversation.personName}</p>
                  <span className="shrink-0 text-[11px] font-medium text-slate-400" suppressHydrationWarning>
                    {mounted ? formatTime(conversation.latestAt) : ''}
                  </span>
                </div>

                {personClass ? (
                  <p className="truncate text-[10px] font-semibold text-[#007A70] mt-0.5">
                    {personClass}
                  </p>
                ) : null}

                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className={`truncate text-xs leading-relaxed ${conversation.unreadCount > 0 ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                    {conversation.latestPreview}
                  </p>
                  {conversation.unreadCount > 0 ? (
                    <span className="shrink-0 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#007A70] px-1.5 text-[10px] font-extrabold text-white">
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}

        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-[#00507D]">
              <MessageSquarePlus className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">No conversations found</h4>
            <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
              {search ? 'No messages match your search. Try a different keyword.' : 'Start a new message to chat with students or administrators.'}
            </p>
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#007A70] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#005a53] transition active:scale-95"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              New Message
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  const rightPanel = (
    <div className="flex h-[calc(100dvh-135px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-white bg-white shadow-sm sm:rounded-[24px] lg:h-[75vh]">
      {activeConversation ? (
        <>
          <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-[#E5EAF0] bg-white px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3 shadow-xs">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0F4F8] text-[#00507D] hover:bg-[#E2E8F0] active:scale-95 transition lg:hidden"
                aria-label="Back to conversations"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#7BE4D4] text-xs font-black text-[#006A61]">
                {initials(activeConversation.personName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black leading-tight text-[#00507D] sm:text-lg">{activeConversation.personName}</p>
                <p className="truncate text-xs text-[#64748B]">{recipientClassNameMap.get(activeConversation.personId) ?? 'Student'}</p>
              </div>
            </div>

            <div className="relative flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowChatMenu((prev) => !prev)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#EFE8DE] text-[#64748B] hover:bg-[#F8FAFB] transition"
                aria-label="Chat options"
              >
                <EllipsisVertical className="h-4 w-4" />
              </button>

              {showChatMenu ? (
                <div className="absolute right-0 top-11 z-30 w-44 rounded-xl border border-[#e2e8f0] bg-white p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatMenu(false);
                      setShowDeleteChatConfirm(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-[#dc2626] hover:bg-[#fef2f2] transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Entire Chat</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex-1 min-h-0 space-y-3 overflow-y-auto overscroll-contain bg-[#F4F7F8] p-3 sm:p-4">
            {activeConversation.messages.map((message) => {
              const isOutgoing = message.direction === 'out';
              const canDelete = !message.pending && !message.id.startsWith('tmp-');
              return (
                <div key={message.id} className={`flex items-end gap-1.5 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                  {/* Delete button for outgoing message */}
                  {isOutgoing && canDelete ? (
                    <button
                      type="button"
                      onClick={() => setMessageToDelete({ id: message.id, direction: 'out' })}
                      className="mb-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition active:scale-95"
                      title="Delete message"
                      aria-label="Delete message"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}

                  <div
                    className={`relative max-w-[84%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-xs ${
                      isOutgoing
                        ? 'rounded-br-xs bg-[#084750] text-white shadow-[0_6px_16px_rgba(8,71,80,0.18)]'
                        : 'rounded-bl-xs border border-[#E2E8F0] bg-white text-[#111827]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isOutgoing ? 'text-white/70' : 'text-[#64748B]'}`}>
                      <span suppressHydrationWarning>{mounted ? formatTime(message.createdAt) : ''}</span>
                      {isOutgoing && !message.pending ? <span className="font-bold">✓✓</span> : null}
                      {message.pending ? <span>· Sending...</span> : null}
                    </div>
                  </div>

                  {/* Delete button for incoming message */}
                  {!isOutgoing && canDelete ? (
                    <button
                      type="button"
                      onClick={() => setMessageToDelete({ id: message.id, direction: 'in' })}
                      className="mb-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition active:scale-95"
                      title="Delete message"
                      aria-label="Delete message"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          <div className="sticky bottom-0 shrink-0 border-t border-[#E5EAF0] bg-white/95 p-2.5 sm:p-3 backdrop-blur">
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
                placeholder={`Message ${activeConversation.personName.split(' ')[0]}...`}
                className="h-11 sm:h-12 flex-1 rounded-full border border-[#CBD5E1] bg-[#F8FAFC] px-4 text-sm text-[#111827] outline-none focus:border-[#007A70] focus:bg-white focus:ring-4 focus:ring-[#7BE4D4]/25 transition"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isSending || draft.trim().length < 1}
                className="inline-flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-[#084750] text-white shadow-md hover:bg-[#06353C] disabled:cursor-not-allowed disabled:opacity-40 transition active:scale-95"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="grid flex-1 place-items-center bg-[#F8F6F3] p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EEF8F7]">
              <MessageSquarePlus className="h-9 w-9 text-[#004D47]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Select a conversation</h3>
              <p className="mt-1 text-sm text-[#64748B]">Tap any chat to open messages.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`-mx-4 -my-6 min-h-screen space-y-3 overflow-x-hidden bg-[#F8F6F3] px-3 py-3 sm:-mx-6 sm:px-6 sm:py-5 lg:-mx-8 lg:px-8 ${activeConversation ? 'pb-2 sm:pb-32' : 'pb-28'}`}>
      {/* Mobile Top App Bar (Sleek, Modern WhatsApp/iOS style) */}
      <div className={`overflow-hidden rounded-2xl border border-white/80 bg-white p-3.5 shadow-sm sm:p-4 lg:hidden ${activeConversation ? 'hidden' : 'block'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-[#00507D]">Messages</h1>
              {totalUnreadCount > 0 ? (
                <span className="inline-flex items-center rounded-full bg-[#007A70] px-2 py-0.5 text-[11px] font-extrabold text-white">
                  {totalUnreadCount} new
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-400">
                  ({visibleConversations.length})
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Student & staff communications</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowMobileFilters((prev) => !prev)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition active:scale-95 ${
                showMobileFilters
                  ? 'border-[#007A70] bg-[#E6F4F2] text-[#007A70]'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
              title="Filters & Categories"
              aria-label="Filter chats"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#007A70] text-white shadow-sm hover:bg-[#005a53] transition active:scale-95"
              title="New Message"
              aria-label="New message"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Banner Header */}
      <div className="hidden lg:block overflow-hidden rounded-[24px] border border-white/80 bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#007A70]">Manarah Institute</p>
            <h2 className="mt-1.5 text-3xl font-black tracking-[-0.03em] text-[#00507D]">Communications Hub</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#64748B]">
              Direct communication for classroom announcements, student inquiries, and administration updates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCompose(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#084750] px-4 py-2.5 text-xs font-black text-white shadow-[0_10px_22px_rgba(8,71,80,0.22)] transition-all hover:bg-[#06353C] active:scale-[0.98]"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New Message
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[250px_380px_minmax(0,1fr)]">
        <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block`}>{leftPanel}</div>
        <div className={`${activeConversation ? 'hidden lg:block' : 'block'}`}>{middlePanel}</div>
        <div className={`${activeConversation ? 'block' : 'hidden lg:block'}`}>{rightPanel}</div>
      </div>

      {!activeConversation ? (
        <button
          type="button"
          onClick={() => setShowCompose(true)}
          className="fixed bottom-24 right-5 z-40 inline-flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#00507D] to-[#007A70] text-white shadow-[0_10px_25px_rgba(0,80,125,0.35)] hover:shadow-xl transition active:scale-95 lg:hidden"
          aria-label="Compose new message"
          title="New Message"
        >
          <MessageSquarePlus className="h-6 w-6" />
        </button>
      ) : null}

      {showCompose ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-0 sm:items-center sm:pb-0">
          <div className="max-h-[88vh] w-full max-w-md overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[24px]">
            <div className="flex items-center justify-between border-b border-[#E5EAF0] px-6 py-5">
              <h3 className="text-base font-medium text-[#111827]">New Message</h3>
              <button
                onClick={() => setShowCompose(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#4B5563] hover:bg-[#F3F6F8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(88vh-88px)] space-y-6 overflow-y-auto px-6 py-6 pb-24">
              <div className="min-w-0">
                <label className="mb-2 block text-sm font-medium uppercase tracking-[0.16em] text-[#8A94A3]">
                  To - {selectedRecipients.size > 0 ? `${selectedRecipients.size} selected` : 'Select Recipients (Admin or Students)'}
                </label>
                <div className="mb-3">
                  <div className="flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs">
                    <Search className="h-3.5 w-3.5 text-[#64748B]" />
                    <input
                      value={composeSearch}
                      onChange={(e) => setComposeSearch(e.target.value)}
                      placeholder="Search admin or student..."
                      className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94A3B8]"
                    />
                  </div>
                </div>
                {filteredRecipients.length === 0 ? (
                  <p className="text-sm leading-snug text-[#64748B]">No recipients found.</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {filteredRecipients.map((recipient) => {
                      const checked = selectedRecipients.has(recipient.userId);
                      return (
                        <label
                          key={recipient.userId}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl p-2 transition-colors ${
                            checked ? 'bg-[#F0FCFA] border border-[#7BE4D4]' : 'hover:bg-[#F4F7F8] border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRecipient(recipient.userId)}
                            className="h-4 w-4 rounded border-[#94A3B8] accent-[#00507D]"
                          />
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${checked ? 'bg-[#BFE3FF] text-[#00507D]' : 'bg-[#7BE4D4] text-[#006A61]'}`}>
                            {initials(recipient.fullName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#111827]">{recipient.fullName}</p>
                            <p className="truncate text-xs text-[#8A94A3]">{recipient.className}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium uppercase tracking-[0.16em] text-[#8A94A3]">Subject</label>
                <input
                  value={composeSubject}
                  onChange={(event) => setComposeSubject(event.target.value)}
                  placeholder="e.g. Assignment Reminder / Query for Admin"
                  className="h-12 w-full rounded-xl border border-[#CBD5E1] bg-white px-4 text-base text-[#111827] outline-none focus:border-[#007A70] focus:ring-4 focus:ring-[#7BE4D4]/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium uppercase tracking-[0.16em] text-[#8A94A3]">Message</label>
                <textarea
                  value={composeBody}
                  onChange={(event) => setComposeBody(event.target.value)}
                  rows={4}
                  placeholder="Write your message..."
                  className="w-full resize-none rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-base text-[#111827] outline-none focus:border-[#007A70] focus:ring-4 focus:ring-[#7BE4D4]/25"
                />
              </div>

              <button
                onClick={() => void handleComposeSend()}
                disabled={selectedRecipients.size === 0 || !composeBody.trim() || isComposeSending}
                className="fixed inset-x-6 bottom-5 z-10 mx-auto flex max-w-[390px] items-center justify-center gap-3 rounded-2xl bg-[#084750] py-4 text-base font-black text-white shadow-[0_16px_28px_rgba(8,71,80,0.28)] disabled:cursor-not-allowed disabled:opacity-50 sm:static sm:max-w-none"
              >
                <Send className="h-4 w-4" />
                {isComposeSending
                  ? 'Sending...'
                  : selectedRecipients.size > 0
                    ? `Send to ${selectedRecipients.size} recipient${selectedRecipients.size > 1 ? 's' : ''}`
                    : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Individual Message Delete Confirmation Modal */}
      {messageToDelete ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Message?</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Are you sure you want to delete this message? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                disabled={isDeletingMessage}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeleteMessage()}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50"
                disabled={isDeletingMessage}
              >
                {isDeletingMessage ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteChatConfirm && activeConversation ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-4 pb-4 sm:items-center sm:pb-0">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-base font-bold text-[#1a2b3d]">Delete Chat</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#607080]">
              Are you sure you want to delete this chat? This action cannot be undone.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteChatConfirm(false)}
                className="rounded-xl border border-[#d7e2ea] px-4 py-2 text-sm font-semibold text-[#3d5568] hover:bg-[#f8fafc]"
                disabled={isDeletingChat}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeleteChat()}
                className="inline-flex min-w-[112px] items-center justify-center rounded-xl bg-[#dc2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeletingChat}
              >
                {isDeletingChat ? 'Deleting...' : 'Delete Chat'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {chatDeleteToast ? (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-[#0f172a] px-4 py-2 text-sm font-medium text-white shadow-lg">
          {chatDeleteToast}
        </div>
      ) : null}
    </div>
  );
}
