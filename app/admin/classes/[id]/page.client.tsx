'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Phone,
  Mail,
  Search,
  Plus,
  Eye,
  Calendar,
  Users,
  BarChart3,
  DollarSign,
  TrendingUp,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  MessageCircle,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Trash2,
  MapPin,
  Check,
  X
} from 'lucide-react';
import { AttendanceStatus } from '@prisma/client';

const CARD_CLS = 'rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] border border-slate-200/80';
const TEAL = '#0F766E';
const AMBER = '#D97706';

type FeeItem = {
  id?: string;
  title?: string;
  status: string;
  amount: number | string;
  dueDate?: Date | string | null;
};

type ProgressLogItem = {
  id?: string;
  date: Date | string;
  lessonType?: string;
  lessonNumber?: number;
  ayahFrom?: number | null;
  ayahTo?: number | null;
  notes?: string | null;
  tajweeditotal?: number | null;
  hifzTotal?: number | null;
};

type StudentItem = {
  id: string;
  admissionNo: string;
  rollNumber?: string | null;
  fatherName?: string | null;
  gender?: string | null;
  whatsApp?: string | null;
  createdAt: Date | string;
  user: { id: string; fullName: string; email: string; phone?: string | null };
  attendance: Array<{ status: AttendanceStatus; date?: Date | string }>;
  results: Array<{ grade: string; marksObtained?: number | null; createdAt?: Date | string }>;
  fees: FeeItem[];
  progressLogs?: ProgressLogItem[];
};

type ClassDetails = {
  id: string;
  name: string;
  section: string;
  academicYear: string;
  roomNo?: string | null;
  subjects?: Array<{ id: string; name: string; code?: string | null }>;
  progressLogs?: ProgressLogItem[];
  students: StudentItem[];
  teacherLinks: Array<{
    teacher: {
      id?: string;
      employeeCode?: string;
      user: { fullName: string; email: string; phone?: string | null };
    };
  }>;
};

type ClassDetailsPageClientProps = {
  initialClass: ClassDetails;
};

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = ['#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#2563eb', '#0d9488'];
  return colors[name.charCodeAt(0) % colors.length];
}

function calcAttendancePercent(attendance: Array<{ status: AttendanceStatus }>): number {
  if (!attendance.length) return 0;
  const present = attendance.filter((a) => a.status === 'PRESENT').length;
  return Math.round((present / attendance.length) * 100);
}

function getLatestGrade(results: Array<{ grade: string }>): string | null {
  return results.length > 0 ? results[0].grade : null;
}

function getPendingFeesAmount(fees: FeeItem[]): number {
  return fees
    .filter((f) => f.status === 'PENDING')
    .reduce((sum: number, f) => sum + Number(f.amount || 0), 0);
}

function getTotalPaidFeesAmount(fees: FeeItem[]): number {
  return fees
    .filter((f) => f.status === 'PAID')
    .reduce((sum: number, f) => sum + Number(f.amount || 0), 0);
}

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-US')}`;
}

function relativeDate(date: Date | string): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatReadableDate(date: Date | string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function extractSabaqPreview(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const sabaqMatch = notes.match(/\[SABAQ\]([\s\S]*?)(?=\[|$)/);
  if (!sabaqMatch) return null;
  const block = sabaqMatch[1];
  const surahName = block.match(/SurahName:([^\n\r]+)/)?.[1]?.trim();
  const from = block.match(/FromAyah:(\d+)/)?.[1];
  const to = block.match(/ToAyah:(\d+)/)?.[1];
  if (surahName && from && to && surahName !== '-') {
    return `${surahName} (${from}-${to})`;
  }
  return null;
}

function ToastContainer({ toasts }: { toasts: Array<{ id: string; msg: string; type: 'success' | 'error' }> }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-3 text-white text-xs font-bold shadow-xl backdrop-blur-md ${
            t.type === 'success' ? 'bg-teal-700/95' : 'bg-rose-600/95'
          }`}
        >
          {t.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

function DeleteModal({
  show,
  name,
  onConfirm,
  onClose
}: {
  show: boolean;
  name: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className={`${CARD_CLS} p-6 max-w-sm w-full mx-auto`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-rose-600">
            <AlertCircle size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Remove Student</h3>
            <p className="text-xs text-slate-500">Confirm student removal</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          Are you sure you want to remove <strong className="text-slate-900">{name}</strong> from this class?
        </p>
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClassDetailsPageClient({ initialClass }: ClassDetailsPageClientProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'attendance' | 'fees' | 'progress' | 'info'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'low_attendance'>('all');
  const [toasts, setToasts] = useState<Array<{ id: string; msg: string; type: 'success' | 'error' }>>([]);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; studentId: string; studentName: string }>({
    show: false,
    studentId: '',
    studentName: ''
  });

  const classTeacher = initialClass.teacherLinks?.[0]?.teacher;

  const statsData = useMemo(() => {
    const totalStudents = initialClass.students.length;
    const avgAttendance =
      totalStudents > 0
        ? Math.round(
            initialClass.students.reduce((sum, s) => sum + calcAttendancePercent(s.attendance), 0) / totalStudents
          )
        : 0;

    const pendingFees = initialClass.students.reduce((sum, s) => sum + getPendingFeesAmount(s.fees), 0);
    const paidFees = initialClass.students.reduce((sum, s) => sum + getTotalPaidFeesAmount(s.fees), 0);

    const progressReportsCount = initialClass.progressLogs?.length || 0;

    return { totalStudents, avgAttendance, pendingFees, paidFees, progressReportsCount };
  }, [initialClass.students, initialClass.progressLogs]);

  const filteredStudents = useMemo(() => {
    return initialClass.students.filter((student) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        student.user.fullName.toLowerCase().includes(q) ||
        student.admissionNo.toLowerCase().includes(q) ||
        (student.rollNumber && student.rollNumber.toLowerCase().includes(q)) ||
        (student.fatherName && student.fatherName.toLowerCase().includes(q)) ||
        (student.whatsApp && student.whatsApp.includes(q));

      if (!matchSearch) return false;

      const pendingFees = getPendingFeesAmount(student.fees);
      const attPercent = calcAttendancePercent(student.attendance);

      if (statusFilter === 'all') return true;
      if (statusFilter === 'pending') return pendingFees > 0;
      if (statusFilter === 'paid') return pendingFees === 0;
      if (statusFilter === 'low_attendance') return attPercent < 75;
      return true;
    });
  }, [initialClass.students, searchQuery, statusFilter]);

  const addToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const handleDeleteStudent = async () => {
    const { studentId, studentName } = deleteModal;
    setDeleteModal({ show: false, studentId: '', studentName: '' });
    try {
      const res = await fetch(`/api/students?id=${studentId}`, { method: 'DELETE' });
      if (res.ok) {
        addToast(`${studentName} removed from class`, 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        addToast('Failed to remove student', 'error');
      }
    } catch {
      addToast('Error removing student', 'error');
    }
  };

  return (
    <>
      <div className="space-y-6 pb-20">
        {/* ── Top Header Hero Card ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-950 p-6 text-white shadow-xl shadow-teal-950/15 sm:p-7">
          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/4 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 space-y-3">
              <Link
                href="/admin/classes"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-200 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
              >
                <ChevronLeft size={14} /> Back to Classes
              </Link>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl" dir="auto">
                  {initialClass.name}
                </h1>
                <p className="mt-1 text-xs font-semibold text-teal-100/80 sm:text-sm">
                  Section: <strong className="text-white">{initialClass.section}</strong> · Academic Year: <strong className="text-white">{initialClass.academicYear}</strong>
                </p>
              </div>

              {/* Badges Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                  <Users size={14} className="text-teal-300" />
                  <span>{initialClass.students.length} Enrolled Students</span>
                </span>

                {initialClass.roomNo ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                    <MapPin size={14} className="text-teal-300" />
                    <span>Room: {initialClass.roomNo}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-teal-200/70 backdrop-blur-md">
                    <MapPin size={14} className="text-teal-300" />
                    <span>No Room Assigned</span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-300 backdrop-blur-md">
                  <BarChart3 size={14} />
                  <span>{statsData.avgAttendance}% Avg Attendance</span>
                </span>
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <Link
                href={`/admin/students/enroll?classId=${initialClass.id}`}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-teal-900 shadow-md transition hover:bg-teal-50 active:scale-95"
              >
                <Plus size={15} className="stroke-[3]" />
                <span>Enroll Student</span>
              </Link>

              <Link
                href={`/admin/attendance?classId=${initialClass.id}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
              >
                <Calendar size={14} />
                <span>Mark Attendance</span>
              </Link>

              <Link
                href={`/admin/progress?classId=${initialClass.id}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
              >
                <BookOpen size={14} />
                <span>Quran Progress</span>
              </Link>
            </div>
          </div>

          {/* Assigned Class Teacher Ribbon */}
          {classTeacher ? (
            <div className="mt-6 border-t border-white/10 pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-11 w-11 place-items-center rounded-2xl font-black text-white text-sm shadow-inner"
                  style={{ backgroundColor: getAvatarColor(classTeacher.user.fullName) }}
                >
                  {getInitials(classTeacher.user.fullName)}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-200">Class Teacher</p>
                  <p className="text-sm font-black text-white">{classTeacher.user.fullName}</p>
                  <p className="text-xs text-teal-200/80">{classTeacher.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {classTeacher.user.phone && (
                  <>
                    <a
                      href={`https://wa.me/${classTeacher.user.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30 transition"
                    >
                      <MessageCircle size={13} />
                      <span>WhatsApp Teacher</span>
                    </a>
                    <a
                      href={`tel:${classTeacher.user.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition"
                    >
                      <Phone size={13} />
                      <span>{classTeacher.user.phone}</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 border-t border-white/10 pt-3 text-xs text-teal-200/80">
              No class teacher assigned yet. You can assign one in Class Settings.
            </div>
          )}
        </div>

        {/* ── Metric Summary Cards (KPIs) ── */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <div className={`${CARD_CLS} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Students</p>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <Users size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900">{statsData.totalStudents}</p>
            <p className="text-xs text-slate-500 mt-0.5">Enrolled in this class</p>
          </div>

          <div className={`${CARD_CLS} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Avg Attendance</p>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <BarChart3 size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-700">{statsData.avgAttendance}%</p>
            <p className="text-xs text-slate-500 mt-0.5">Last 30 days average</p>
          </div>

          <div className={`${CARD_CLS} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Fees</p>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-700">
                <DollarSign size={16} />
              </div>
            </div>
            <p className="text-xl font-black text-amber-700 sm:text-2xl">{formatCurrency(statsData.pendingFees)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Outstanding dues</p>
          </div>

          <div className={`${CARD_CLS} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Quran Reports</p>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-purple-50 text-purple-700">
                <BookOpen size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-purple-800">{statsData.progressReportsCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Daily lessons logged</p>
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex border-b border-slate-200/80 overflow-x-auto gap-2 pb-2">
            {[
              { key: 'students', label: `All Students (${initialClass.students.length})`, icon: Users },
              { key: 'attendance', label: 'Attendance', icon: Calendar },
              { key: 'fees', label: 'Fees & Dues', icon: DollarSign },
              { key: 'progress', label: 'Quran Progress', icon: BookOpen },
              { key: 'info', label: 'Class Info & Teachers', icon: GraduationCap }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ════ TAB 1: ALL STUDENTS ════ */}
          {activeTab === 'students' && (
            <div className="pt-5 space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search student by name, admission no, roll #..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-600 focus:bg-white"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-700 outline-none transition focus:border-teal-600 focus:bg-white"
                  >
                    <option value="all">All Students ({initialClass.students.length})</option>
                    <option value="paid">Paid Fees</option>
                    <option value="pending">Pending Fees</option>
                    <option value="low_attendance">Low Attendance (&lt;75%)</option>
                  </select>
                </div>

                <Link
                  href={`/admin/students/enroll?classId=${initialClass.id}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 text-xs font-black text-white shadow-sm transition hover:bg-teal-800 active:scale-95"
                >
                  <Plus size={15} className="stroke-[3]" />
                  <span>Enroll New Student</span>
                </Link>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                  <Users size={36} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">No students matched filter</p>
                  <p className="text-xs text-slate-400 mt-1">Try another search term or clear the filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                  <table className="w-full min-w-[950px] text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3.5 text-left">Student Details</th>
                        <th className="px-3 py-3.5 text-left">Admission / Roll</th>
                        <th className="px-3 py-3.5 text-left">Contact / WhatsApp</th>
                        <th className="px-3 py-3.5 text-left">Attendance</th>
                        <th className="px-3 py-3.5 text-left">Fee Status</th>
                        <th className="px-3 py-3.5 text-left">Latest Sabaq</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredStudents.map((student) => {
                        const attendancePercent = calcAttendancePercent(student.attendance);
                        const pendingFees = getPendingFeesAmount(student.fees);
                        const sabaqPreview = student.progressLogs?.[0]
                          ? extractSabaqPreview(student.progressLogs[0].notes)
                          : null;
                        const phone = student.whatsApp || student.user.phone;

                        return (
                          <tr key={student.id} className="transition hover:bg-teal-50/40">
                            {/* Student Details */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div
                                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl font-black text-white text-xs shadow-xs"
                                  style={{ backgroundColor: getAvatarColor(student.user.fullName) }}
                                >
                                  {getInitials(student.user.fullName)}
                                </div>
                                <div className="min-w-0" dir="auto">
                                  <Link
                                    href={`/admin/students/${student.id}`}
                                    className="font-bold text-slate-900 hover:text-teal-700 transition"
                                  >
                                    {student.user.fullName}
                                  </Link>
                                  {student.fatherName && (
                                    <p className="text-[11px] text-slate-500 truncate">
                                      S/O {student.fatherName}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Admission / Roll */}
                            <td className="px-3 py-3.5 font-medium text-slate-700">
                              <span className="inline-flex rounded-lg bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800">
                                {student.admissionNo}
                              </span>
                              {student.rollNumber && (
                                <p className="text-[11px] text-slate-400 mt-0.5">Roll: {student.rollNumber}</p>
                              )}
                            </td>

                            {/* Contact / WhatsApp */}
                            <td className="px-3 py-3.5">
                              {phone ? (
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition"
                                    title="Chat on WhatsApp"
                                  >
                                    <MessageCircle size={12} className="text-emerald-600" />
                                    <span>{phone}</span>
                                  </a>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">-</span>
                              )}
                            </td>

                            {/* Attendance */}
                            <td className="px-3 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${attendancePercent}%`,
                                      backgroundColor:
                                        attendancePercent >= 80 ? '#059669' : attendancePercent >= 60 ? '#d97706' : '#dc2626'
                                    }}
                                  />
                                </div>
                                <span className="font-bold text-slate-900 text-[11px]">{attendancePercent}%</span>
                              </div>
                            </td>

                            {/* Fee Status */}
                            <td className="px-3 py-3.5">
                              {pendingFees > 0 ? (
                                <span className="inline-flex rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800">
                                  Due: {formatCurrency(pendingFees)}
                                </span>
                              ) : (
                                <span className="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                  Paid ✓
                                </span>
                              )}
                            </td>

                            {/* Latest Sabaq */}
                            <td className="px-3 py-3.5">
                              {sabaqPreview ? (
                                <span className="inline-flex rounded-lg bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-900 border border-teal-100">
                                  {sabaqPreview}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link
                                  href={`/admin/students/${student.id}`}
                                  className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition"
                                  title="View Full Profile"
                                >
                                  <Eye size={12} />
                                  <span>Profile</span>
                                </Link>

                                <Link
                                  href={`/admin/students/${student.id}/fees`}
                                  className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition"
                                  title="View Student Fees"
                                >
                                  <DollarSign size={12} />
                                  <span>Fees</span>
                                </Link>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteModal({
                                      show: true,
                                      studentId: student.id,
                                      studentName: student.user.fullName
                                    })
                                  }
                                  className="grid h-7 w-7 place-items-center rounded-xl text-rose-500 hover:bg-rose-50 transition"
                                  title="Remove from Class"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════ TAB 2: ATTENDANCE OVERVIEW ════ */}
          {activeTab === 'attendance' && (
            <div className="pt-5 space-y-6">
              <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-black text-teal-950">Daily Attendance Record for {initialClass.name}</h4>
                  <p className="text-xs text-teal-800/80 mt-0.5">
                    Class Attendance Average: <strong>{statsData.avgAttendance}%</strong>
                  </p>
                </div>
                <Link
                  href={`/admin/attendance?classId=${initialClass.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-black text-white hover:bg-teal-800 transition"
                >
                  <Calendar size={14} />
                  <span>Mark / Edit Attendance Sheet →</span>
                </Link>
              </div>

              {/* Student Attendance List */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-3 py-3 text-left">Admission #</th>
                      <th className="px-3 py-3 text-left">Attendance Rate</th>
                      <th className="px-4 py-3 text-left">Recent Records</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {initialClass.students.map((student) => {
                      const rate = calcAttendancePercent(student.attendance);
                      return (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-900">{student.user.fullName}</td>
                          <td className="px-3 py-3 font-medium text-slate-600">{student.admissionNo}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-black ${
                                rate >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rate >= 60
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {rate}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {student.attendance.slice(0, 7).map((att, i) => (
                                <span
                                  key={i}
                                  className={`grid h-5 w-5 place-items-center rounded-md text-[9px] font-black text-white ${
                                    att.status === 'PRESENT'
                                      ? 'bg-emerald-600'
                                      : att.status === 'LATE'
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                  }`}
                                  title={att.status}
                                >
                                  {att.status === 'PRESENT' ? 'P' : att.status === 'LATE' ? 'L' : 'A'}
                                </span>
                              ))}
                              {student.attendance.length === 0 && (
                                <span className="text-slate-400 text-[11px]">No recent records</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════ TAB 3: FEES & DUES ════ */}
          {activeTab === 'fees' && (
            <div className="pt-5 space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Class Collected</p>
                  <p className="text-xl font-black text-emerald-700 mt-1">{formatCurrency(statsData.paidFees)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Class Outstanding</p>
                  <p className="text-xl font-black text-amber-700 mt-1">{formatCurrency(statsData.pendingFees)}</p>
                </div>
                <div className="flex items-center justify-end">
                  <Link
                    href="/admin/reports/finance/class"
                    className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-xs font-black text-white shadow-sm hover:bg-teal-800 transition"
                  >
                    <span>Full Class Fee Report →</span>
                  </Link>
                </div>
              </div>

              {/* Students Fee Dues List */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-3 py-3 text-left">Admission #</th>
                      <th className="px-3 py-3 text-left">Pending Amount</th>
                      <th className="px-4 py-3 text-right">Reminder Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {initialClass.students.map((student) => {
                      const pending = getPendingFeesAmount(student.fees);
                      const phone = student.whatsApp || student.user.phone;
                      const reminderMsg = encodeURIComponent(
                        `Assalam-o-Alaikum! Respected Guardian, monthly fee pending for ${student.user.fullName}: ${formatCurrency(
                          pending
                        )}. Please pay at your earliest convenience. Thank you! - Manarah Institute`
                      );

                      return (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-900">{student.user.fullName}</td>
                          <td className="px-3 py-3 font-medium text-slate-600">{student.admissionNo}</td>
                          <td className="px-3 py-3 font-black">
                            {pending > 0 ? (
                              <span className="text-rose-600">{formatCurrency(pending)}</span>
                            ) : (
                              <span className="text-emerald-700 font-bold">All Paid ✓</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {pending > 0 && phone ? (
                              <a
                                href={`https://wa.me/${phone.replace(/\D/g, '')}?text=${reminderMsg}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition"
                              >
                                <MessageCircle size={13} className="text-emerald-600" />
                                <span>Send WhatsApp Reminder</span>
                              </a>
                            ) : (
                              <Link
                                href={`/admin/students/${student.id}/fees`}
                                className="text-xs font-semibold text-teal-700 hover:underline"
                              >
                                View Fee Details
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════ TAB 4: QURAN PROGRESS ════ */}
          {activeTab === 'progress' && (
            <div className="pt-5 space-y-6">
              <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-black text-teal-950">Daily Quran Progress Logs</h4>
                  <p className="text-xs text-teal-800/80 mt-0.5">
                    Track lesson progression (Sabaq, Sabqi, and Manzil) for this class.
                  </p>
                </div>
                <Link
                  href={`/admin/progress?classId=${initialClass.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-black text-white hover:bg-teal-800 transition"
                >
                  <BookOpen size={14} />
                  <span>Open Daily Progress Page →</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {initialClass.students.map((student) => {
                  const latestLog = student.progressLogs?.[0];
                  const sabaqPreview = latestLog ? extractSabaqPreview(latestLog.notes) : null;

                  return (
                    <div key={student.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{student.user.fullName}</span>
                        {latestLog ? (
                          <span className="text-[10px] font-semibold text-slate-500">
                            {formatReadableDate(latestLog.date)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">No report yet</span>
                        )}
                      </div>

                      <div className="mt-2.5 rounded-xl bg-white p-2.5 border border-slate-100">
                        <p className="text-[11px] font-bold text-teal-900">
                          <span className="text-slate-400 font-semibold mr-1">Last Sabaq:</span>
                          {sabaqPreview || 'No Sabaq recorded'}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-end">
                        <Link
                          href={`/teacher/students/${student.id}/progress`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline"
                        >
                          <span>Full Quran History</span>
                          <ArrowRight size={11} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════ TAB 5: CLASS INFO & TEACHERS ════ */}
          {activeTab === 'info' && (
            <div className="pt-5 space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Class Information</h4>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500">Class Name:</span>
                      <strong className="text-slate-900">{initialClass.name}</strong>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500">Section:</span>
                      <strong className="text-slate-900">{initialClass.section}</strong>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500">Academic Year:</span>
                      <strong className="text-slate-900">{initialClass.academicYear}</strong>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500">Room Number:</span>
                      <strong className="text-slate-900">{initialClass.roomNo || 'Not Assigned'}</strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Assigned Teachers</h4>
                  {initialClass.teacherLinks.length === 0 ? (
                    <p className="text-xs text-slate-400">No teachers assigned to this class.</p>
                  ) : (
                    <div className="space-y-3">
                      {initialClass.teacherLinks.map((link, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl bg-white p-3 border border-slate-100">
                          <div
                            className="grid h-10 w-10 place-items-center rounded-xl font-bold text-white text-xs"
                            style={{ backgroundColor: getAvatarColor(link.teacher.user.fullName) }}
                          >
                            {getInitials(link.teacher.user.fullName)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{link.teacher.user.fullName}</p>
                            <p className="text-[11px] text-slate-500">{link.teacher.user.email}</p>
                            {link.teacher.user.phone && (
                              <p className="text-[11px] text-teal-700 font-semibold">{link.teacher.user.phone}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteModal
        show={deleteModal.show}
        name={deleteModal.studentName}
        onConfirm={handleDeleteStudent}
        onClose={() => setDeleteModal({ show: false, studentId: '', studentName: '' })}
      />
      <ToastContainer toasts={toasts} />
    </>
  );
}
