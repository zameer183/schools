'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type StudentItem = {
  id: string;
  admissionNo: string;
  fullName: string;
};

type ExamResultItem = {
  studentId: string;
  marksObtained: number;
  remarks: string | null;
};

type ExamItem = {
  id: string;
  title: string;
  examType: string;
  examDateLabel: string;
  examDateRaw: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  classLabel: string;
  totalMarks: number;
  passingMarks: number;
  results: ExamResultItem[];
};

function gradeFor(marks: number, total: number) {
  const pct = (marks / total) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

const TAJWEED_QUALITIES = ['Excellent', 'Good', 'Needs Practice'] as const;

type ReportDraft = {
  quality: string;
  mistakes: string;
  remarks: string;
};

function emptyReportDraft(): ReportDraft {
  return { quality: '', mistakes: '', remarks: '' };
}

function parseReportDraft(remarks: string | null | undefined): ReportDraft {
  if (!remarks) return emptyReportDraft();
  const draft = emptyReportDraft();
  const otherLines: string[] = [];

  for (const line of remarks.split('\n')) {
    const trimmed = line.trim();
    const [rawLabel, ...rest] = trimmed.split(':');
    const value = rest.join(':').trim();
    const label = rawLabel.trim().toLowerCase();
    if (label === 'tajweed quality' || label === 'تجوید کی کیفیت') {
      draft.quality = value;
    } else if (label === 'mistakes' || label === 'ghaltiyan' || label === 'غلطیاں') {
      draft.mistakes = value === '-' ? '' : value;
    } else if (label === 'remarks' || label === 'نوٹ') {
      draft.remarks = value;
    } else if (trimmed) {
      otherLines.push(trimmed);
    }
  }

  if (!draft.remarks && otherLines.length) draft.remarks = otherLines.join('\n');
  return draft;
}

export function TeacherResultsEntryClient({
  exams,
  students
}: {
  exams: ExamItem[];
  students: StudentItem[];
}) {
  const router = useRouter();
  const [activeExamId, setActiveExamId] = useState(exams[0]?.id ?? '');
  const [draftMarks, setDraftMarks] = useState<Record<string, string>>({});
  const [reportDrafts, setReportDrafts] = useState<Record<string, ReportDraft>>({});
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [updatingExam, setUpdatingExam] = useState(false);
  const [deletingExam, setDeletingExam] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [banner, setBanner] = useState('');
  const [examForm, setExamForm] = useState({
    title: '',
    examType: 'Custom',
    dueDate: '',
    totalMarks: '100',
    passingMarks: '50'
  });

  const activeExam = useMemo(
    () => exams.find((exam) => exam.id === activeExamId) ?? exams[0] ?? null,
    [activeExamId, exams]
  );

  const savedMap = useMemo(() => {
    if (!activeExam) return new Map<string, number>();
    return new Map(activeExam.results.map((r) => [r.studentId, Number(r.marksObtained)]));
  }, [activeExam]);

  const savedReportMap = useMemo(() => {
    if (!activeExam) return new Map<string, ReportDraft>();
    return new Map(activeExam.results.map((r) => [r.studentId, parseReportDraft(r.remarks)]));
  }, [activeExam]);

  const reportFor = (studentId: string) => reportDrafts[studentId] ?? savedReportMap.get(studentId) ?? emptyReportDraft();

  const updateReport = (studentId: string, updates: Partial<ReportDraft>) => {
    setReportDrafts((prev) => ({
      ...prev,
      [studentId]: { ...reportFor(studentId), ...updates }
    }));
  };

  const resultPayload = (studentId: string, marks: number) => {
    const report = reportFor(studentId);
    return {
      examId: activeExam?.id,
      studentId,
      subjectId: activeExam?.subjectId,
      marksObtained: marks,
      grade: activeExam ? gradeFor(marks, activeExam.totalMarks) : '',
      quality: report.quality,
      mistakes: report.mistakes.trim(),
      remarks: report.remarks.trim()
    };
  };

  const startEdit = () => {
    if (!activeExam) return;
    setExamForm({
      title: activeExam.title,
      examType: activeExam.examType || 'Custom',
      dueDate: activeExam.examDateRaw,
      totalMarks: String(activeExam.totalMarks),
      passingMarks: String(activeExam.passingMarks ?? 0)
    });
    setEditOpen(true);
    setBanner('');
  };

  const saveExamEdit = async () => {
    if (!activeExam) return;
    const totalMarks = Number(examForm.totalMarks);
    const passingMarks = Number(examForm.passingMarks);
    if (!examForm.title.trim() || !examForm.dueDate) {
      setBanner('Exam title and date are required.');
      return;
    }
    if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
      setBanner('Total marks must be greater than 0.');
      return;
    }
    if (!Number.isFinite(passingMarks) || passingMarks < 0 || passingMarks > totalMarks) {
      setBanner('Passing marks must be between 0 and total marks.');
      return;
    }

    setUpdatingExam(true);
    setBanner('');
    const res = await fetch('/api/exams', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: activeExam.id,
        title: examForm.title.trim(),
        examType: examForm.examType,
        classId: activeExam.classId,
        subjectId: activeExam.subjectId,
        dueDate: examForm.dueDate,
        totalMarks,
        passingMarks
      })
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setBanner(data?.error ?? 'Unable to update exam.');
      setUpdatingExam(false);
      return;
    }
    setUpdatingExam(false);
    setEditOpen(false);
    setBanner('Exam updated successfully.');
    router.refresh();
  };

  const deleteExam = async () => {
    if (!activeExam) return;
    const hasSavedResults = activeExam.results.length > 0;
    const ok = window.confirm(
      hasSavedResults
        ? `Delete exam "${activeExam.title}" and all saved results?`
        : `Delete exam "${activeExam.title}"?`
    );
    if (!ok) return;

    setDeletingExam(true);
    setBanner('');
    const deleteUrl = `/api/exams?id=${activeExam.id}${hasSavedResults ? '&force=1' : ''}`;
    const res = await fetch(deleteUrl, { method: 'DELETE' });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;

    if (res.status === 409) {
      const forceOk = window.confirm('This exam has results. Delete exam with all saved results?');
      if (!forceOk) {
        setDeletingExam(false);
        return;
      }
      const forceRes = await fetch(`/api/exams?id=${activeExam.id}&force=1`, { method: 'DELETE' });
      const forceData = (await forceRes.json().catch(() => null)) as { error?: string } | null;
      if (!forceRes.ok) {
        setBanner(forceData?.error ?? 'Unable to delete exam.');
        setDeletingExam(false);
        return;
      }
      setBanner('Exam deleted successfully.');
      setDeletingExam(false);
      router.refresh();
      return;
    }

    if (!res.ok) {
      setBanner(data?.error ?? 'Unable to delete exam.');
      setDeletingExam(false);
      return;
    }

    setBanner('Exam deleted successfully.');
    setDeletingExam(false);
    router.refresh();
  };

  const saveOne = async (studentId: string) => {
    if (!activeExam) return;
    const raw = draftMarks[studentId];
    if (raw === undefined || raw === '') return;
    const marks = Number(raw);
    if (!Number.isFinite(marks) || marks < 0 || marks > activeExam.totalMarks) {
      setBanner(`Marks must be between 0 and ${activeExam.totalMarks}.`);
      return;
    }

    setSavingStudentId(studentId);
    setBanner('');
    const res = await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resultPayload(studentId, marks))
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setBanner(data?.error ?? 'Unable to save marks.');
      setSavingStudentId(null);
      return;
    }
    setSavingStudentId(null);
    setBanner('Marks saved successfully.');
    router.refresh();
  };

  const saveAll = async () => {
    if (!activeExam) return;

    const rows = students
      .map((student) => {
        const savedMarks = savedMap.get(student.id);
        const raw = draftMarks[student.id] ?? (savedMarks !== undefined ? String(savedMarks) : '');
        return { student, raw };
      })
      .filter((row) => row.raw !== '');

    if (!rows.length) {
      setBanner('Enter marks for at least one student.');
      return;
    }

    for (const row of rows) {
      const marks = Number(row.raw);
      if (!Number.isFinite(marks) || marks < 0 || marks > activeExam.totalMarks) {
        setBanner(`${row.student.fullName}: marks must be between 0 and ${activeExam.totalMarks}.`);
        return;
      }
    }

    setSavingAll(true);
    setBanner('');

    for (const row of rows) {
      const marks = Number(row.raw);
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultPayload(row.student.id, marks))
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setBanner(data?.error ?? `Unable to save marks for ${row.student.fullName}.`);
        setSavingAll(false);
        return;
      }
    }

    setSavingAll(false);
    setBanner(`Saved marks for ${rows.length} student${rows.length === 1 ? '' : 's'}.`);
    router.refresh();
  };

  if (!activeExam) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-4">
        <p className="px-1 text-xs font-bold uppercase tracking-widest text-[#40474F]">Select Exam</p>
        {exams.map((exam) => (
          <button
            key={exam.id}
            type="button"
            onClick={() => setActiveExamId(exam.id)}
            className={`w-full rounded-lg border p-4 text-left transition duration-200 ${exam.id === activeExam.id ? 'border-[#084750]/25 bg-[#EFFFFC] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_6px_rgba(15,23,42,0.05)]' : 'border-[#E0E3E5] bg-white hover:bg-[#F7F9FB]'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[#191C1E]">{exam.title}</p>
                <p className="mt-0.5 text-xs text-[#40474F]">{exam.subjectName} - {exam.classLabel}</p>
              </div>
              <span className="rounded-full bg-[#E6F4F1] px-2 py-0.5 text-[10px] font-semibold text-[#084750]">
                {exam.examType}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-[#40474F]">
              <span className="rounded-full bg-[#ECEEF0] px-2 py-0.5">{exam.examDateLabel}</span>
              <span className="rounded-full bg-[#ECEEF0] px-2 py-0.5">Max {exam.totalMarks}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-5 lg:col-span-8">
        <section className="rounded-lg border border-[#084750]/20 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_6px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold text-[#084750]">{activeExam.title}</h3>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-[#E6F4F1] px-3 py-1 text-[#084750]">{activeExam.subjectName}</span>
                <span className="rounded-full bg-[#F7E8CF] px-3 py-1 text-[#7A521F]">{activeExam.examType}</span>
                <span className="rounded-full bg-[#ECEEF0] px-3 py-1 text-[#40474F]">{activeExam.classLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startEdit}
                className="rounded-lg p-2 text-[#084750] transition hover:bg-[#E6F4F1]"
                aria-label="Edit exam"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={deleteExam}
                disabled={deletingExam}
                className="rounded-lg p-2 text-[#BA1A1A] transition hover:bg-[#FFDAD6] disabled:opacity-60"
                aria-label="Delete exam"
              >
                {deletingExam ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
          <div className="mt-4 flex gap-5 border-t border-[#E0E3E5] pt-4">
            <div>
              <p className="text-xs text-[#40474F]">Date</p>
              <p className="text-sm font-semibold text-[#191C1E]">{activeExam.examDateLabel}</p>
            </div>
            <div className="h-10 w-px bg-[#E0E3E5]" />
            <div>
              <p className="text-xs text-[#40474F]">Pass Marks</p>
              <p className="text-sm font-bold text-[#084750]">{activeExam.passingMarks}</p>
            </div>
            <div className="h-10 w-px bg-[#E0E3E5]" />
            <div>
              <p className="text-xs text-[#40474F]">Max Marks</p>
              <p className="text-sm font-bold text-[#191C1E]">{activeExam.totalMarks}</p>
            </div>
          </div>

          {editOpen ? (
            <div className="mt-4 grid gap-2 rounded-lg border border-[#E0E3E5] bg-[#F7F9FB] p-3 sm:grid-cols-2">
              <input
                value={examForm.title}
                onChange={(e) => setExamForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Exam title"
                className="h-10 rounded-lg border border-[#C0C7D1] bg-white px-3 text-sm outline-none focus:border-[#084750] focus:ring-2 focus:ring-[#084750]/10"
              />
              <select
                value={examForm.examType}
                onChange={(e) => setExamForm((p) => ({ ...p, examType: e.target.value }))}
                className="h-10 rounded-lg border border-[#C0C7D1] bg-white px-3 text-sm outline-none focus:border-[#084750] focus:ring-2 focus:ring-[#084750]/10"
              >
                <option>One Juzz</option>
                <option>5 Juzz</option>
                <option>10 Juzz</option>
                <option>Full Revision</option>
                <option>Custom</option>
              </select>
              <input
                type="date"
                value={examForm.dueDate}
                onChange={(e) => setExamForm((p) => ({ ...p, dueDate: e.target.value }))}
                className="h-10 rounded-lg border border-[#C0C7D1] bg-white px-3 text-sm outline-none focus:border-[#084750] focus:ring-2 focus:ring-[#084750]/10"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  value={examForm.totalMarks}
                  onChange={(e) => setExamForm((p) => ({ ...p, totalMarks: e.target.value }))}
                  placeholder="Total"
                  className="h-10 rounded-lg border border-[#C0C7D1] bg-white px-3 text-sm outline-none focus:border-[#084750] focus:ring-2 focus:ring-[#084750]/10"
                />
                <input
                  type="number"
                  min={0}
                  value={examForm.passingMarks}
                  onChange={(e) => setExamForm((p) => ({ ...p, passingMarks: e.target.value }))}
                  placeholder="Passing"
                  className="h-10 rounded-lg border border-[#C0C7D1] bg-white px-3 text-sm outline-none focus:border-[#084750] focus:ring-2 focus:ring-[#084750]/10"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-lg border border-[#C0C7D1] bg-white px-3 py-2 text-xs font-semibold text-[#40474F]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveExamEdit}
                  disabled={updatingExam}
                  className="rounded-lg bg-[#084750] px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  {updatingExam ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-lg border border-[#E6E8EA] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_6px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between border-b border-[#E0E3E5] p-5">
            <h3 className="text-2xl font-semibold text-[#191C1E]">Student List</h3>
            <button
              className="rounded-lg px-3 py-2 text-sm font-bold text-[#084750] transition hover:bg-[#E6F4F1] disabled:opacity-60"
              type="button"
              onClick={saveAll}
              disabled={savingAll || savingStudentId !== null}
            >
              {savingAll ? 'Saving...' : 'Save All'}
            </button>
          </div>
          <div className="divide-y divide-[#E0E3E5]">
            {students.map((student) => {
              const savedMarks = savedMap.get(student.id);
              const currentValue = draftMarks[student.id] ?? (savedMarks !== undefined ? String(savedMarks) : '');
              const isSaving = savingStudentId === student.id;
              const report = reportFor(student.id);
              return (
                <div key={student.id} className="p-4 transition hover:bg-[#F7F9FB]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#89F5E7] text-sm font-bold text-[#005049]">
                      {initials(student.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#191C1E]">{student.fullName}</p>
                      <p className="text-xs text-[#40474F]">ID: #{student.admissionNo}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={activeExam.totalMarks}
                        value={currentValue}
                        onChange={(e) => setDraftMarks((prev) => ({ ...prev, [student.id]: e.target.value }))}
                        className="h-10 w-14 rounded-lg border border-[#C0C7D1] bg-white px-2 text-center text-sm text-[#191C1E] outline-none focus:border-[#084750]"
                        placeholder="-"
                      />
                      <button
                        type="button"
                        onClick={() => saveOne(student.id)}
                        disabled={isSaving || savingAll}
                        className="h-10 rounded-lg bg-[#084750] px-3 text-xs font-bold text-white shadow-sm disabled:opacity-60"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 rounded-lg border border-[#E0E3E5] bg-[#F7F9FB] p-3 sm:grid-cols-2">
                    <label className="min-w-0">
                      <span className="mb-1 block text-[11px] font-semibold text-[#40474F]">Tajweed Quality (optional)</span>
                      <select
                        value={report.quality}
                        onChange={(e) => updateReport(student.id, { quality: e.target.value })}
                        className="h-10 w-full rounded-lg border border-[#C0C7D1] bg-white px-3 text-sm text-[#191C1E] outline-none focus:border-[#084750]"
                      >
                        <option value="">Select quality</option>
                        {TAJWEED_QUALITIES.map((quality) => (
                          <option key={quality} value={quality}>{quality}</option>
                        ))}
                      </select>
                    </label>
                    <label className="min-w-0">
                      <span className="mb-1 block text-[11px] font-semibold text-[#40474F]">Ghaltiyan / Mistakes (optional)</span>
                      <input
                        value={report.mistakes}
                        onChange={(e) => updateReport(student.id, { mistakes: e.target.value })}
                        className="h-10 w-full rounded-lg border border-[#C0C7D1] bg-white px-3 text-sm text-[#191C1E] outline-none focus:border-[#084750]"
                        placeholder="e.g., ghunna, madd, qalqalah"
                      />
                    </label>
                    <label className="min-w-0 sm:col-span-2">
                      <span className="mb-1 block text-[11px] font-semibold text-[#40474F]">Complete Report / Remarks (optional)</span>
                      <textarea
                        value={report.remarks}
                        onChange={(e) => updateReport(student.id, { remarks: e.target.value })}
                        className="min-h-[68px] w-full rounded-lg border border-[#C0C7D1] bg-white px-3 py-2 text-sm text-[#191C1E] outline-none focus:border-[#084750]"
                        placeholder="Student report notes..."
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-white p-5 text-center">
            <button type="button" className="text-sm font-bold text-[#084750]">Load More Students</button>
          </div>
          {banner ? <p className="border-t border-[#E0E3E5] p-4 text-sm text-[#084750]">{banner}</p> : null}
        </section>
      </div>
    </div>
  );
}
