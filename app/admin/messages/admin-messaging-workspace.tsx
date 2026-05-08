'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleDot,
  Trash2,
  MessageSquarePlus,
  Paperclip,
  Search,
  SendHorizontal,
  Smile,
  Tag,
  UserRound,
  Users,
  GraduationCap,
  School
} from 'lucide-react';

type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
type TabKey = 'messages' | 'compose';
type ComposeMode = 'individual_student' | 'class' | 'announcement';

type StudentOption = {
  user: { id: string; fullName: string };
  class: { name: string; section: string } | null;
};

type ClassOption = {
  id: string;
  name: string;
  section: string;
};

type RecipientUser = {
  id: string;
  fullName: string;
  role: Role;
};

type SentMessage = {
  id: string;
  subject: string;
  body: string;
  createdAt: string;
  recipients: Array<{
    isRead: boolean;
    user: RecipientUser;
  }>;
};

type ReceivedMessage = {
  id: string;
  isRead: boolean;
  readAt: string | null;
  message: {
    id: string;
    subject: string;
    body: string;
    createdAt: string;
    sender: RecipientUser;
  };
};

type ChatMessage = {
  id: string;
  subject: string;
  body: string;
  createdAt: string;
  direction: 'in' | 'out';
  status?: 'Sent' | 'Delivered' | 'Read';
  pending?: boolean;
};

type Conversation = {
  participantId: string;
  participantName: string;
  participantRole: Role;
  unreadCount: number;
  latestAt: string;
  latestPreview: string;
  messages: ChatMessage[];
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
  if (diff < 60_000) return 'Now';
  if (diff < 86_400_000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172_800_000) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function messageStatus(readFlags: boolean[]): 'Sent' | 'Delivered' | 'Read' {
  if (!readFlags.length) return 'Sent';
  if (readFlags.every(Boolean)) return 'Read';
  if (readFlags.some(Boolean)) return 'Delivered';
  return 'Sent';
}

function buildConversations(receivedMessages: ReceivedMessage[], sentMessages: SentMessage[], localOutgoing: Record<string, ChatMessage[]>) {
  const grouped = new Map<string, Conversation>();

  for (const row of receivedMessages) {
    const sender = row.message.sender;
    const msg: ChatMessage = {
      id: row.message.id,
      subject: row.message.subject,
      body: row.message.body,
      createdAt: row.message.createdAt,
      direction: 'in'
    };

    const current = grouped.get(sender.id);
    if (!current) {
      grouped.set(sender.id, {
        participantId: sender.id,
        participantName: sender.fullName,
        participantRole: sender.role,
        unreadCount: row.isRead ? 0 : 1,
        latestAt: row.message.createdAt,
        latestPreview: row.message.body,
        messages: [msg]
      });
      continue;
    }

    current.messages.push(msg);
    if (!row.isRead) current.unreadCount += 1;
    if (new Date(row.message.createdAt).getTime() > new Date(current.latestAt).getTime()) {
      current.latestAt = row.message.createdAt;
      current.latestPreview = row.message.body;
    }
  }

  for (const message of sentMessages) {
    for (const recipient of message.recipients) {
      const to = recipient.user;
      const msg: ChatMessage = {
        id: `${message.id}-${to.id}`,
        subject: message.subject,
        body: message.body,
        createdAt: message.createdAt,
        direction: 'out',
        status: messageStatus([recipient.isRead])
      };

      const current = grouped.get(to.id);
      if (!current) {
        grouped.set(to.id, {
          participantId: to.id,
          participantName: to.fullName,
          participantRole: to.role,
          unreadCount: 0,
          latestAt: message.createdAt,
          latestPreview: message.body,
          messages: [msg]
        });
        continue;
      }

      current.messages.push(msg);
      if (new Date(message.createdAt).getTime() > new Date(current.latestAt).getTime()) {
        current.latestAt = message.createdAt;
        current.latestPreview = message.body;
      }
    }
  }

  for (const [participantId, list] of Object.entries(localOutgoing)) {
    const current = grouped.get(participantId);
    if (!current) continue;
    current.messages.push(...list);

    const latestLocal = list.reduce((acc, msg) => {
      if (!acc) return msg;
      return new Date(msg.createdAt).getTime() > new Date(acc.createdAt).getTime() ? msg : acc;
    }, null as ChatMessage | null);

    if (latestLocal && new Date(latestLocal.createdAt).getTime() > new Date(current.latestAt).getTime()) {
      current.latestAt = latestLocal.createdAt;
      current.latestPreview = latestLocal.body;
    }
  }

  return Array.from(grouped.values())
    .map((conversation) => ({
      ...conversation,
      messages: conversation.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }))
    .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

export default function AdminMessagingWorkspace({
  students,
  classes,
  receivedMessages,
  sentMessages,
  presetRecipientId,
  composeAction
}: {
  students: StudentOption[];
  classes: ClassOption[];
  receivedMessages: ReceivedMessage[];
  sentMessages: SentMessage[];
  presetRecipientId: string;
  composeAction: (formData: FormData) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('messages');
  const [receivedState, setReceivedState] = useState(receivedMessages);
  const [sentState, setSentState] = useState(sentMessages);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [localOutgoing, setLocalOutgoing] = useState<Record<string, ChatMessage[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(presetRecipientId || null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [composeMode, setComposeMode] = useState<ComposeMode>('individual_student');
  const [studentQuery, setStudentQuery] = useState('');
  const [studentRecipientId, setStudentRecipientId] = useState(presetRecipientId || '');
  const [classId, setClassId] = useState('');

  const conversations = useMemo(
    () => buildConversations(receivedState, sentState, localOutgoing),
    [receivedState, sentState, localOutgoing]
  );

  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      if (!search) return true;
      const haystack = `${conversation.participantName} ${conversation.latestPreview}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [conversations, search]);

  const activeConversation = filteredConversations.find((item) => item.participantId === activeConversationId) ?? null;

  const visibleStudents = useMemo(() => {
    if (!studentQuery) return students;
    return students.filter((student) => {
      const text = `${student.user.fullName} ${student.class?.name ?? ''} ${student.class?.section ?? ''}`.toLowerCase();
      return text.includes(studentQuery.toLowerCase());
    });
  }, [students, studentQuery]);

  const isTyping = draft.trim().length > 0;

  // Auto-scroll to latest message when active conversation messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages.length]);

  async function handleQuickSend() {
    if (!activeConversation || !draft.trim() || sending) return;

    const body = draft.trim();
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      subject: `Re: ${(activeConversation.messages.at(-1)?.subject ?? 'Message').replace(/^(re:\s*)+/i, '')}`,
      body,
      createdAt: new Date().toISOString(),
      direction: 'out',
      pending: true,
      status: 'Sent'
    };

    setLocalOutgoing((prev) => ({
      ...prev,
      [activeConversation.participantId]: [...(prev[activeConversation.participantId] ?? []), optimistic]
    }));
    setDraft('');
    setSending(true);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: optimistic.subject,
          body,
          recipientIds: [activeConversation.participantId]
        })
      });

      if (!response.ok) {
        setLocalOutgoing((prev) => ({
          ...prev,
          [activeConversation.participantId]: (prev[activeConversation.participantId] ?? []).filter((msg) => msg.id !== tempId)
        }));
        return;
      }

      setLocalOutgoing((prev) => ({
        ...prev,
        [activeConversation.participantId]: (prev[activeConversation.participantId] ?? []).map((msg) =>
          msg.id === tempId ? { ...msg, pending: false, status: 'Delivered' } : msg
        )
      }));
    } finally {
      setSending(false);
    }
  }

  const sentCards = sentState.map((message) => {
    const roles = Array.from(new Set(message.recipients.map((recipient) => recipient.user.role)));
    const type = roles.length === 1 ? roles[0] : 'MULTI';
    return {
      id: message.id,
      subject: message.subject,
      createdAt: message.createdAt,
      recipients: message.recipients.length,
      type
    };
  });

  async function handleDeleteSentMessage(messageId: string) {
    const ok = window.confirm('Delete this message permanently?');
    if (!ok) return;
    const response = await fetch(`/api/messages?id=${messageId}`, { method: 'DELETE' });
    if (!response.ok) return;
    setSentState((prev) => prev.filter((message) => message.id !== messageId));
  }

  async function handleDeleteReceivedMessage(messageId: string) {
    const ok = window.confirm('Delete this message?');
    if (!ok) return;
    const response = await fetch(`/api/messages?id=${messageId}`, { method: 'DELETE' });
    if (!response.ok) return;
    setReceivedState((prev) => prev.filter((item) => item.message.id !== messageId));
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-140px)] w-full min-w-0 max-w-full overflow-x-hidden rounded-3xl border border-[#d7e3df] bg-[#f3f7f6] p-1.5 shadow-[0_12px_30px_rgba(16,24,40,0.08)] sm:p-4 lg:p-5">
      <div className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#d7e3df] bg-white p-2 shadow-sm sm:mb-4">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition sm:text-sm ${
              activeTab === 'messages' ? 'bg-[#004649] text-white shadow-sm' : 'text-[#4b5563] hover:bg-[#f3f7f6]'
            }`}
          >
            Messages
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition sm:text-sm ${
              activeTab === 'compose' ? 'bg-[#004649] text-white shadow-sm' : 'text-[#4b5563] hover:bg-[#f3f7f6]'
            }`}
          >
            Compose
          </button>
        </div>
        {activeTab === 'messages' ? (
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className="inline-flex w-full basis-full items-center justify-center gap-2 rounded-xl bg-[#004649] px-3 py-2 text-xs font-semibold text-white hover:bg-[#005a5e] sm:w-auto sm:basis-auto"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New Message
          </button>
        ) : null}
      </div>

      {activeTab === 'messages' ? (
        <div className="grid h-[calc(100dvh-230px)] w-full min-w-0 gap-3 sm:h-[calc(100dvh-240px)] lg:h-[calc(100vh-255px)] lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className={`${activeConversation ? 'hidden lg:flex' : 'flex'} w-full min-h-0 min-w-0 flex-col rounded-2xl border border-[#d7e3df] bg-white shadow-sm`}>
            <div className="border-b border-[#e4ece9] p-3">
              <label className="flex items-center gap-2 rounded-xl border border-[#d7e3df] bg-[#f7fbfa] px-3 py-2.5">
                <Search className="h-4 w-4 text-[#6b7280]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search conversations"
                  className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] sm:text-sm"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-2">
              {filteredConversations.length === 0 ? (
                <div className="mt-10 rounded-2xl border border-dashed border-[#c6d4cf] bg-[#f7fbfa] p-5 text-center">
                  <p className="text-sm font-semibold text-[#1f2937]">No conversations</p>
                  <p className="mt-1 text-xs text-[#6b7280]">Try another search or send a new message.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => {
                    const active = conversation.participantId === activeConversation?.participantId;
                    return (
                      <button
                        key={conversation.participantId}
                        type="button"
                        onClick={() => setActiveConversationId(conversation.participantId)}
                        className={`w-full max-w-full min-w-0 overflow-hidden rounded-xl border p-3.5 text-left transition ${
                          active
                            ? 'border-[#93c5fd] bg-[#eff6ff] shadow-sm'
                            : 'border-transparent bg-transparent hover:border-[#d7e3df] hover:bg-[#f7fbfa]'
                        }`}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e6f4f1] text-sm font-bold text-[#004649]">
                            {initials(conversation.participantName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center justify-between gap-2">
                              <p className="truncate text-[15px] font-bold leading-5 text-[#111827] sm:text-sm">{conversation.participantName}</p>
                              <p className="shrink-0 text-xs text-[#6b7280]">{formatTime(conversation.latestAt)}</p>
                            </div>
                            <p className="mt-0.5 max-w-full truncate text-[13px] leading-5 text-[#6b7280] sm:text-xs">{conversation.latestPreview}</p>
                            <div className="mt-1 flex items-center justify-end">
                              {conversation.unreadCount > 0 ? <CircleDot className="h-4 w-4 text-[#004649]" /> : null}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className={`${activeConversation ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d7e3df] bg-white shadow-sm`}>
            {activeConversation ? (
              <>
                <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-[#e4ece9] bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveConversationId(null)}
                      className="rounded-xl border border-[#d7e3df] px-2 py-1 text-xs text-[#475569] lg:hidden"
                    >
                      Back
                    </button>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e6f4f1] text-sm font-bold text-[#004649]">
                      {initials(activeConversation.participantName)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#111827]">{activeConversation.participantName}</p>
                      <p className="text-xs text-[#6b7280]">{activeConversation.participantRole}</p>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#f8fbfb] p-3 sm:p-4">
                  {activeConversation.messages.map((message) => {
                    const incoming = message.direction === 'in';
                    return (
                      <div key={message.id} className={`flex ${incoming ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className={`max-w-[88%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[80%] ${
                            incoming
                              ? 'rounded-bl-sm bg-white text-[#1f2937]'
                              : 'rounded-br-sm bg-[#004649] text-white'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.body}</p>
                          <div className={`mt-1 flex items-center justify-between gap-2 text-[10px] ${incoming ? 'text-[#6b7280]' : 'text-white/80'}`}>
                            <span>{formatTime(message.createdAt)}</span>
                            <button
                              type="button"
                              onClick={() => void (incoming ? handleDeleteReceivedMessage(message.id) : handleDeleteSentMessage(message.id.includes('-') ? message.id.split('-')[0] : message.id))}
                              className={`inline-flex items-center gap-1 rounded px-1 py-0.5 ${incoming ? 'text-[#9ca3af] hover:text-[#b91c1c]' : 'text-white/60 hover:text-white'}`}
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div ref={chatBottomRef} />
                <div className="shrink-0 border-t border-[#e4ece9] bg-white p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          void handleQuickSend();
                        }
                      }}
                      placeholder="Write a message"
                      className="h-11 flex-1 rounded-xl border border-[#d7e3df] bg-[#f7fbfa] px-3 text-sm outline-none focus:border-[#004649]"
                    />
                    <button
                      type="button"
                      onClick={() => void handleQuickSend()}
                      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#004649] px-3 text-sm font-semibold text-white hover:bg-[#005a5e] sm:px-4"
                    >
                      <SendHorizontal className="h-4 w-4" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-3 rounded-full bg-[#e6f4f1] p-4 text-[#004649]">
                  <MessageSquarePlus className="h-6 w-6" />
                </div>
                <p className="text-base font-semibold text-[#111827]">Select a conversation</p>
                <p className="mt-1 text-sm text-[#6b7280]">Open any chat from the left to see full history and reply.</p>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          <section className="overflow-hidden rounded-2xl border border-[#cfe1db] bg-white shadow-[0_12px_32px_rgba(2,6,23,0.08)]">
            <div className="border-b border-[#deebe7] bg-gradient-to-r from-[#eff9f6] to-[#f8fbff] p-4 sm:p-5">
              <h3 className="text-xl font-bold tracking-tight text-[#0f172a]">Compose Message</h3>
              <p className="mt-1 text-sm text-[#64748b]">Send clear updates to one student, class, or all students.</p>
            </div>

            <form action={composeAction} className="space-y-5 p-4 sm:p-5">
              <div className="rounded-2xl border border-[#deebe7] bg-[#fbfefe] p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#475569]">Subject</label>
                <div className="flex items-center gap-2 rounded-xl border border-[#d1e2dc] bg-white px-3 shadow-sm">
                  <Tag className="h-4 w-4 text-[#6b7280]" />
                  <input
                    name="subject"
                    required
                    placeholder="Fee reminder for April"
                    className="h-12 w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#deebe7] bg-[#fbfefe] p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#475569]">Recipient Type</label>
                <div className="grid gap-2 rounded-2xl bg-[#f1f5f9] p-2 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setComposeMode('individual_student')}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      composeMode === 'individual_student'
                        ? 'border-[#004649] bg-[#e8f5f0] text-[#004649] shadow-sm'
                        : 'border-transparent bg-white text-[#334155] hover:border-[#d7e3df]'
                    }`}
                  >
                    <UserRound className="h-4 w-4" />
                    Individual Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposeMode('class')}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      composeMode === 'class'
                        ? 'border-[#004649] bg-[#e8f5f0] text-[#004649] shadow-sm'
                        : 'border-transparent bg-white text-[#334155] hover:border-[#d7e3df]'
                    }`}
                  >
                    <School className="h-4 w-4" />
                    Class
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposeMode('announcement')}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      composeMode === 'announcement'
                        ? 'border-[#004649] bg-[#e8f5f0] text-[#004649] shadow-sm'
                        : 'border-transparent bg-white text-[#334155] hover:border-[#d7e3df]'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    All Students
                  </button>
                </div>
                <input type="hidden" name="targetMode" value={composeMode} />
              </div>

              {composeMode === 'individual_student' ? (
                <div className="rounded-2xl border border-[#deebe7] bg-[#fbfefe] p-4">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#475569]">Select Student</label>
                  <div className="space-y-2 rounded-xl border border-[#d7e3df] bg-[#f7fbfa] p-3">
                    <label className="flex items-center gap-2 rounded-xl border border-[#d7e3df] bg-white px-3 py-2.5">
                      <Search className="h-4 w-4 text-[#6b7280]" />
                      <input
                        value={studentQuery}
                        onChange={(event) => setStudentQuery(event.target.value)}
                        placeholder="Search by student or class"
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    </label>

                    <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                      {visibleStudents.map((student) => {
                        const active = studentRecipientId === student.user.id;
                        return (
                          <button
                            key={student.user.id}
                            type="button"
                            onClick={() => setStudentRecipientId(student.user.id)}
                            className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                              active
                                ? 'border-[#004649] bg-[#e8f5f0]'
                                : 'border-transparent bg-white hover:border-[#d7e3df]'
                            }`}
                          >
                            <p className="text-sm font-semibold text-[#111827]">{student.user.fullName}</p>
                            <p className="text-xs text-[#6b7280]">
                              {student.class ? `${student.class.name} - ${student.class.section}` : 'No class assigned'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <input type="hidden" name="studentRecipientId" value={studentRecipientId} />
                  <input type="hidden" name="teacherRecipientId" value="" />
                  <input type="hidden" name="classId" value="" />
                </div>
              ) : null}

              {composeMode === 'class' ? (
                <div className="rounded-2xl border border-[#deebe7] bg-[#fbfefe] p-4">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#475569]">Select Class</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {classes.map((item) => {
                      const active = classId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setClassId(item.id)}
                          className={`rounded-xl border p-3 text-left transition ${
                            active ? 'border-[#004649] bg-[#e8f5f0]' : 'border-[#d7e3df] bg-[#f7fbfa] hover:bg-white'
                          }`}
                        >
                          <p className="text-sm font-semibold text-[#111827]">
                            {item.name} - {item.section}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <input type="hidden" name="classId" value={classId} />
                  <input type="hidden" name="studentRecipientId" value="" />
                  <input type="hidden" name="teacherRecipientId" value="" />
                </div>
              ) : null}

              {composeMode === 'announcement' ? (
                <>
                  <input type="hidden" name="studentRecipientId" value="" />
                  <input type="hidden" name="teacherRecipientId" value="" />
                  <input type="hidden" name="classId" value="" />
                  <div className="rounded-xl border border-dashed border-[#7dcdb6] bg-[#e7f6f2] p-3 text-sm text-[#004649]">
                    This announcement will be sent to all active students.
                  </div>
                </>
              ) : null}

              <div className="rounded-2xl border border-[#deebe7] bg-[#fbfefe] p-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#475569]">Message</label>
                <textarea
                  name="body"
                  required
                  rows={8}
                  placeholder="Write a clear, polite and actionable message..."
                  className="w-full rounded-xl border border-[#d7e3df] bg-white p-3 text-sm text-[#111827] outline-none focus:border-[#004649]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#deebe7] bg-[#fbfefe] p-3">
                <div className="flex items-center gap-2">
                  <button type="button" className="inline-flex items-center gap-1 rounded-xl border border-[#d7e3df] bg-white px-3 py-1.5 text-xs text-[#475569] hover:bg-[#f3f4f5]">
                    <Smile className="h-4 w-4" />
                    Emoji
                  </button>
                  <button type="button" className="inline-flex items-center gap-1 rounded-xl border border-[#d7e3df] bg-white px-3 py-1.5 text-xs text-[#475569] hover:bg-[#f3f4f5]">
                    <Paperclip className="h-4 w-4" />
                    Attachment
                  </button>
                </div>

                <button className="inline-flex items-center gap-2 rounded-xl bg-[#004649] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#005a5e]">
                  <SendHorizontal className="h-4 w-4" />
                  Send Message
                </button>
              </div>
            </form>
          </section>

          <section className="h-fit rounded-2xl border border-[#d7e3df] bg-white p-4 shadow-sm sm:sticky sm:top-20 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#004649]" />
              <h4 className="text-base font-bold text-[#111827]">Sent Messages</h4>
            </div>
            <div className="space-y-2.5">
              {sentCards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#c6d4cf] bg-[#f7fbfa] p-4 text-center">
                  <p className="text-sm font-semibold text-[#111827]">No sent messages yet</p>
                  <p className="mt-1 text-xs text-[#6b7280]">Your sent cards will appear here.</p>
                </div>
              ) : (
                sentCards.map((card) => (
                  <article key={card.id} className="rounded-xl border border-[#d7e3df] bg-[#f8fbfb] p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-[#111827]">{card.subject}</p>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSentMessage(card.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#fecaca] text-[#b91c1c] hover:bg-[#fef2f2]"
                        aria-label="Delete message"
                        title="Delete message"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-[#475569]">
                      <span>{card.recipients} recipient(s)</span>
                      <span className="rounded-full bg-[#e8f5f0] px-2 py-0.5 font-semibold text-[#004649]">{card.type}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#6b7280]">{new Date(card.createdAt).toLocaleString('en-US')}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
