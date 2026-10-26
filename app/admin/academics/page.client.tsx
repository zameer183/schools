'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Edit3,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  AlertCircle,
  BarChart3,
  Sparkles,
  Building2,
  UserCheck
} from 'lucide-react';

export type ClassItem = {
  id: string;
  name: string;
  section: string;
  roomNo?: string | null;
  academicYear: string;
  _count?: { students: number; subjects: number };
};

export type TeacherItem = { id: string; user: { fullName: string } };

export type SubjectItem = {
  id: string;
  name: string;
  code: string;
  classId?: string;
  class?: { name: string; section: string } | null;
  teacher?: { user: { fullName: string } } | null;
};

export type ExamItem = {
  id: string;
  title: string;
  examType?: string;
  dueDate?: string;
  examDate: string;
  totalMarks: number;
  passingMarks: number;
  classId: string;
  subjectId: string;
  createdById: string;
  teacherName?: string;
  resultsCount?: number;
  class: { name: string; section: string };
  subject: { name: string };
};

export type StudentItem = {
  id: string;
  classId: string | null;
  admissionNo: string;
  fullName: string;
};

type ResultRow = {
  id: string;
  examId: string;
  studentId: string;
  marksObtained: number;
  grade: string;
  remarks: string | null;
  student: { user: { fullName: string } };
};

const EXAM_TYPES = ['One Juzz', '5 Juzz', '10 Juzz', 'Full Revision', 'Custom'] as const;

function classLabel(item: Partial<ClassItem>) {
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const section = typeof item.section === 'string' ? item.section.trim() : '';
  const year = typeof item.academicYear === 'string' ? item.academicYear.trim() : '';
  const base = [name, section].filter(Boolean).join(' - ');
  if (base && year) return `${base} (${year})`;
  if (base) return base;
  if (name) return name;
  return 'Unnamed Class';
}

function gradeBadgeClass(grade: string) {
  switch (grade) {
    case 'A+':
      return 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]';
    case 'A':
      return 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]';
    case 'B':
      return 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]';
    case 'C':
      return 'bg-[#fef9c3] text-[#a16207] border-[#fef08a]';
    case 'D':
      return 'bg-[#ffedd5] text-[#c2410c] border-[#fed7aa]';
    case 'F':
      return 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]';
    default:
      return 'bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]';
  }
}

export default function AdminAcademicsPageClient({
  initialClasses,
  initialSubjects,
  initialTeachers,
  initialExams
}: {
  initialClasses: ClassItem[];
  initialSubjects: SubjectItem[];
  initialTeachers: TeacherItem[];
  initialExams: ExamItem[];
}) {
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses);
  const [subjects, setSubjects] = useState<SubjectItem[]>(initialSubjects);
  const [teachers, setTeachers] = useState<TeacherItem[]>(initialTeachers);
  const [exams, setExams] = useState<ExamItem[]>(initialExams);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'exams' | 'results' | 'curriculum'>('exams');

  // Filters & Search
  const [examSearch, setExamSearch] = useState('');
  const [examClassFilter, setExamClassFilter] = useState('all');
  const [examStatusFilter, setExamStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');

  // Modals
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<ExamItem | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectItem | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Loading States
  const [examSaving, setExamSaving] = useState(false);
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [resultSaving, setResultSaving] = useState(false);
  const [resultLoading, setResultLoading] = useState(false);
  const [examDeleting, setExamDeleting] = useState(false);
  const [subjectDeleting, setSubjectDeleting] = useState(false);

  // Results State
  const [resultRows, setResultRows] = useState<ResultRow[]>([]);
  const [studentOptionsByClassId, setStudentOptionsByClassId] = useState<Record<string, StudentItem[]>>({});
  const [studentOptionsLoadingClassId, setStudentOptionsLoadingClassId] = useState<string | null>(null);

  // Forms
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', classId: '', teacherId: '', creditHours: 3 });
  const [examForm, setExamForm] = useState({
    id: '',
    title: '',
    examType: 'One Juzz',
    classId: '',
    subjectId: '',
    dueDate: '',
    totalMarks: '100',
    passingMarks: '50',
    createdByTeacherId: ''
  });
  const [resultForm, setResultForm] = useState({
    examId: '',
    studentId: '',
    marksObtained: '',
    remarks: ''
  });

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const classStudentCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of classes) {
      map.set(item.id, item._count?.students ?? 0);
    }
    return map;
  }, [classes]);

  const totalEnrolledStudents = useMemo(() => {
    return classes.reduce((sum, c) => sum + (c._count?.students ?? 0), 0);
  }, [classes]);

  const totalEvaluations = useMemo(() => {
    return exams.reduce((sum, e) => sum + (e.resultsCount ?? 0), 0);
  }, [exams]);

  const filteredSubjectsForExamForm = useMemo(
    () => subjects.filter((subject) => !examForm.classId || subject.classId === examForm.classId),
    [subjects, examForm.classId]
  );

  const selectedExam = useMemo(() => exams.find((e) => e.id === resultForm.examId) ?? null, [exams, resultForm.examId]);
  const examStudents = selectedExam ? studentOptionsByClassId[selectedExam.classId] ?? [] : [];
  const examStudentsLoaded = selectedExam ? Object.prototype.hasOwnProperty.call(studentOptionsByClassId, selectedExam.classId) : false;
  const loadingExamStudents = Boolean(selectedExam && studentOptionsLoadingClassId === selectedExam.classId && !examStudentsLoaded);

  const gradeFor = (marks: number, total: number) => {
    if (total <= 0) return 'F';
    const pct = (marks / total) * 100;
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  };

  const previewGrade = useMemo(() => {
    if (!selectedExam || resultForm.marksObtained === '') return null;
    const marks = Number(resultForm.marksObtained);
    if (Number.isNaN(marks)) return null;
    return gradeFor(marks, selectedExam.totalMarks);
  }, [selectedExam, resultForm.marksObtained]);

  const load = async () => {
    try {
      const [classesRes, subjectsRes, teachersRes, examsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/subjects'),
        fetch('/api/teachers'),
        fetch('/api/exams')
      ]);

      if (classesRes.ok) setClasses(await classesRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
      if (teachersRes.ok) setTeachers(await teachersRes.json());
      if (examsRes.ok) setExams(await examsRes.json());
    } catch {
      // transient network fallback
    }
  };

  const loadStudentsForClass = useCallback(async (classId: string) => {
    if (!classId || Object.prototype.hasOwnProperty.call(studentOptionsByClassId, classId)) return;

    setStudentOptionsLoadingClassId(classId);
    try {
      const res = await fetch(`/api/students?classId=${encodeURIComponent(classId)}&light=1`);
      const data = (await res.json().catch(() => [])) as StudentItem[];
      if (!res.ok) {
        setStudentOptionsByClassId((prev) => ({ ...prev, [classId]: [] }));
        return;
      }

      setStudentOptionsByClassId((prev) => ({
        ...prev,
        [classId]: data.map((student) => ({
          id: student.id,
          classId: student.classId,
          admissionNo: student.admissionNo,
          fullName: student.fullName
        }))
      }));
    } finally {
      setStudentOptionsLoadingClassId((current) => (current === classId ? null : current));
    }
  }, [studentOptionsByClassId]);

  const loadResultRows = async (examId: string) => {
    if (!examId) {
      setResultRows([]);
      return;
    }
    setResultLoading(true);
    try {
      const res = await fetch(`/api/results?examId=${examId}`);
      const data = (await res.json().catch(() => [])) as ResultRow[];
      setResultRows(res.ok ? data : []);
    } finally {
      setResultLoading(false);
    }
  };

  const handleSelectExamForStudents = (examId: string) => {
    const exam = exams.find((item) => item.id === examId) ?? null;
    setResultForm((f) => ({ ...f, examId, studentId: '', marksObtained: '', remarks: '' }));
    if (exam) {
      void loadStudentsForClass(exam.classId);
      void loadResultRows(examId);
    } else {
      setResultRows([]);
    }
  };

  const openAddExamModal = () => {
    setExamForm({
      id: '',
      title: '',
      examType: 'One Juzz',
      classId: classes[0]?.id ?? '',
      subjectId: '',
      dueDate: new Date().toISOString().slice(0, 10),
      totalMarks: '100',
      passingMarks: '50',
      createdByTeacherId: teachers[0]?.id ?? ''
    });
    setIsExamModalOpen(true);
  };

  const openEditExamModal = (exam: ExamItem) => {
    setExamForm({
      id: exam.id,
      title: exam.title,
      examType: exam.examType ?? 'Custom',
      classId: exam.classId,
      subjectId: exam.subjectId,
      dueDate: (exam.dueDate ?? exam.examDate).slice(0, 10),
      totalMarks: String(exam.totalMarks),
      passingMarks: String(exam.passingMarks),
      createdByTeacherId: exam.createdById
    });
    setIsExamModalOpen(true);
  };

  const openAddSubjectModal = () => {
    setSubjectForm({
      name: '',
      code: '',
      classId: classes[0]?.id ?? '',
      teacherId: teachers[0]?.id ?? '',
      creditHours: 3
    });
    setIsSubjectModalOpen(true);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setExamSaving(true);

    const payload = {
      ...examForm,
      totalMarks: Number(examForm.totalMarks),
      passingMarks: Number(examForm.passingMarks)
    };

    const method = examForm.id ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/exams', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('error', data?.error ?? 'Unable to save exam');
        return;
      }

      showToast('success', examForm.id ? 'Exam updated successfully.' : 'New exam scheduled successfully.');
      setIsExamModalOpen(false);
      void load();
    } finally {
      setExamSaving(false);
    }
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectSaving(true);

    const payload = { ...subjectForm, creditHours: Number(subjectForm.creditHours) };
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('error', data?.error ?? 'Unable to add subject');
        return;
      }

      showToast('success', 'Subject created successfully.');
      setIsSubjectModalOpen(false);
      void load();
    } finally {
      setSubjectSaving(false);
    }
  };

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;
    setExamDeleting(true);
    try {
      let res = await fetch(`/api/exams?id=${examToDelete.id}`, { method: 'DELETE' });
      let data = await res.json().catch(() => ({}));

      if (!res.ok && res.status === 409) {
        const force = window.confirm('This exam already has student results. Permanently delete the exam and all student grades from the database?');
        if (!force) {
          setExamDeleting(false);
          setExamToDelete(null);
          return;
        }
        res = await fetch(`/api/exams?id=${examToDelete.id}&force=1`, { method: 'DELETE' });
        data = await res.json().catch(() => ({}));
      }

      if (!res.ok) {
        showToast('error', (data as { error?: string })?.error ?? 'Unable to delete exam');
        return;
      }

      showToast('success', 'Exam permanently deleted from database.');
      setExamToDelete(null);
      if (resultForm.examId === examToDelete.id) {
        setResultForm({ examId: '', studentId: '', marksObtained: '', remarks: '' });
        setResultRows([]);
      }
      void load();
    } finally {
      setExamDeleting(false);
    }
  };

  const confirmDeleteSubject = async () => {
    if (!subjectToDelete) return;
    setSubjectDeleting(true);
    try {
      let res = await fetch(`/api/subjects?id=${subjectToDelete.id}`, { method: 'DELETE' });
      let data = await res.json().catch(() => ({}));

      if (!res.ok && res.status === 409) {
        const force = window.confirm(
          `Subject "${subjectToDelete.name}" has linked exams or student results. Permanently delete this subject and all associated records from the database?`
        );
        if (!force) {
          setSubjectDeleting(false);
          setSubjectToDelete(null);
          return;
        }
        res = await fetch(`/api/subjects?id=${subjectToDelete.id}&force=1`, { method: 'DELETE' });
        data = await res.json().catch(() => ({}));
      }

      if (!res.ok) {
        showToast('error', (data as { error?: string })?.error ?? 'Unable to delete subject');
        return;
      }

      showToast('success', 'Subject permanently deleted from database.');
      setSubjectToDelete(null);
      void load();
    } finally {
      setSubjectDeleting(false);
    }
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    setResultSaving(true);
    const marks = Number(resultForm.marksObtained);

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: resultForm.examId,
          studentId: resultForm.studentId,
          subjectId: selectedExam.subjectId,
          marksObtained: marks,
          grade: gradeFor(marks, selectedExam.totalMarks),
          remarks: resultForm.remarks
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('error', data?.error ?? 'Unable to record result');
        return;
      }

      showToast('success', 'Student grade saved and published.');
      setResultForm((f) => ({ ...f, studentId: '', marksObtained: '', remarks: '' }));
      await loadResultRows(resultForm.examId);
      await load();
    } finally {
      setResultSaving(false);
    }
  };

  const handleDeleteResult = async (id: string) => {
    try {
      const res = await fetch(`/api/results?id=${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('error', (data as { error?: string })?.error ?? 'Unable to delete result');
        return;
      }
      showToast('success', 'Result entry permanently deleted from database.');
      await loadResultRows(resultForm.examId);
      await load();
    } catch {
      showToast('error', 'Network error deleting result.');
    }
  };

  const handleEditResult = (row: ResultRow) => {
    setResultForm({
      examId: row.examId,
      studentId: row.studentId,
      marksObtained: String(Math.round(Number(row.marksObtained))),
      remarks: row.remarks ?? ''
    });
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Filtered exams for Tab 1
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchSearch =
        exam.title.toLowerCase().includes(examSearch.toLowerCase()) ||
        exam.subject.name.toLowerCase().includes(examSearch.toLowerCase()) ||
        exam.class.name.toLowerCase().includes(examSearch.toLowerCase());

      const matchClass = examClassFilter === 'all' || exam.classId === examClassFilter;

      const total = classStudentCount.get(exam.classId) ?? 0;
      const entered = exam.resultsCount ?? 0;
      const isDone = total > 0 && entered >= total;

      const matchStatus =
        examStatusFilter === 'all' ||
        (examStatusFilter === 'completed' && isDone) ||
        (examStatusFilter === 'pending' && !isDone);

      return matchSearch && matchClass && matchStatus;
    });
  }, [exams, examSearch, examClassFilter, examStatusFilter, classStudentCount]);

  return (
    <div className="space-y-5 pb-32 sm:pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-[#1F5A5C] text-white border-[#2D7578]'
              : 'bg-[#dc2626] text-white border-[#b91c1c]'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── 1. Header Banner ────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.05)] border border-[#E2E8F0] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF2F2] px-2.5 py-1 text-[11px] font-bold text-[#1F5A5C]">
              <Sparkles className="h-3 w-3" />
              Academic Management
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">Academics & Examination</h1>
            <p className="mt-1 text-xs text-[#64748B] sm:text-sm">
              Manage curriculum structure, plan evaluation exams, allocate subjects, and record student grades.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={openAddSubjectModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#0F172A] shadow-sm hover:bg-[#F8FAFC] active:scale-[0.98] transition"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#1F5A5C]" />
              Add Subject
            </button>
            <button
              onClick={openAddExamModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1F5A5C] to-[#2D7578] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(31,90,92,0.25)] hover:opacity-95 active:scale-[0.98] transition"
            >
              <Plus className="h-4 w-4" />
              Schedule Exam
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. KPI Metrics Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Classes KPI */}
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E2E8F0] flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF2F2] text-[#1F5A5C]">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Classes</p>
            <p className="text-xl font-bold text-[#0F172A] sm:text-2xl">{classes.length}</p>
            <p className="text-[11px] text-[#64748B] truncate">{totalEnrolledStudents} students enrolled</p>
          </div>
        </div>

        {/* Subjects KPI */}
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E2E8F0] flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Subjects</p>
            <p className="text-xl font-bold text-[#0F172A] sm:text-2xl">{subjects.length}</p>
            <p className="text-[11px] text-[#64748B] truncate">{teachers.length} teachers assigned</p>
          </div>
        </div>

        {/* Exams KPI */}
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E2E8F0] flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706]">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Exams</p>
            <p className="text-xl font-bold text-[#0F172A] sm:text-2xl">{exams.length}</p>
            <p className="text-[11px] text-[#64748B] truncate">Planned & completed</p>
          </div>
        </div>

        {/* Evaluations KPI */}
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E2E8F0] flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#15803D]">
            <Award className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Evaluations</p>
            <p className="text-xl font-bold text-[#0F172A] sm:text-2xl">{totalEvaluations}</p>
            <p className="text-[11px] text-[#64748B] truncate">Student papers graded</p>
          </div>
        </div>
      </div>

      {/* ── 3. Segmented Navigation Tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 rounded-2xl bg-[#E2E8F0]/50 p-1.5 backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('exams')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
            activeTab === 'exams'
              ? 'bg-white text-[#1F5A5C] shadow-sm'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Exams</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === 'exams' ? 'bg-[#EAF2F2] text-[#1F5A5C]' : 'bg-[#E2E8F0] text-[#64748B]'}`}>
            {exams.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
            activeTab === 'results'
              ? 'bg-white text-[#1F5A5C] shadow-sm'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Results &amp; Grades</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === 'results' ? 'bg-[#EAF2F2] text-[#1F5A5C]' : 'bg-[#E2E8F0] text-[#64748B]'}`}>
            {totalEvaluations}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('curriculum')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
            activeTab === 'curriculum'
              ? 'bg-white text-[#1F5A5C] shadow-sm'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Classes &amp; Subjects</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === 'curriculum' ? 'bg-[#EAF2F2] text-[#1F5A5C]' : 'bg-[#E2E8F0] text-[#64748B]'}`}>
            {subjects.length}
          </span>
        </button>
      </div>

      {/* ── 4. TAB 1: EXAMS DIRECTORY ────────────────────────────────────────── */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E2E8F0]">
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search exams, subjects..."
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white pl-9 pr-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                />
              </div>

              {/* Class Filter */}
              <select
                value={examClassFilter}
                onChange={(e) => setExamClassFilter(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {classLabel(c)}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={examStatusFilter}
                onChange={(e) => setExamStatusFilter(e.target.value as 'all' | 'completed' | 'pending')}
                className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Evaluation In Progress</option>
                <option value="completed">All Results Entered</option>
              </select>
            </div>
          </div>

          {/* Exam List Container */}
          {filteredExams.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E2E8F0]">
              <Calendar className="mx-auto h-10 w-10 text-[#94A3B8] opacity-60" />
              <h3 className="mt-3 text-sm font-bold text-[#0F172A]">No exams match your filters</h3>
              <p className="mt-1 text-xs text-[#64748B]">Try clearing your search terms or schedule a new exam.</p>
              <button
                onClick={openAddExamModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#1F5A5C] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#2D7578] transition"
              >
                <Plus className="h-3.5 w-3.5" /> Schedule New Exam
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Card List (Hidden on md+) */}
              <div className="space-y-3 md:hidden">
                {filteredExams.map((exam) => {
                  const total = classStudentCount.get(exam.classId) ?? 0;
                  const entered = exam.resultsCount ?? 0;
                  const isDone = total > 0 && entered >= total;
                  const pct = total > 0 ? Math.min(100, Math.round((entered / total) * 100)) : 0;

                  return (
                    <div
                      key={exam.id}
                      className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E2E8F0] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block rounded-md bg-[#EAF2F2] px-2 py-0.5 text-[10px] font-bold text-[#1F5A5C] uppercase">
                            {exam.examType ?? 'Custom'}
                          </span>
                          <h3 className="mt-1 font-bold text-sm text-[#0F172A]">{exam.title}</h3>
                          <p className="text-xs text-[#64748B]">
                            {exam.class.name} {exam.class.section} • {exam.subject.name}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            isDone ? 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]' : 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]'
                          }`}
                        >
                          {isDone ? 'Completed' : 'Pending'}
                        </span>
                      </div>

                      {/* Marks & Teacher info */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-[#64748B] pt-1 border-t border-[#F1F5F9]">
                        <div>
                          <span className="block text-[10px] uppercase font-semibold text-[#94A3B8]">Due Date</span>
                          <span className="font-medium text-[#0F172A]">
                            {new Date(exam.dueDate ?? exam.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-semibold text-[#94A3B8]">Passing / Total</span>
                          <span className="font-medium text-[#0F172A]">
                            {exam.passingMarks} / {exam.totalMarks} Marks
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-1">
                          <span>Evaluation Progress</span>
                          <span className="font-semibold text-[#0F172A]">{entered} / {total} graded</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${isDone ? 'bg-[#15803d]' : 'bg-[#1F5A5C]'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#F1F5F9]">
                        <button
                          onClick={() => {
                            handleSelectExamForStudents(exam.id);
                            setActiveTab('results');
                          }}
                          className="flex-1 rounded-xl bg-[#EAF2F2] py-2 text-xs font-semibold text-[#1F5A5C] hover:bg-[#d5e7e7] transition text-center"
                        >
                          Enter Grades
                        </button>
                        <button
                          onClick={() => openEditExamModal(exam)}
                          className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setExamToDelete(exam)}
                          className="rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] p-2 text-[#DC2626] hover:bg-[#FEE2E2] transition"
                          aria-label="Delete Exam"
                          title="Permanently Delete Exam"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (Hidden on mobile) */}
              <div className="hidden md:block rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E2E8F0] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        <th className="px-4 py-3.5">Title &amp; Type</th>
                        <th className="px-4 py-3.5">Class &amp; Subject</th>
                        <th className="px-4 py-3.5">Due Date</th>
                        <th className="px-4 py-3.5">Teacher</th>
                        <th className="px-4 py-3.5">Marks Criteria</th>
                        <th className="px-4 py-3.5">Evaluation Progress</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {filteredExams.map((exam) => {
                        const total = classStudentCount.get(exam.classId) ?? 0;
                        const entered = exam.resultsCount ?? 0;
                        const isDone = total > 0 && entered >= total;
                        const pct = total > 0 ? Math.min(100, Math.round((entered / total) * 100)) : 0;

                        return (
                          <tr key={exam.id} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="px-4 py-3 font-semibold text-[#0F172A]">
                              <div className="flex items-center gap-2">
                                <span className="inline-block rounded-md bg-[#EAF2F2] px-2 py-0.5 text-[10px] font-bold text-[#1F5A5C] uppercase">
                                  {exam.examType ?? 'Custom'}
                                </span>
                                <span>{exam.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[#64748B]">
                              <span className="font-semibold text-[#0F172A]">{exam.class.name} {exam.class.section}</span>
                              <span className="block text-[11px] text-[#94A3B8]">{exam.subject.name}</span>
                            </td>
                            <td className="px-4 py-3 text-[#64748B]">
                              {new Date(exam.dueDate ?? exam.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#0F172A]">{exam.teacherName ?? '—'}</td>
                            <td className="px-4 py-3 text-[#0F172A]">
                              <span className="font-semibold">{exam.passingMarks}</span>
                              <span className="text-[#94A3B8]"> / {exam.totalMarks}</span>
                            </td>
                            <td className="px-4 py-3 min-w-[150px]">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[11px] font-semibold text-[#0F172A]">{entered} / {total}</span>
                                <span
                                  className={`rounded-full px-2 py-0.2 text-[9px] font-bold border ${
                                    isDone ? 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]' : 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]'
                                  }`}
                                >
                                  {isDone ? 'Complete' : 'Pending'}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                                <div
                                  className={`h-full ${isDone ? 'bg-[#15803d]' : 'bg-[#1F5A5C]'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    handleSelectExamForStudents(exam.id);
                                    setActiveTab('results');
                                  }}
                                  className="rounded-lg bg-[#EAF2F2] px-2.5 py-1 text-xs font-bold text-[#1F5A5C] hover:bg-[#d9ecec] transition"
                                >
                                  Grades
                                </button>
                                <button
                                  onClick={() => openEditExamModal(exam)}
                                  className="rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs font-semibold text-[#0F172A] hover:bg-white transition"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setExamToDelete(exam)}
                                  className="rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] p-1 text-[#DC2626] hover:bg-[#FEE2E2] transition"
                                  title="Permanently Delete Exam"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 5. TAB 2: RESULTS & EVALUATION ───────────────────────────────────── */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          {/* Exam Selection Header Card */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E2E8F0]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 max-w-md">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                  Select Exam to Evaluate
                </label>
                <select
                  value={resultForm.examId}
                  onChange={(e) => handleSelectExamForStudents(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                >
                  <option value="">-- Choose an examination --</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title} — {exam.class.name} {exam.class.section} ({exam.subject.name})
                    </option>
                  ))}
                </select>
              </div>

              {selectedExam && (
                <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                  <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 text-xs text-[#0F172A]">
                    <span className="text-[#64748B]">Passing:</span> <span className="font-bold">{selectedExam.passingMarks}</span> / {selectedExam.totalMarks}
                  </div>
                  <div className="rounded-xl bg-[#EAF2F2] border border-[#bbf7d0]/40 px-3 py-1.5 text-xs text-[#1F5A5C] font-semibold">
                    {resultRows.length} / {classStudentCount.get(selectedExam.classId) ?? 0} Evaluated
                  </div>
                </div>
              )}
            </div>
          </div>

          {!selectedExam ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E2E8F0]">
              <Award className="mx-auto h-12 w-12 text-[#94A3B8] opacity-50" />
              <h3 className="mt-3 text-base font-bold text-[#0F172A]">Select an Exam Above</h3>
              <p className="mt-1 text-xs text-[#64748B] max-w-sm mx-auto">
                Select any scheduled examination from the dropdown menu to enter student marks, calculate automated grades, and review evaluations.
              </p>
            </div>
          ) : (
            <>
              {/* Grading Entry Card */}
              <div className="rounded-2xl bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E2E8F0]">
                <h3 className="text-sm font-bold text-[#0F172A] mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#1F5A5C]" />
                  Grade Student
                </h3>

                <form onSubmit={handleSaveResult} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Student Picker */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                        Student
                      </label>
                      <select
                        value={resultForm.studentId}
                        onChange={(e) => setResultForm((f) => ({ ...f, studentId: e.target.value }))}
                        required
                        disabled={loadingExamStudents}
                        className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition disabled:opacity-60"
                      >
                        <option value="">{loadingExamStudents ? 'Loading students...' : '-- Select Student --'}</option>
                        {examStudents.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.fullName} ({st.admissionNo})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Marks Input & Dynamic Grade Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                          Obtained Marks (max {selectedExam.totalMarks})
                        </label>
                        {previewGrade && (
                          <span className={`rounded px-1.5 py-0.2 text-[10px] font-bold border ${gradeBadgeClass(previewGrade)}`}>
                            Grade: {previewGrade}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={selectedExam.totalMarks}
                        placeholder={`0 - ${selectedExam.totalMarks}`}
                        value={resultForm.marksObtained}
                        onChange={(e) => setResultForm((f) => ({ ...f, marksObtained: e.target.value }))}
                        required
                        className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                      />
                    </div>

                    {/* Remarks Input */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                        Teacher Remarks / Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Excellent recitation, needs tajweed revision"
                        value={resultForm.remarks}
                        onChange={(e) => setResultForm((f) => ({ ...f, remarks: e.target.value }))}
                        className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={resultSaving || !resultForm.studentId || resultForm.marksObtained === ''}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1F5A5C] to-[#2D7578] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resultSaving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Save Grade
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Evaluated Students Table / Cards */}
              <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E2E8F0] overflow-hidden">
                <div className="border-b border-[#E2E8F0] px-5 py-3.5 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    Evaluated Students ({resultRows.length})
                  </h3>
                  {resultLoading && <Loader2 className="h-4 w-4 animate-spin text-[#1F5A5C]" />}
                </div>

                {resultRows.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#64748B]">
                    No student results recorded for this exam yet. Use the form above to add results.
                  </div>
                ) : (
                  <>
                    {/* Mobile Cards View */}
                    <div className="divide-y divide-[#E2E8F0] md:hidden">
                      {resultRows.map((row) => (
                        <div key={row.id} className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-sm text-[#0F172A]">{row.student.user.fullName}</p>
                              <p className="text-xs text-[#64748B] mt-0.5">
                                Marks: <span className="font-semibold text-[#0F172A]">{Math.round(Number(row.marksObtained))}</span> / {selectedExam.totalMarks}
                              </p>
                            </div>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-bold border ${gradeBadgeClass(row.grade)}`}>
                              {row.grade}
                            </span>
                          </div>

                          {row.remarks && (
                            <p className="text-xs text-[#64748B] italic bg-[#F8FAFC] rounded-lg p-2 border border-[#E2E8F0]">
                              &ldquo;{row.remarks}&rdquo;
                            </p>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => handleEditResult(row)}
                              className="rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteResult(row.id)}
                              className="rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] px-2.5 py-1 text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2]"
                              title="Permanently Delete Result"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                            <th className="px-5 py-3">Student Name</th>
                            <th className="px-5 py-3">Marks Obtained</th>
                            <th className="px-5 py-3">Grade</th>
                            <th className="px-5 py-3">Remarks</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {resultRows.map((row) => (
                            <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                              <td className="px-5 py-3 font-semibold text-[#0F172A]">{row.student.user.fullName}</td>
                              <td className="px-5 py-3 font-bold text-[#0F172A]">
                                {Math.round(Number(row.marksObtained))}
                                <span className="font-normal text-[#94A3B8]"> / {selectedExam.totalMarks}</span>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold border ${gradeBadgeClass(row.grade)}`}>
                                  {row.grade}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-[#64748B] max-w-xs truncate">{row.remarks || '—'}</td>
                              <td className="px-5 py-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleEditResult(row)}
                                    className="rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs font-semibold text-[#0F172A] hover:bg-white transition"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteResult(row.id)}
                                    className="rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] p-1 text-[#DC2626] hover:bg-[#FEE2E2] transition"
                                    title="Permanently Delete Result"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 6. TAB 3: CLASSES & SUBJECTS CURRICULUM ─────────────────────────── */}
      {activeTab === 'curriculum' && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Classes Directory Card */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Classes Directory</h3>
                <p className="text-xs text-[#64748B]">Active academic class sections and rosters</p>
              </div>
              <a
                href="/admin/classes"
                className="inline-flex items-center gap-1 rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] shadow-sm hover:bg-[#F8FAFC] transition"
              >
                <span>Manage in Classes</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 flex items-center justify-between gap-3 hover:border-[#1F5A5C]/40 transition"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-[#0F172A]">{cls.name} – {cls.section}</p>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Session {cls.academicYear} {cls.roomNo ? `• Room ${cls.roomNo}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-lg bg-white border border-[#E2E8F0] px-2.5 py-1 text-xs font-semibold text-[#0F172A]">
                      {cls._count?.students ?? 0} Students
                    </span>
                    <span className="rounded-lg bg-white border border-[#E2E8F0] px-2.5 py-1 text-xs font-semibold text-[#1F5A5C]">
                      {cls._count?.subjects ?? 0} Subjects
                    </span>
                    <a
                      href="/admin/classes"
                      className="rounded-lg border border-[#E2E8F0] bg-white p-1 text-[#64748B] hover:text-[#0F172A] transition"
                      title="Manage Class"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subjects Directory Card */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Curriculum Subjects</h3>
                <p className="text-xs text-[#64748B]">Subjects mapped to teachers and classes</p>
              </div>
              <button
                onClick={openAddSubjectModal}
                className="inline-flex items-center gap-1 rounded-xl bg-[#1F5A5C] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#2D7578] transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {subjects.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 flex items-center justify-between gap-3 hover:border-[#1F5A5C]/40 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-white border border-[#E2E8F0] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#64748B]">
                        {sub.code}
                      </span>
                      <p className="font-bold text-sm text-[#0F172A] truncate">{sub.name}</p>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1">
                      {sub.class ? `${sub.class.name} ${sub.class.section}` : 'Unassigned Class'}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F172A]">
                      <UserCheck className="h-3.5 w-3.5 text-[#1F5A5C]" />
                      {sub.teacher?.user.fullName ?? 'No Teacher'}
                    </span>
                    <button
                      onClick={() => setSubjectToDelete(sub)}
                      className="rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] p-1.5 text-[#DC2626] hover:bg-[#FEE2E2] transition"
                      title="Permanently Delete Subject"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. MODALS ────────────────────────────────────────────────────────── */}

      {/* Exam Scheduling Modal */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#E2E8F0] p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#0F172A]">
                  {examForm.id ? 'Edit Examination' : 'Schedule Examination'}
                </h3>
                <p className="text-xs text-[#64748B]">Configure exam criteria, passing thresholds, and target class.</p>
              </div>
              <button
                onClick={() => setIsExamModalOpen(false)}
                className="rounded-lg p-1 text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Exam Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Midterm Evaluation, 1st Quarter Test"
                  value={examForm.title}
                  onChange={(e) => setExamForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Exam Type
                  </label>
                  <select
                    value={examForm.examType}
                    onChange={(e) => setExamForm((f) => ({ ...f, examType: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                  >
                    {EXAM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Target Class
                  </label>
                  <select
                    value={examForm.classId}
                    onChange={(e) => setExamForm((f) => ({ ...f, classId: e.target.value, subjectId: '' }))}
                    required
                    className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                  >
                    <option value="">-- Choose Class --</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {classLabel(cls)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Subject
                  </label>
                  <select
                    value={examForm.subjectId}
                    onChange={(e) => setExamForm((f) => ({ ...f, subjectId: e.target.value }))}
                    required
                    className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                  >
                    <option value="">-- Choose Subject --</option>
                    {filteredSubjectsForExamForm.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Due / Exam Date
                  </label>
                  <input
                    type="date"
                    value={examForm.dueDate}
                    onChange={(e) => setExamForm((f) => ({ ...f, dueDate: e.target.value }))}
                    required
                    className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={examForm.totalMarks}
                    onChange={(e) => setExamForm((f) => ({ ...f, totalMarks: e.target.value }))}
                    required
                    className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Passing Marks
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={Number(examForm.totalMarks) || 100}
                    value={examForm.passingMarks}
                    onChange={(e) => setExamForm((f) => ({ ...f, passingMarks: e.target.value }))}
                    required
                    className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Responsible Teacher
                </label>
                <select
                  value={examForm.createdByTeacherId}
                  onChange={(e) => setExamForm((f) => ({ ...f, createdByTeacherId: e.target.value }))}
                  required
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                >
                  <option value="">-- Assign Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={examSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1F5A5C] to-[#2D7578] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition disabled:opacity-60"
                >
                  {examSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {examForm.id ? 'Save Changes' : 'Schedule Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#E2E8F0] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#0F172A]">Add New Subject</h3>
                <p className="text-xs text-[#64748B]">Map subject to class and assigned teacher.</p>
              </div>
              <button
                onClick={() => setIsSubjectModalOpen(false)}
                className="rounded-lg p-1 text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hifz Al-Quran, Tajweed, Islamic Studies"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HIFZ-101"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm((f) => ({ ...f, code: e.target.value }))}
                    required
                    className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                    Credit Hours
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={subjectForm.creditHours}
                    onChange={(e) => setSubjectForm((f) => ({ ...f, creditHours: Number(e.target.value) }))}
                    className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Target Class
                </label>
                <select
                  value={subjectForm.classId}
                  onChange={(e) => setSubjectForm((f) => ({ ...f, classId: e.target.value }))}
                  required
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {classLabel(cls)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Assign Teacher (Optional)
                </label>
                <select
                  value={subjectForm.teacherId}
                  onChange={(e) => setSubjectForm((f) => ({ ...f, teacherId: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C] focus:ring-1 focus:ring-[#1F5A5C] transition"
                >
                  <option value="">-- None / Unassigned --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subjectSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1F5A5C] to-[#2D7578] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition disabled:opacity-60"
                >
                  {subjectSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Exam Confirmation Modal */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-[#E2E8F0] p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#0F172A]">Delete Examination?</h3>
              <p className="mt-1 text-xs text-[#64748B]">
                Are you sure you want to permanently delete <span className="font-semibold text-[#0F172A]">&ldquo;{examToDelete.title}&rdquo;</span> from the database?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExamToDelete(null)}
                className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteExam}
                disabled={examDeleting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] py-2.5 text-xs font-semibold text-white hover:bg-[#B91C1C] transition disabled:opacity-60"
              >
                {examDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Subject Confirmation Modal */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-[#E2E8F0] p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#0F172A]">Delete Subject?</h3>
              <p className="mt-1 text-xs text-[#64748B]">
                Are you sure you want to permanently delete <span className="font-semibold text-[#0F172A]">&ldquo;{subjectToDelete.name}&rdquo;</span> ({subjectToDelete.code}) from the database?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSubject}
                disabled={subjectDeleting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] py-2.5 text-xs font-semibold text-white hover:bg-[#B91C1C] transition disabled:opacity-60"
              >
                {subjectDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
