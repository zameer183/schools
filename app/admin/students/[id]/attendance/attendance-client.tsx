'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Download, Share2 } from 'lucide-react';

type AttendanceRecord = {
  date: string | Date;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
};

type StudentData = {
  id: string;
  user: { fullName: string; isActive: boolean };
  class: { name: string; section: string } | null;
  joinDate: string | null;
  admissionNo: string;
  attendance: AttendanceRecord[];
  whatsApp: string | null;
  guardianPhone: string | null;
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export default function StudentAttendanceClient({ student }: { student: StudentData }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const attendanceMap = new Map(
    student.attendance.map((record) => [
      new Date(record.date).toDateString(),
      record.status
    ])
  );

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const monthAttendance = student.attendance.filter((record) => {
    const date = new Date(record.date);
    return date >= monthStart && date <= monthEnd;
  });

  const stats = {
    present: monthAttendance.filter((r) => r.status === 'PRESENT').length,
    absent: monthAttendance.filter((r) => r.status === 'ABSENT').length,
    late: monthAttendance.filter((r) => r.status === 'LATE').length,
    leave: monthAttendance.filter((r) => r.status === 'EXCUSED').length
  };

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < adjustedFirstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const classInfo = student.class ? `${student.class.name} ${student.class.section || ''}` : 'N/A';

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDownload = () => {
    const rows = [
      ['Date', 'Day', 'Status'],
      ...monthAttendance
        .map((r) => {
          const d = new Date(r.date);
          return [
            d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            d.toLocaleDateString('en-US', { weekday: 'long' }),
            r.status
          ];
        })
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    ];

    const header = [
      `Student: ${student.user.fullName}`,
      `Admission No: ${student.admissionNo}`,
      `Class: ${classInfo}`,
      `Month: ${monthName}`,
      `Present: ${stats.present}  Absent: ${stats.absent}  Late: ${stats.late}  Leave: ${stats.leave}`,
      ''
    ].join('\n');

    const csv = header + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${student.user.fullName.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    const waPhone = (student.whatsApp || student.guardianPhone || '').replace(/[^0-9+]/g, '');
    if (!waPhone) return;
    const message = encodeURIComponent(
      `📅 Attendance Report\n\nStudent: ${student.user.fullName}\nMonth: ${monthName}\n\n✅ Present: ${stats.present}\n❌ Absent: ${stats.absent}\n🕒 Late: ${stats.late}\n📋 Leave: ${stats.leave}`
    );
    window.open(`https://wa.me/${waPhone}?text=${message}`, '_blank');
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-[#f1f5f9] text-[#94a3b8]';
    if (status === 'PRESENT') return 'bg-[#dcfce7] text-[#15803d]';
    if (status === 'ABSENT') return 'bg-[#fee2e2] text-[#b91c1c]';
    if (status === 'LATE') return 'bg-[#fff7ed] text-[#b45309]';
    if (status === 'EXCUSED') return 'bg-[#eff6ff] text-[#1d4ed8]';
    return 'bg-[#f1f5f9] text-[#94a3b8]';
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] p-4">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Back Link */}
        <Link href={`/admin/students/${student.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#004649] hover:text-[#1b5e62] transition">
          <ChevronLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        {/* Hero Card */}
        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#dcfce7] to-[#bbf7d0] text-lg font-bold text-[#15803d] ring-4 ring-[#f0fdf4]">
              {initials(student.user.fullName)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#111827]">{student.user.fullName}</h1>
                {student.user.isActive ? (
                  <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[9px] font-bold uppercase text-[#15803d]">Active</span>
                ) : (
                  <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[9px] font-bold uppercase text-[#b91c1c]">Inactive</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[#6b7280]">
                {classInfo} • Admission: <span className="font-semibold text-[#374151]">{student.admissionNo}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Calendar Card */}
        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] p-5">
          {/* Month Navigation */}
          <div className="mb-5 flex items-center justify-between">
            <button onClick={handlePrevMonth}
              className="h-11 w-11 flex items-center justify-center rounded-xl bg-[#f0f2f5] hover:bg-[#e2e8e8] transition">
              <ChevronLeft size={18} className="text-[#1a1c1c]" />
            </button>
            <h3 className="font-semibold text-[#1a1c1c]">{monthName}</h3>
            <button onClick={handleNextMonth}
              className="h-11 w-11 flex items-center justify-center rounded-xl bg-[#f0f2f5] hover:bg-[#e2e8e8] transition">
              <ChevronRight size={18} className="text-[#1a1c1c]" />
            </button>
          </div>

          {/* Week header */}
          <div className="mb-3 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-[#6b7280]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const dateStr = new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth(),
                day
              ).toDateString();
              const status = attendanceMap.get(dateStr);

              return (
                <div
                  key={day}
                  className={`aspect-square flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${getStatusColor(status)}`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#f0fdf4] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Present</p>
            <p className="mt-1.5 text-2xl font-bold text-[#15803d]">{stats.present}</p>
          </div>
          <div className="rounded-xl bg-[#fef2f2] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Absent</p>
            <p className="mt-1.5 text-2xl font-bold text-[#b91c1c]">{stats.absent}</p>
          </div>
          <div className="rounded-xl bg-[#fef9f0] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Late</p>
            <p className="mt-1.5 text-2xl font-bold text-[#b45309]">{stats.late}</p>
          </div>
          <div className="rounded-xl bg-[#f0f4ff] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Leave</p>
            <p className="mt-1.5 text-2xl font-bold text-[#1d4ed8]">{stats.leave}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="h-11 flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#004649] text-white font-semibold hover:bg-[#1b5e62] transition"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </button>
          <button
            onClick={handleShare}
            disabled={!student.whatsApp && !student.guardianPhone}
            className={`h-11 flex flex-1 items-center justify-center gap-2 rounded-xl font-semibold transition ${
              student.whatsApp || student.guardianPhone
                ? 'bg-[#25d366] text-white hover:scale-105 active:scale-[0.98]'
                : 'bg-[#f0f2f5] text-[#6f7979] cursor-not-allowed opacity-60'
            }`}
          >
            <Share2 className="h-4 w-4" />
            WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
