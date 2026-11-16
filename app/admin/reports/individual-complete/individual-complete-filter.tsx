'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type FilterStudent = {
  id: string;
  fullName: string;
  admissionNo: string | null;
  classId: string | null;
};

export type FilterClass = {
  id: string;
  name: string;
  section: string;
};

type Props = {
  classes: FilterClass[];
  allStudents: FilterStudent[];
  initialClassId: string;
  initialStudentId: string;
  initialFrom: string;
  initialTo: string;
};

export default function IndividualCompleteFilter({
  classes,
  allStudents,
  initialClassId,
  initialStudentId,
  initialFrom,
  initialTo
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);

  useEffect(() => {
    setSelectedClassId(initialClassId);
  }, [initialClassId]);

  useEffect(() => {
    setSelectedStudentId(initialStudentId);
  }, [initialStudentId]);

  useEffect(() => {
    setFromDate(initialFrom);
  }, [initialFrom]);

  useEffect(() => {
    setToDate(initialTo);
  }, [initialTo]);

  // Filter students based on selected class, strictly sorted alphabetically A to Z
  const availableStudents = useMemo(() => {
    const list =
      selectedClassId === 'all'
        ? allStudents
        : allStudents.filter((s) => s.classId === selectedClassId);

    return [...list].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' })
    );
  }, [allStudents, selectedClassId]);

  const navigate = (classId: string, studentId: string, from: string, to: string) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (classId !== 'all') params.set('classId', classId);
      if (studentId) params.set('studentId', studentId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      router.push(`/admin/reports/individual-complete?${params.toString()}`);
    });
  };

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);

    const matching =
      newClassId === 'all'
        ? allStudents
        : allStudents.filter((s) => s.classId === newClassId);
    const sortedMatching = [...matching].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' })
    );

    // If the currently selected student is in the new class, keep them; otherwise select the first student
    const nextStudentId = sortedMatching.some((s) => s.id === selectedStudentId)
      ? selectedStudentId
      : sortedMatching[0]?.id ?? '';

    setSelectedStudentId(nextStudentId);
    navigate(newClassId, nextStudentId, fromDate, toDate);
  };

  const handleStudentChange = (newStudentId: string) => {
    setSelectedStudentId(newStudentId);
    navigate(selectedClassId, newStudentId, fromDate, toDate);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(selectedClassId, selectedStudentId, fromDate, toDate);
  };

  return (
    <form onSubmit={handleApply} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-xs font-semibold text-[#64748b] lg:col-span-1">
        Class
        <select
          name="classId"
          value={selectedClassId}
          onChange={(e) => handleClassChange(e.target.value)}
          className="mt-1 h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] focus:border-[#1F5A5C] focus:outline-none focus:ring-1 focus:ring-[#1F5A5C] transition"
        >
          <option value="all">All Classes</option>
          {classes.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>
              {classItem.name} {classItem.section}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-semibold text-[#64748b] lg:col-span-2">
        Student
        <select
          name="studentId"
          value={selectedStudentId}
          onChange={(e) => handleStudentChange(e.target.value)}
          className="mt-1 h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] focus:border-[#1F5A5C] focus:outline-none focus:ring-1 focus:ring-[#1F5A5C] transition"
          disabled={availableStudents.length === 0}
        >
          {availableStudents.length === 0 ? (
            <option value="">No students in selected class</option>
          ) : (
            availableStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName}
              </option>
            ))
          )}
        </select>
      </label>

      <label className="text-xs font-semibold text-[#64748b]">
        From
        <input
          type="date"
          name="from"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="mt-1 h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] focus:border-[#1F5A5C] focus:outline-none focus:ring-1 focus:ring-[#1F5A5C] transition"
        />
      </label>

      <label className="text-xs font-semibold text-[#64748b]">
        To
        <input
          type="date"
          name="to"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="mt-1 h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] focus:border-[#1F5A5C] focus:outline-none focus:ring-1 focus:ring-[#1F5A5C] transition"
        />
      </label>

      <div className="sm:col-span-2 lg:col-span-5">
        <button
          type="submit"
          disabled={isPending}
          className="flex h-10 w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#1F5A5C] to-[#2D7578] text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Updating...
            </span>
          ) : (
            'Apply'
          )}
        </button>
      </div>
    </form>
  );
}
