'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, Phone, Mail, Search, Plus, MoreVertical, Eye, Edit, Trash, Calendar, Users, BarChart3, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { AttendanceStatus } from '@prisma/client';

const CARD_CLS = 'rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]';
const TEAL = '#0F766E';
const AMBER = '#D97706';

type ClassDetailsPageClientProps = {
  initialClass: ClassDetails;
};

type FeeItem = { status: string; amount: number | string };
type StudentItem = {
  id: string;
  admissionNo: string;
  rollNumber?: string | null;
  createdAt: Date | string;
  user: { fullName: string; email: string; phone?: string | null };
  attendance: Array<{ status: AttendanceStatus }>;
  results: Array<{ grade: string }>;
  fees: FeeItem[];
};
type ClassDetails = {
  id: string;
  name: string;
  section: string;
  academicYear: string;
  roomNo?: string | null;
  students: StudentItem[];
  teacherLinks: Array<{ teacher: { user: { fullName: string; email: string; phone?: string | null } } }>;
};

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = ['#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#a855f7'];
  return colors[name.charCodeAt(0) % colors.length];
}

function calcAttendancePercent(attendance: Array<{ status: AttendanceStatus }>): number {
  if (!attendance.length) return 0;
  const present = attendance.filter(a => a.status === 'PRESENT').length;
  return Math.round((present / attendance.length) * 100);
}

function getLatestGrade(results: Array<{ grade: string }>): string | null {
  return results.length > 0 ? results[0].grade : null;
}

function getPendingFeesAmount(fees: FeeItem[]): number {
  return fees
    .filter((f) => f.status === 'PENDING')
    .reduce((sum: number, f) => sum + Number(f.amount), 0);
}

function formatCurrency(amount: number): string {
  return `AED ${amount.toFixed(2)}`;
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

function ToastContainer({ toasts }: { toasts: Array<{ id: string; msg: string; type: 'success' | 'error' }> }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`rounded-xl px-4 py-3 text-white text-sm font-medium shadow-lg ${t.type === 'success' ? 'bg-[#0F766E]' : 'bg-red-600'}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function ActionMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-1 hover:bg-[#f3f4f5] rounded-lg">
        <MoreVertical size={16} className="text-[#6f7979]" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-[#e0e5e5] overflow-hidden z-10">
          <button onClick={() => { onEdit(); setOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-[#f3f4f5] text-sm text-[#1a1c1c] flex items-center gap-2">
            <Edit size={14} /> Edit
          </button>
          <button onClick={() => { onDelete(); setOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center gap-2">
            <Trash size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function DeleteModal({ show, name, onConfirm, onClose }: { show: boolean; name: string; onConfirm: () => void; onClose: () => void }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center">
      <div className={`${CARD_CLS} p-6 max-w-sm w-full mx-4`}>
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle size={24} className="text-red-600" />
          <h3 className="text-lg font-bold text-[#1a1c1c]">Delete Student</h3>
        </div>
        <p className="text-sm text-[#6f7979] mb-6">Are you sure you want to remove <span className="font-semibold text-[#1a1c1c]">{name}</span> from this class?</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[#e0e5e5] px-4 py-2 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f3f4f5]">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClassDetailsPageClient({ initialClass }: ClassDetailsPageClientProps) {
  const [activeTab, setActiveTab] = useState('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [toasts, setToasts] = useState<Array<{ id: string; msg: string; type: 'success' | 'error' }>>([]);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; studentId: string; studentName: string }>({ show: false, studentId: '', studentName: '' });

  const classTeacher = initialClass.teacherLinks[0]?.teacher;

  const statsData = useMemo(() => {
    const totalStudents = initialClass.students.length;
    const avgAttendance = initialClass.students.length > 0
      ? Math.round(initialClass.students.reduce((sum: number, s) => sum + calcAttendancePercent(s.attendance), 0) / totalStudents)
      : 0;
    const pendingFees = initialClass.students.reduce((sum: number, s) => sum + getPendingFeesAmount(s.fees), 0);
    return { totalStudents, avgAttendance, pendingFees };
  }, [initialClass.students]);

  const filteredStudents = useMemo(() => {
    return initialClass.students.filter((student) => {
      const matchSearch = student.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
      if (statusFilter === 'all') return matchSearch;
      const pendingFees = getPendingFeesAmount(student.fees);
      if (statusFilter === 'pending') return matchSearch && pendingFees > 0;
      if (statusFilter === 'paid') return matchSearch && pendingFees === 0;
      return matchSearch;
    });
  }, [initialClass.students, searchQuery, statusFilter]);

  const addToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
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
      <div className="space-y-6">
        {/* HEADER CARD */}
        <div className={`${CARD_CLS} p-6 lg:p-8`}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <Link href="/admin/classes" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6f7979] hover:text-[#1a1c1c] mb-4">
                <ChevronLeft size={16} /> Back to Classes
              </Link>
              <h1 className="text-4xl font-bold text-[#1a1c1c] mb-2" dir="auto">{initialClass.name}</h1>
              <p className="text-lg text-[#6f7979] mb-4">Grade {initialClass.section} • Academic Year {initialClass.academicYear}</p>
              <div className="flex flex-wrap gap-3">
                {initialClass.roomNo && (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f3f4f5] text-sm text-[#1a1c1c]">
                    <Calendar size={16} style={{ color: TEAL }} /> Room {initialClass.roomNo}
                  </div>
                )}
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f3f4f5] text-sm text-[#1a1c1c]">
                  <Users size={16} style={{ color: TEAL }} /> {initialClass.students.length} Students
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f3f4f5] text-sm text-[#1a1c1c]">
                  <BarChart3 size={16} style={{ color: AMBER }} /> {statsData.avgAttendance}% Attendance
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href={`/admin/classes/${initialClass.id}/edit`} className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all" style={{ backgroundColor: TEAL, color: 'white' }}>
                Edit Class
              </Link>
              <button className="rounded-xl border border-[#e0e5e5] px-4 py-2.5 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f3f4f5]">
                ⋯ More
              </button>
            </div>
          </div>

          {classTeacher && (
            <div className="mt-8 pt-8 border-t border-[#e0e5e5]">
              <p className="text-xs font-bold uppercase tracking-widest text-[#6f7979] mb-4">Class Teacher</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: getAvatarColor(classTeacher.user.fullName) }}>
                  {getInitials(classTeacher.user.fullName)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1a1c1c]">{classTeacher.user.fullName}</p>
                  <p className="text-xs text-[#6f7979]">{classTeacher.user.email}</p>
                </div>
                <div className="flex gap-2">
                  {classTeacher.user.phone && (
                    <a href={`tel:${classTeacher.user.phone}`} className="p-2 hover:bg-[#f3f4f5] rounded-lg transition-colors">
                      <Phone size={16} className="text-[#6f7979]" />
                    </a>
                  )}
                  <a href={`mailto:${classTeacher.user.email}`} className="p-2 hover:bg-[#f3f4f5] rounded-lg transition-colors">
                    <Mail size={16} className="text-[#6f7979]" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Students */}
          <div className={`${CARD_CLS} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#6f7979]">Total Students</p>
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Users size={20} color={TEAL} />
              </div>
            </div>
            <p className="text-3xl font-bold text-[#1a1c1c] mb-2">{statsData.totalStudents}</p>
            <p className="text-xs text-[#6f7979]">Enrolled in class</p>
          </div>

          {/* Avg Attendance */}
          <div className={`${CARD_CLS} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#6f7979]">Avg Attendance</p>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <BarChart3 size={20} color={TEAL} />
              </div>
            </div>
            <p className="text-3xl font-bold text-[#1a1c1c] mb-2">{statsData.avgAttendance}%</p>
            <p className="text-xs text-[#6f7979]">Class average</p>
          </div>

          {/* Pending Fees */}
          <div className={`${CARD_CLS} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#6f7979]">Pending Fees</p>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <DollarSign size={20} color={AMBER} />
              </div>
            </div>
            <p className="text-3xl font-bold text-[#1a1c1c] mb-2">{formatCurrency(statsData.pendingFees)}</p>
            <p className="text-xs text-[#6f7979]">Outstanding</p>
          </div>

          {/* Avg Grade */}
          <div className={`${CARD_CLS} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#6f7979]">Avg Grade</p>
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <TrendingUp size={20} color={TEAL} />
              </div>
            </div>
            <p className="text-3xl font-bold text-[#1a1c1c] mb-2">
              {initialClass.students.length > 0
                ? (initialClass.students
                    .filter((s) => s.results.length > 0)
                    .length / initialClass.students.length * 100).toFixed(0) + '%'
                : 'N/A'}
            </p>
            <p className="text-xs text-[#6f7979]">Graded students</p>
          </div>
        </div>

        {/* TABS */}
        <div className={`${CARD_CLS}`}>
          <div className="flex border-b border-[#e0e5e5] overflow-x-auto">
            {['students', 'attendance', 'schedule', 'results', 'fees', 'activity'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-semibold capitalize whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab
                    ? `border-[${TEAL}] text-[${TEAL}]`
                    : 'border-transparent text-[#6f7979] hover:text-[#1a1c1c]'
                }`}
                style={activeTab === tab ? { borderColor: TEAL, color: TEAL } : {}}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <div className="p-6">
              <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 flex gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-3 text-[#6f7979]" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#edeeef] border-none text-sm text-[#1a1c1c] placeholder-[#6f7979]"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'pending')}
                    className="px-4 py-2.5 rounded-xl bg-[#edeeef] border-none text-sm text-[#1a1c1c]"
                  >
                    <option value="all">All Status</option>
                    <option value="paid">Paid Fees</option>
                    <option value="pending">Pending Fees</option>
                  </select>
                </div>
                <Link href={`/admin/students?classId=${initialClass.id}`} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex items-center gap-2 whitespace-nowrap" style={{ backgroundColor: TEAL }}>
                  <Plus size={16} /> Add Student
                </Link>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={48} className="mx-auto mb-3 text-[#e0e5e5]" />
                  <p className="text-[#6f7979] font-medium">No students found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-sm">
                    <thead>
                      <tr className="border-b border-[#e2e8e8]">
                        <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Student</th>
                        <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Roll #</th>
                        <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Admission</th>
                        <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Joined</th>
                        <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Attendance</th>
                        <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Grade</th>
                        <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Fees</th>
                        <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8e8]">
                      {filteredStudents.map((student) => {
                        const attendancePercent = calcAttendancePercent(student.attendance);
                        const grade = getLatestGrade(student.results);
                        const pendingFees = getPendingFeesAmount(student.fees);
                        return (
                          <tr key={student.id} className="hover:bg-[#f9f9f9]">
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: getAvatarColor(student.user.fullName) }}>
                                  {getInitials(student.user.fullName)}
                                </div>
                                <div dir="auto">
                                  <p className="font-medium text-[#1a1c1c]">{student.user.fullName}</p>
                                  <div className="flex gap-2 mt-1">
                                    {student.user.phone && (
                                      <a href={`tel:${student.user.phone}`} title={student.user.phone} className="text-[#6f7979] hover:text-[#1a1c1c]">
                                        <Phone size={12} />
                                      </a>
                                    )}
                                    <a href={`mailto:${student.user.email}`} title={student.user.email} className="text-[#6f7979] hover:text-[#1a1c1c]">
                                      <Mail size={12} />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-[#6f7979]">{student.rollNumber || '-'}</td>
                            <td className="py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: `${TEAL}20`, color: TEAL }}>
                                {student.admissionNo}
                              </span>
                            </td>
                            <td className="py-4 text-[#6f7979] text-xs">{relativeDate(student.createdAt)}</td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-[#e0e5e5] overflow-hidden">
                                  <div className="h-full" style={{ width: `${attendancePercent}%`, backgroundColor: attendancePercent >= 80 ? '#22c55e' : attendancePercent >= 60 ? AMBER : '#ef4444' }}></div>
                                </div>
                                <span className="text-xs font-semibold text-[#1a1c1c] w-8">{attendancePercent}%</span>
                              </div>
                            </td>
                            <td className="py-4">
                              {grade ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: `${AMBER}20`, color: AMBER }}>
                                  {grade}
                                </span>
                              ) : (
                                <span className="text-xs text-[#6f7979]">-</span>
                              )}
                            </td>
                            <td className="py-4">
                              {pendingFees > 0 ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600">
                                  {formatCurrency(pendingFees)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-600">
                                  Paid
                                </span>
                              )}
                            </td>
                            <td className="py-4 text-right">
                              <Link href={`/admin/students/${student.id}`} className="inline-flex items-center gap-1 text-xs font-semibold rounded-lg px-2.5 py-1 hover:bg-[#f3f4f5] text-[#1a1c1c] transition-colors">
                                <Eye size={12} /> View
                              </Link>
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

          {/* OTHER TABS - PLACEHOLDER */}
          {['attendance', 'schedule', 'results', 'fees', 'activity'].includes(activeTab) && (
            <div className="p-12 text-center">
              <p className="text-[#6f7979]">Coming soon: {activeTab} tab</p>
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
