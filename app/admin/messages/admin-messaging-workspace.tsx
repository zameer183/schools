'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CircleDot,
  Trash2,
  MessageSquarePlus,
  Search,
  SendHorizontal,
  UserRound,
  Users,
  GraduationCap,
  School,
  CheckCircle2,
  Megaphone,
  UserCheck,
  Sparkles,
  BookOpen,
  Mail,
  ArrowLeft,
  X
} from 'lucide-react';

type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
type TabKey = 'messages' | 'compose';
type ComposeMode = 'individual_teacher' | 'all_teachers' | 'individual_student' | 'class' | 'announcement';
type ConvFilter = 'all' | 'teachers' | 'students' | 'unread';

export type TeacherOption = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  employeeCode: string;
  subjects: string[];
  classes: string[];
};

export type StudentOption = {
  id: string;
  userId: string;
  admissionNo: string;
  classId: string | null;
  fullName: string;
  className: string;
  section: string;
};

export type ClassOption = {
  id: string;
  name: string;
  section: string;
  studentCount?: number;
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
  participantDetail?: string;
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
  if (diff < 60_000) return 'Just now';
  if (diff < 86_400_000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172_800_000) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildConversations(
  receivedMessages: ReceivedMessage[],
  sentMessages: SentMessage[],
  localOutgoing: Record<string, ChatMessage[]>,
  recipientMeta: Map<string, { fullName: string; role: Role; detail?: string }>
) {
  const grouped = new Map<string, Conversation>();

  for (const row of receivedMessages) {
    const sender = row.message.sender;
    const meta = recipientMeta.get(sender.id);
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
        participantName: meta?.fullName ?? sender.fullName,
        participantRole: meta?.role ?? sender.role,
        participantDetail: meta?.detail,
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
      const meta = recipientMeta.get(to.id);
      const msg: ChatMessage = {
        id: message.id,
        subject: message.subject,
        body: message.body,
        createdAt: message.createdAt,
        direction: 'out',
        status: recipient.isRead ? 'Read' : 'Sent'
      };

      const current = grouped.get(to.id);
      if (!current) {
        grouped.set(to.id, {
          participantId: to.id,
          participantName: meta?.fullName ?? to.fullName,
          participantRole: meta?.role ?? to.role,
          participantDetail: meta?.detail,
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
    const latestLocal = list.reduce((acc, msg) => {
      if (!acc) return msg;
      return new Date(msg.createdAt).getTime() > new Date(acc.createdAt).getTime() ? msg : acc;
    }, null as ChatMessage | null);

    if (!latestLocal) continue;

    if (!current) {
      const meta = recipientMeta.get(participantId);
      grouped.set(participantId, {
        participantId,
        participantName: meta?.fullName ?? 'User',
        participantRole: meta?.role ?? 'STUDENT',
        participantDetail: meta?.detail,
        unreadCount: 0,
        latestAt: latestLocal.createdAt,
        latestPreview: latestLocal.body,
        messages: [...list]
      });
      continue;
    }

    current.messages.push(...list);
    if (new Date(latestLocal.createdAt).getTime() > new Date(current.latestAt).getTime()) {
      current.latestAt = latestLocal.createdAt;
      current.latestPreview = latestLocal.body;
    }
  }

  return Array.from(grouped.values())
    .map((conversation) => ({
      ...conversation,
      messages: conversation.messages.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    }))
    .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

export default function AdminMessagingWorkspace({
  classes,
  teachers,
  students,
  receivedMessages,
  sentMessages,
  presetRecipientId,
  page
}: {
  classes: ClassOption[];
  teachers: TeacherOption[];
  students: StudentOption[];
  receivedMessages: ReceivedMessage[];
  sentMessages: SentMessage[];
  presetRecipientId: string;
  page?: number;
}) {
  const currentPage = page || 1;
  const [activeTab, setActiveTab] = useState<TabKey>(presetRecipientId ? 'messages' : 'messages');
  const [receivedState, setReceivedState] = useState(receivedMessages);
  const [sentState, setSentState] = useState(sentMessages);
  const [localOutgoing, setLocalOutgoing] = useState<Record<string, ChatMessage[]>>({});

  // Search & Filter in Conversations
  const [convSearch, setConvSearch] = useState('');
  const [convFilter, setConvFilter] = useState<ConvFilter>('all');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(presetRecipientId || null);

  // Chat window state
  const [chatDraft, setChatDraft] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<{ id: string; direction: 'in' | 'out' } | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Compose State
  const [composeMode, setComposeMode] = useState<ComposeMode>('individual_teacher');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedTeacherUserId, setSelectedTeacherUserId] = useState('');

  const [studentClassFilter, setStudentClassFilter] = useState('ALL');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentUserId, setSelectedStudentUserId] = useState(
    presetRecipientId && students.some((s) => s.userId === presetRecipientId) ? presetRecipientId : ''
  );

  const [selectedClassId, setSelectedClassId] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [composeSuccess, setComposeSuccess] = useState('');

  // Auto-mark conversation as read when active conversation changes
  useEffect(() => {
    if (!activeConversationId) return;

    setReceivedState((prev) =>
      prev.map((row) =>
        row.message.sender.id === activeConversationId ? { ...row, isRead: true } : row
      )
    );

    void fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: activeConversationId })
    });
  }, [activeConversationId]);

  // Recipient Metadata for fast lookups
  const recipientMetaMap = useMemo(() => {
    const map = new Map<string, { fullName: string; role: Role; detail?: string }>();
    for (const teacher of teachers) {
      map.set(teacher.userId, {
        fullName: teacher.fullName,
        role: 'TEACHER',
        detail: teacher.subjects.length > 0 ? teacher.subjects.join(', ') : teacher.email
      });
    }
    for (const student of students) {
      map.set(student.userId, {
        fullName: student.fullName,
        role: 'STUDENT',
        detail: `${student.className} • Reg ${student.admissionNo}`
      });
    }
    return map;
  }, [teachers, students]);

  // Build unified conversation threads
  const conversations = useMemo(
    () => buildConversations(receivedState, sentState, localOutgoing, recipientMetaMap),
    [receivedState, sentState, localOutgoing, recipientMetaMap]
  );

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      // Role & Read filter
      if (convFilter === 'teachers' && conv.participantRole !== 'TEACHER') return false;
      if (convFilter === 'students' && conv.participantRole !== 'STUDENT') return false;
      if (convFilter === 'unread' && conv.unreadCount === 0) return false;

      // Text search
      if (!convSearch.trim()) return true;
      const haystack = `${conv.participantName} ${conv.participantRole} ${conv.participantDetail ?? ''} ${conv.latestPreview}`.toLowerCase();
      return haystack.includes(convSearch.toLowerCase());
    });
  }, [conversations, convFilter, convSearch]);

  // Counts for conversation tabs
  const convCounts = useMemo(() => {
    let teacherCount = 0;
    let studentCount = 0;
    let unreadCount = 0;
    for (const c of conversations) {
      if (c.participantRole === 'TEACHER') teacherCount++;
      if (c.participantRole === 'STUDENT') studentCount++;
      if (c.unreadCount > 0) unreadCount++;
    }
    return {
      all: conversations.length,
      teachers: teacherCount,
      students: studentCount,
      unread: unreadCount
    };
  }, [conversations]);

  const activeConversation = filteredConversations.find((item) => item.participantId === activeConversationId)
    ?? conversations.find((item) => item.participantId === activeConversationId)
    ?? null;

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages.length]);

  // Filtered Teachers for Compose
  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return teachers;
    const q = teacherSearch.toLowerCase();
    return teachers.filter(
      (t) =>
        t.fullName.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.employeeCode.toLowerCase().includes(q) ||
        t.subjects.some((s) => s.toLowerCase().includes(q))
    );
  }, [teachers, teacherSearch]);

  // Filtered Students for Compose
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (studentClassFilter !== 'ALL' && s.classId !== studentClassFilter) {
        return false;
      }
      if (!studentSearch.trim()) return true;
      const q = studentSearch.toLowerCase();
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
      );
    });
  }, [students, studentClassFilter, studentSearch]);

  // Quick reply inside Chat
  async function handleQuickSend() {
    if (!activeConversation || !chatDraft.trim() || chatSending) return;

    const body = chatDraft.trim();
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
    setChatDraft('');
    setChatSending(true);

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

      const created = (await response.json().catch(() => null)) as { id?: string; createdAt?: string } | null;
      const createdId = created?.id ?? `sent-${Date.now()}`;
      const createdAt = created?.createdAt ?? new Date().toISOString();

      setLocalOutgoing((prev) => ({
        ...prev,
        [activeConversation.participantId]: (prev[activeConversation.participantId] ?? []).filter((msg) => msg.id !== tempId)
      }));

      setSentState((prev) => [
        {
          id: createdId,
          subject: optimistic.subject,
          body,
          createdAt,
          recipients: [
            {
              isRead: false,
              user: {
                id: activeConversation.participantId,
                fullName: activeConversation.participantName,
                role: activeConversation.participantRole
              }
            }
          ]
        },
        ...prev.filter((item) => item.id !== createdId)
      ]);
    } finally {
      setChatSending(false);
    }
  }

  // Handle Compose Form Submit
  async function handleComposeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setComposeError('');
    setComposeSuccess('');

    const subject = composeSubject.trim();
    const body = composeBody.trim();
    if (!subject) {
      setComposeError('Please enter a message subject.');
      return;
    }
    if (!body) {
      setComposeError('Please enter message content.');
      return;
    }

    let recipientIds: string[] = [];

    if (composeMode === 'individual_teacher') {
      if (!selectedTeacherUserId) {
        setComposeError('Please select a teacher recipient.');
        return;
      }
      recipientIds = [selectedTeacherUserId];
    } else if (composeMode === 'all_teachers') {
      recipientIds = teachers.map((t) => t.userId);
      if (recipientIds.length === 0) {
        setComposeError('No active teachers found to send to.');
        return;
      }
    } else if (composeMode === 'individual_student') {
      if (!selectedStudentUserId) {
        setComposeError('Please select a student recipient.');
        return;
      }
      recipientIds = [selectedStudentUserId];
    } else if (composeMode === 'class') {
      if (!selectedClassId) {
        setComposeError('Please select a class.');
        return;
      }
      recipientIds = students.filter((s) => s.classId === selectedClassId).map((s) => s.userId);
      if (recipientIds.length === 0) {
        setComposeError('No students found in the selected class.');
        return;
      }
    } else if (composeMode === 'announcement') {
      recipientIds = students.map((s) => s.userId);
      if (recipientIds.length === 0) {
        setComposeError('No active students found in the institute.');
        return;
      }
    }

    recipientIds = Array.from(new Set(recipientIds.filter(Boolean)));
    if (!recipientIds.length) {
      setComposeError('No valid recipients selected.');
      return;
    }

    setComposeSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, recipientIds })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
        setComposeError(typeof payload?.error === 'string' ? payload.error : 'Failed to send message.');
        return;
      }

      const created = (await response.json().catch(() => null)) as { id?: string; createdAt?: string } | null;
      const createdId = created?.id ?? `sent-${Date.now()}`;
      const createdAt = created?.createdAt ?? new Date().toISOString();

      setSentState((prev) => [
        {
          id: createdId,
          subject,
          body,
          createdAt,
          recipients: recipientIds.map((id) => {
            const meta = recipientMetaMap.get(id);
            return {
              isRead: false,
              user: {
                id,
                fullName: meta?.fullName ?? 'User',
                role: meta?.role ?? 'STUDENT'
              }
            };
          })
        },
        ...prev.filter((item) => item.id !== createdId)
      ]);

      setComposeSubject('');
      setComposeBody('');
      setComposeSuccess(`Message sent successfully to ${recipientIds.length} recipient${recipientIds.length > 1 ? 's' : ''}!`);

      // If sent to single individual, switch to conversation
      if ((composeMode === 'individual_teacher' || composeMode === 'individual_student') && recipientIds[0]) {
        setActiveConversationId(recipientIds[0]);
        setTimeout(() => setActiveTab('messages'), 400);
      }
    } finally {
      setComposeSending(false);
    }
  }

  // Delete Conversation
  async function handleDeleteEntireConversation(participantId: string) {
    if (isDeletingChat) return;
    const confirmed = window.confirm('Are you sure you want to delete this conversation? All messages in this chat will be removed.');
    if (!confirmed) return;

    setIsDeletingChat(true);
    try {
      const response = await fetch(`/api/messages?conversationWithUserId=${encodeURIComponent(participantId)}`, {
        method: 'DELETE'
      });
      if (!response.ok) return;

      // Filter out of sent and received state
      setReceivedState((prev) => prev.filter((item) => item.message.sender.id !== participantId));
      setSentState((prev) =>
        prev
          .map((message) => ({
            ...message,
            recipients: message.recipients.filter((r) => r.user.id !== participantId)
          }))
          .filter((message) => message.recipients.length > 0)
      );
      setLocalOutgoing((prev) => {
        const next = { ...prev };
        delete next[participantId];
        return next;
      });

      if (activeConversationId === participantId) {
        setActiveConversationId(null);
      }
    } finally {
      setIsDeletingChat(false);
    }
  }

  // Delete Individual Sent Message
  async function handleDeleteSentMessage(messageId: string) {
    setMessageToDelete({ id: messageId, direction: 'out' });
  }

  // Delete Individual Chat Message from active thread
  async function handleConfirmDeleteMessage() {
    if (!messageToDelete) return;
    const { id: rawMessageId, direction } = messageToDelete;
    if (!rawMessageId || rawMessageId.startsWith('tmp-')) {
      setMessageToDelete(null);
      return;
    }

    const messageId = rawMessageId.includes('-') && !rawMessageId.startsWith('sent-')
      ? rawMessageId.split('-')[0]
      : rawMessageId;

    setIsDeletingMessage(true);
    try {
      const response = await fetch(`/api/messages?id=${encodeURIComponent(messageId)}`, { method: 'DELETE' });
      if (!response.ok) return;

      if (direction === 'out') {
        setSentState((prev) => prev.filter((item) => item.id !== messageId && item.id !== rawMessageId));
        setLocalOutgoing((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            next[key] = next[key].filter((m) => m.id !== messageId && m.id !== rawMessageId);
          }
          return next;
        });
      } else {
        setReceivedState((prev) => prev.filter((item) => item.message.id !== messageId && item.id !== messageId && item.id !== rawMessageId));
      }
      setMessageToDelete(null);
    } finally {
      setIsDeletingMessage(false);
    }
  }

  // Selected teacher details
  const selectedTeacher = teachers.find((t) => t.userId === selectedTeacherUserId);
  // Selected student details
  const selectedStudent = students.find((s) => s.userId === selectedStudentUserId);

  return (
    <div className="mx-auto min-h-[calc(100vh-140px)] w-full min-w-0 max-w-full overflow-x-hidden rounded-3xl border border-[#d7e3df] bg-[#f3f7f6] p-2 shadow-[0_12px_30px_rgba(16,24,40,0.08)] sm:p-4 lg:p-6">
      {/* Top Header & Tab Controls */}
      <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d7e3df] bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              activeTab === 'messages'
                ? 'bg-[#1F5A5C] text-white shadow-sm'
                : 'text-[#4b5563] hover:bg-[#f3f7f6]'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Messages</span>
            {convCounts.unread > 0 ? (
              <span className="ml-1 rounded-full bg-[#e11d48] px-2 py-0.5 text-xs font-extrabold text-white">
                {convCounts.unread}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              activeTab === 'compose'
                ? 'bg-[#1F5A5C] text-white shadow-sm'
                : 'text-[#4b5563] hover:bg-[#f3f7f6]'
            }`}
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span>Compose</span>
          </button>
        </div>

        {activeTab === 'messages' ? (
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1F5A5C] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#005a5e] transition"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span>New Message</span>
          </button>
        ) : null}
      </div>

      {/* TAB 1: MESSAGES / CHAT VIEW */}
      {activeTab === 'messages' ? (
        <div className="grid h-[calc(100dvh-230px)] w-full min-w-0 gap-3 sm:h-[calc(100dvh-240px)] lg:h-[calc(100vh-250px)] lg:grid-cols-[380px_minmax(0,1fr)]">
          {/* Conversation List Sidebar */}
          <aside className={`${activeConversation ? 'hidden lg:flex' : 'flex'} w-full min-h-0 min-w-0 flex-col rounded-2xl border border-[#d7e3df] bg-white shadow-sm`}>
            {/* Search Box */}
            <div className="border-b border-[#e4ece9] p-3 space-y-2.5">
              <label className="flex items-center gap-2 rounded-xl border border-[#d7e3df] bg-[#f7fbfa] px-3 py-2">
                <Search className="h-4 w-4 text-[#6b7280]" />
                <input
                  value={convSearch}
                  onChange={(event) => setConvSearch(event.target.value)}
                  placeholder="Search conversations..."
                  className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
                />
              </label>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setConvFilter('all')}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                    convFilter === 'all'
                      ? 'bg-[#1F5A5C] text-white'
                      : 'bg-[#f0f4f3] text-[#4b5563] hover:bg-[#e4ecea]'
                  }`}
                >
                  All ({convCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setConvFilter('teachers')}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold transition ${
                    convFilter === 'teachers'
                      ? 'bg-[#1F5A5C] text-white'
                      : 'bg-[#f0f4f3] text-[#4b5563] hover:bg-[#e4ecea]'
                  }`}
                >
                  <GraduationCap className="h-3 w-3" />
                  Teachers ({convCounts.teachers})
                </button>
                <button
                  type="button"
                  onClick={() => setConvFilter('students')}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold transition ${
                    convFilter === 'students'
                      ? 'bg-[#1F5A5C] text-white'
                      : 'bg-[#f0f4f3] text-[#4b5563] hover:bg-[#e4ecea]'
                  }`}
                >
                  <UserRound className="h-3 w-3" />
                  Students ({convCounts.students})
                </button>
                <button
                  type="button"
                  onClick={() => setConvFilter('unread')}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                    convFilter === 'unread'
                      ? 'bg-[#e11d48] text-white'
                      : convCounts.unread > 0
                        ? 'bg-rose-50 text-rose-700 font-bold hover:bg-rose-100'
                        : 'bg-[#f0f4f3] text-[#4b5563] hover:bg-[#e4ecea]'
                  }`}
                >
                  Unread ({convCounts.unread})
                </button>
              </div>
            </div>

            {/* List */}
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-2">
              {filteredConversations.length === 0 ? (
                <div className="mt-12 rounded-2xl border border-dashed border-[#c6d4cf] bg-[#f7fbfa] p-6 text-center">
                  <p className="text-sm font-semibold text-[#1f2937]">No conversations found</p>
                  <p className="mt-1 text-xs text-[#6b7280]">Try another filter or click Compose to start a new chat.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredConversations.map((conversation) => {
                    const active = conversation.participantId === activeConversation?.participantId;
                    const isTeacher = conversation.participantRole === 'TEACHER';
                    return (
                      <button
                        key={conversation.participantId}
                        type="button"
                        onClick={() => setActiveConversationId(conversation.participantId)}
                        className={`w-full max-w-full min-w-0 overflow-hidden rounded-xl border p-3 text-left transition ${
                          active
                            ? 'border-[#1F5A5C] bg-[#eaf4f2] shadow-sm'
                            : 'border-transparent bg-transparent hover:border-[#d7e3df] hover:bg-[#f7fbfa]'
                        }`}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              isTeacher
                                ? 'bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0]'
                                : 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]'
                            }`}
                          >
                            {initials(conversation.participantName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center justify-between gap-1.5">
                              <p className="truncate text-sm font-bold text-[#111827]">{conversation.participantName}</p>
                              <span className="shrink-0 text-[11px] font-medium text-[#6b7280]">
                                {formatTime(conversation.latestAt)}
                              </span>
                            </div>

                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span
                                className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider ${
                                  isTeacher
                                    ? 'bg-[#ecfdf5] text-[#047857]'
                                    : 'bg-[#f0f9ff] text-[#0284c7]'
                                }`}
                              >
                                {isTeacher ? 'Teacher' : 'Student'}
                              </span>
                              {conversation.participantDetail ? (
                                <span className="truncate text-[11px] text-[#64748b]">
                                  {conversation.participantDetail}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-1 flex items-center justify-between gap-2">
                              <p className="truncate text-xs text-[#4b5563]">{conversation.latestPreview}</p>
                              {conversation.unreadCount > 0 ? (
                                <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#1F5A5C] px-1.5 text-[10px] font-extrabold text-white">
                                  {conversation.unreadCount}
                                </span>
                              ) : null}
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

          {/* Active Conversation Chat Window */}
          <section className={`${activeConversation ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d7e3df] bg-white shadow-sm`}>
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-[#e4ece9] bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveConversationId(null)}
                      className="rounded-xl border border-[#d7e3df] p-1.5 text-xs text-[#475569] hover:bg-[#f3f7f6] lg:hidden"
                      aria-label="Back to conversations list"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        activeConversation.participantRole === 'TEACHER'
                          ? 'bg-[#d1fae5] text-[#065f46]'
                          : 'bg-[#e0f2fe] text-[#0369a1]'
                      }`}
                    >
                      {initials(activeConversation.participantName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#111827]">{activeConversation.participantName}</p>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase ${
                            activeConversation.participantRole === 'TEACHER'
                              ? 'bg-[#ecfdf5] text-[#047857]'
                              : 'bg-[#f0f9ff] text-[#0284c7]'
                          }`}
                        >
                          {activeConversation.participantRole === 'TEACHER' ? 'Teacher' : 'Student'}
                        </span>
                      </div>
                      <p className="text-xs text-[#6b7280]">
                        {activeConversation.participantDetail ?? activeConversation.participantRole}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteEntireConversation(activeConversation.participantId)}
                      disabled={isDeletingChat}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#fecaca] px-3 py-1.5 text-xs font-semibold text-[#b91c1c] hover:bg-[#fef2f2] transition disabled:opacity-50"
                      title="Delete entire conversation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Delete Chat</span>
                    </button>
                  </div>
                </div>

                {/* Chat Messages Body */}
                <div className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#f8fbfb] p-3 sm:p-5">
                  {activeConversation.messages.map((message) => {
                    const incoming = message.direction === 'in';
                    const canDelete = !message.pending && !message.id.startsWith('tmp-');
                    return (
                      <div key={message.id} className={`flex items-end gap-1.5 ${incoming ? 'justify-start' : 'justify-end'}`}>
                        {/* Outgoing delete button (left of bubble) */}
                        {!incoming && canDelete ? (
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
                          className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${
                            incoming
                              ? 'border border-[#d7e3df] bg-white text-[#111827]'
                              : 'bg-[#1F5A5C] text-white'
                          }`}
                        >
                          {message.subject && !message.subject.startsWith('Re: ') ? (
                            <p className={`mb-1 text-xs font-bold ${incoming ? 'text-[#1F5A5C]' : 'text-[#a7f3d0]'}`}>
                              {message.subject}
                            </p>
                          ) : null}
                          <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">{message.body}</p>
                          <div
                            className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] ${
                              incoming ? 'text-[#9ca3af]' : 'text-[#cbece6]'
                            }`}
                          >
                            <span>{new Date(message.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            {!incoming ? <span>• {message.status ?? 'Sent'}</span> : null}
                          </div>
                        </div>

                        {/* Incoming delete button (right of bubble) */}
                        {incoming && canDelete ? (
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

                {/* Chat Reply Box */}
                <div className="border-t border-[#e4ece9] bg-white p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={chatDraft}
                      onChange={(e) => setChatDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleQuickSend();
                        }
                      }}
                      placeholder={`Reply to ${activeConversation.participantName}... (Press Enter)`}
                      className="flex-1 rounded-xl border border-[#d7e3df] bg-[#f8fbfb] px-4 py-2.5 text-sm text-[#111827] outline-none focus:border-[#1F5A5C] focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => void handleQuickSend()}
                      disabled={!chatDraft.trim() || chatSending}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#1F5A5C] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#005a5e] disabled:cursor-not-allowed disabled:opacity-50 transition"
                    >
                      <SendHorizontal className="h-4 w-4" />
                      <span>{chatSending ? 'Sending...' : 'Send'}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-[#6b7280]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f5f0] text-[#1F5A5C]">
                  <MessageSquarePlus className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827]">No Conversation Selected</h3>
                <p className="mt-1 max-w-sm text-sm text-[#6b7280]">
                  Select a conversation from the left to view messages or click Compose to send a new message.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('compose')}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1F5A5C] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#005a5e] transition"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  Compose New Message
                </button>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {/* TAB 2: COMPOSE NEW MESSAGE & SENT HISTORY */}
      {activeTab === 'compose' ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          {/* Left Column: Compose Form */}
          <section className="rounded-2xl border border-[#d7e3df] bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-[#111827]">Compose Message</h3>
              <p className="text-xs text-[#6b7280]">Send a direct message or broadcast announcement to Teachers, Students, or Classes.</p>
            </div>

            {composeSuccess ? (
              <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-sm font-medium text-[#166534]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#16a34a]" />
                  <span>{composeSuccess}</span>
                </div>
                <button type="button" onClick={() => setComposeSuccess('')} className="text-[#166534]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            {composeError ? (
              <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-sm font-medium text-[#b91c1c]">
                <span>{composeError}</span>
                <button type="button" onClick={() => setComposeError('')} className="text-[#b91c1c]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            <form onSubmit={handleComposeSubmit} className="space-y-5">
              {/* Recipient Target Selector */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#374151]">
                  Recipient Category
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setComposeMode('individual_teacher')}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                      composeMode === 'individual_teacher'
                        ? 'border-[#1F5A5C] bg-[#e8f5f0] text-[#1F5A5C] shadow-sm'
                        : 'border-[#d7e3df] bg-[#f9fbfa] text-[#4b5563] hover:bg-white'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span>Teacher ({teachers.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComposeMode('all_teachers')}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                      composeMode === 'all_teachers'
                        ? 'border-[#1F5A5C] bg-[#e8f5f0] text-[#1F5A5C] shadow-sm'
                        : 'border-[#d7e3df] bg-[#f9fbfa] text-[#4b5563] hover:bg-white'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>All Teachers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComposeMode('individual_student')}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                      composeMode === 'individual_student'
                        ? 'border-[#1F5A5C] bg-[#e8f5f0] text-[#1F5A5C] shadow-sm'
                        : 'border-[#d7e3df] bg-[#f9fbfa] text-[#4b5563] hover:bg-white'
                    }`}
                  >
                    <UserRound className="h-4 w-4" />
                    <span>Student ({students.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComposeMode('class')}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                      composeMode === 'class'
                        ? 'border-[#1F5A5C] bg-[#e8f5f0] text-[#1F5A5C] shadow-sm'
                        : 'border-[#d7e3df] bg-[#f9fbfa] text-[#4b5563] hover:bg-white'
                    }`}
                  >
                    <School className="h-4 w-4" />
                    <span>Class Group</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComposeMode('announcement')}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition sm:col-span-2 ${
                      composeMode === 'announcement'
                        ? 'border-[#1F5A5C] bg-[#e8f5f0] text-[#1F5A5C] shadow-sm'
                        : 'border-[#d7e3df] bg-[#f9fbfa] text-[#4b5563] hover:bg-white'
                    }`}
                  >
                    <Megaphone className="h-4 w-4" />
                    <span>All Students Broadcast</span>
                  </button>
                </div>
              </div>

              {/* MODE 1: INDIVIDUAL TEACHER SELECTOR */}
              {composeMode === 'individual_teacher' ? (
                <div className="rounded-2xl border border-[#d7e3df] bg-[#fbfefe] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#374151]">
                      Select Teacher ({filteredTeachers.length})
                    </label>
                    {selectedTeacher ? (
                      <span className="rounded-lg bg-[#d1fae5] px-2 py-0.5 text-xs font-bold text-[#065f46]">
                        Selected: {selectedTeacher.fullName}
                      </span>
                    ) : null}
                  </div>

                  <label className="flex items-center gap-2 rounded-xl border border-[#d7e3df] bg-white px-3 py-2">
                    <Search className="h-4 w-4 text-[#6b7280]" />
                    <input
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      placeholder="Search teacher by name, email, or subject..."
                      className="w-full bg-transparent text-sm text-[#111827] outline-none"
                    />
                  </label>

                  <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                    {filteredTeachers.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#d7e3df] bg-white p-4 text-center text-xs text-[#6b7280]">
                        No teachers found matching your search.
                      </div>
                    ) : (
                      filteredTeachers.map((teacher) => {
                        const active = selectedTeacherUserId === teacher.userId;
                        return (
                          <button
                            key={teacher.id}
                            type="button"
                            onClick={() => setSelectedTeacherUserId(teacher.userId)}
                            className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                              active
                                ? 'border-[#1F5A5C] bg-[#e8f5f0] shadow-sm'
                                : 'border-[#e2ece9] bg-white hover:border-[#cbd5e1]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d1fae5] text-xs font-bold text-[#065f46]">
                                {initials(teacher.fullName)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#111827]">{teacher.fullName}</p>
                                <p className="truncate text-xs text-[#6b7280]">
                                  {teacher.email}
                                  {teacher.subjects.length > 0 ? ` • ${teacher.subjects.join(', ')}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0 pl-2">
                              <div
                                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                  active ? 'border-[#1F5A5C] bg-[#1F5A5C]' : 'border-[#9ca3af]'
                                }`}
                              >
                                {active ? <div className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}

              {/* MODE 2: ALL TEACHERS INFO BANNER */}
              {composeMode === 'all_teachers' ? (
                <div className="rounded-2xl border border-[#7dcdb6] bg-[#e7f6f2] p-4 text-sm text-[#1F5A5C] space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <Users className="h-5 w-5" />
                    <span>Broadcast Notice to All Teachers</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#1F5A5C]/90">
                    This message will be dispatched directly to the in-app inbox of all <strong>{teachers.length} active teachers</strong>.
                  </p>
                </div>
              ) : null}

              {/* MODE 3: INDIVIDUAL STUDENT SELECTOR */}
              {composeMode === 'individual_student' ? (
                <div className="rounded-2xl border border-[#d7e3df] bg-[#fbfefe] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#374151]">
                      Select Student ({filteredStudents.length} of {students.length})
                    </label>
                    {selectedStudent ? (
                      <span className="rounded-lg bg-[#e0f2fe] px-2 py-0.5 text-xs font-bold text-[#0369a1]">
                        Selected: {selectedStudent.fullName}
                      </span>
                    ) : null}
                  </div>

                  {/* Filter by class & Search */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <select
                        value={studentClassFilter}
                        onChange={(e) => setStudentClassFilter(e.target.value)}
                        className="w-full rounded-xl border border-[#d7e3df] bg-white px-3 py-2 text-xs font-semibold text-[#111827] outline-none focus:border-[#1F5A5C]"
                      >
                        <option value="ALL">All Classes ({students.length} students)</option>
                        {classes.map((cls) => {
                          const count = students.filter((s) => s.classId === cls.id).length;
                          return (
                            <option key={cls.id} value={cls.id}>
                              {cls.name} - {cls.section} ({count} students)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <label className="flex items-center gap-2 rounded-xl border border-[#d7e3df] bg-white px-3 py-2">
                      <Search className="h-4 w-4 text-[#6b7280]" />
                      <input
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search student or admission no..."
                        className="w-full bg-transparent text-sm text-[#111827] outline-none"
                      />
                    </label>
                  </div>

                  <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                    {filteredStudents.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#d7e3df] bg-white p-4 text-center text-xs text-[#6b7280]">
                        No students found matching your filters.
                      </div>
                    ) : (
                      filteredStudents.map((student) => {
                        const active = selectedStudentUserId === student.userId;
                        return (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => setSelectedStudentUserId(student.userId)}
                            className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                              active
                                ? 'border-[#1F5A5C] bg-[#e8f5f0] shadow-sm'
                                : 'border-[#e2ece9] bg-white hover:border-[#cbd5e1]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e0f2fe] text-xs font-bold text-[#0369a1]">
                                {initials(student.fullName)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#111827]">{student.fullName}</p>
                                <p className="truncate text-xs text-[#6b7280]">
                                  {student.className} • Reg: {student.admissionNo}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0 pl-2">
                              <div
                                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                  active ? 'border-[#1F5A5C] bg-[#1F5A5C]' : 'border-[#9ca3af]'
                                }`}
                              >
                                {active ? <div className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}

              {/* MODE 4: CLASS GROUP SELECTOR */}
              {composeMode === 'class' ? (
                <div className="rounded-2xl border border-[#d7e3df] bg-[#fbfefe] p-4 space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#374151]">
                    Select Target Class
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {classes.map((item) => {
                      const count = students.filter((s) => s.classId === item.id).length;
                      const active = selectedClassId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedClassId(item.id)}
                          className={`rounded-xl border p-3 text-left transition ${
                            active
                              ? 'border-[#1F5A5C] bg-[#e8f5f0] shadow-sm'
                              : 'border-[#d7e3df] bg-white hover:bg-[#f7fbfa]'
                          }`}
                        >
                          <p className="text-sm font-bold text-[#111827]">
                            {item.name} - {item.section}
                          </p>
                          <p className="mt-0.5 text-xs text-[#6b7280]">{count} students enrolled</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* MODE 5: ALL STUDENTS ANNOUNCEMENT */}
              {composeMode === 'announcement' ? (
                <div className="rounded-2xl border border-[#7dcdb6] bg-[#e7f6f2] p-4 text-sm text-[#1F5A5C] space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <Megaphone className="h-5 w-5" />
                    <span>Broadcast Notice to All Students</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#1F5A5C]/90">
                    This announcement will be delivered to all <strong>{students.length} active students</strong> in the institute.
                  </p>
                </div>
              ) : null}

              {/* Subject Input */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#374151]">
                  Subject
                </label>
                <input
                  required
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="e.g. Schedule Update, Fee Notice, or Meeting Request"
                  className="w-full rounded-xl border border-[#d7e3df] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none focus:border-[#1F5A5C] transition"
                />
              </div>

              {/* Message Body Input */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#374151]">
                  Message
                </label>
                <textarea
                  required
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={6}
                  placeholder="Type your message clearly and concisely..."
                  className="w-full rounded-xl border border-[#d7e3df] bg-white p-3.5 text-sm text-[#111827] outline-none focus:border-[#1F5A5C] transition resize-none"
                />
              </div>

              {/* Send Button */}
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={composeSending}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1F5A5C] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#005a5e] disabled:cursor-not-allowed disabled:opacity-60 transition"
                >
                  <SendHorizontal className="h-4 w-4" />
                  <span>{composeSending ? 'Sending Message...' : 'Send Message'}</span>
                </button>
              </div>
            </form>
          </section>

          {/* Right Column: Sent Messages History */}
          <section className="h-fit rounded-2xl border border-[#d7e3df] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-[#e4ece9] pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-[#1F5A5C]" />
                <h4 className="text-base font-bold text-[#111827]">Sent Messages ({sentState.length})</h4>
              </div>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {sentState.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#c6d4cf] bg-[#f7fbfa] p-6 text-center">
                  <p className="text-sm font-semibold text-[#111827]">No sent messages yet</p>
                  <p className="mt-1 text-xs text-[#6b7280]">Messages you send will appear here.</p>
                </div>
              ) : (
                sentState.map((card) => {
                  const roles = Array.from(new Set(card.recipients.map((r) => r.user.role)));
                  const roleLabel = roles.length === 1 ? (roles[0] === 'TEACHER' ? 'Teacher' : 'Student') : 'Multi';
                  return (
                    <article key={card.id} className="rounded-xl border border-[#d7e3df] bg-[#f8fbfb] p-3.5 shadow-sm space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-[#111827]">{card.subject}</p>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSentMessage(card.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#fecaca] text-[#b91c1c] hover:bg-[#fef2f2] transition"
                          title="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-[#4b5563] line-clamp-2">{card.body}</p>

                      <div className="flex items-center justify-between pt-1 text-xs text-[#6b7280]">
                        <span className="font-medium">
                          {card.recipients.length} recipient{card.recipients.length > 1 ? 's' : ''}
                        </span>
                        <span className="rounded-md bg-[#e8f5f0] px-2 py-0.5 font-bold text-[#1F5A5C]">
                          {roleLabel}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#9ca3af]">
                        {new Date(card.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </article>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            <div className="mt-4 flex items-center justify-between border-t border-[#d7e3df] pt-3 text-xs text-[#6b7280]">
              <span>Page {currentPage}</span>
              <div className="flex gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={`/admin/messages?page=${currentPage - 1}`}
                    className="rounded-lg border border-[#d7e3df] bg-white px-2.5 py-1 font-semibold text-[#4b5563] hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                ) : null}
                <Link
                  href={`/admin/messages?page=${currentPage + 1}`}
                  className="rounded-lg border border-[#d7e3df] bg-white px-2.5 py-1 font-semibold text-[#4b5563] hover:bg-gray-50"
                >
                  Next
                </Link>
              </div>
            </div>
          </section>
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
    </div>
  );
}
