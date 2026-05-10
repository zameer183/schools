'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  Download,
  X,
  Trash2,
  Check,
  Loader2
} from 'lucide-react';

type AttendanceRecord = {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks: string | null;
};

type StudentData = {
  id: string;
  classId: string | null;
  user: { fullName: string; isActive: boolean };
  class: { name: string; section: string } | null;
  joinDate: string | null;
  admissionNo: string;
  attendance: AttendanceRecord[];
  whatsApp: string | null;
  guardianPhone: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const STATUS_CONFIG = {
  PRESENT:  { bg: 'bg-[#dcfce7]', text: 'text-[#15803d]', dot: 'bg-[#22c55e]', label: 'Present' },
  ABSENT:   { bg: 'bg-[#fee2e2]', text: 'text-[#b91c1c]', dot: 'bg-[#ef4444]', label: 'Absent' },
  LATE:     { bg: 'bg-[#fff7ed]', text: 'text-[#b45309]', dot: 'bg-[#f59e0b]', label: 'Late' },
  EXCUSED:  { bg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]', dot: 'bg-[#3b82f6]', label: 'Excused' },
} as const;

const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const;

// ─── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] px-5 py-4">
          <h3 className="font-bold text-[#111827]">{title}</h3>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#374151]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentAttendanceClient({ student }: { student: StudentData }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>(student.attendance);

  // Modal state
  const [modal, setModal] = useState<{ date: Date; existing: AttendanceRecord | null } | null>(null);
  const [selStatus, setSelStatus] = useState<typeof STATUSES[number]>('PRESENT');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState('');

  // Calendar math
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const adjustedFirst = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Build map: dateStr → record
  const recordMap = new Map<string, AttendanceRecord>();
  records.forEach((r) => recordMap.set(toLocalDateStr(new Date(r.date)), r));

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const monthRecords = records.filter((r) => {
    const d = new Date(r.date);
    return d >= monthStart && d <= monthEnd;
  });

  const stats = {
    present: monthRecords.filter((r) => r.status === 'PRESENT').length,
    absent:  monthRecords.filter((r) => r.status === 'ABSENT').length,
    late:    monthRecords.filter((r) => r.status === 'LATE').length,
    leave:   monthRecords.filter((r) => r.status === 'EXCUSED').length,
  };

  const calendarDays: (number | null)[] = [
    ...Array(adjustedFirst).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];

  const classInfo = student.class ? `${student.class.name} ${student.class.section || ''}` : 'N/A';
  const waPhone = (student.whatsApp || student.guardianPhone || '').replace(/[^0-9+]/g, '');

  // ─── Open day modal ──────────────────────────────────────────────────────────

  function openDay(day: number) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = toLocalDateStr(date);
    const existing = recordMap.get(dateStr) ?? null;
    setModal({ date, existing });
    setSelStatus(existing?.status ?? 'PRESENT');
    setRemarks(existing?.remarks ?? '');
    setErr('');
  }

  // ─── Save (upsert) ───────────────────────────────────────────────────────────

  async function handleSave() {
    if (!modal) return;
    if (!student.classId) { setErr('Student has no class assigned — cannot mark attendance.'); return; }
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: student.classId,
          date: toLocalDateStr(modal.date),
          records: [{ studentId: student.id, status: selStatus, remarks: remarks || undefined }]
        })
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? 'Failed to save.'); return; }

      const saved = data[0];
      const newRecord: AttendanceRecord = {
        id: saved.id,
        date: saved.date,
        status: selStatus,
        remarks: remarks || null
      };
      const dateStr = toLocalDateStr(modal.date);
      setRecords((prev) => {
        const filtered = prev.filter((r) => toLocalDateStr(new Date(r.date)) !== dateStr);
        return [...filtered, newRecord];
      });
      setModal(null);
    } catch { setErr('Network error.'); }
    finally { setSaving(false); }
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!modal?.existing) return;
    setDeleting(true); setErr('');
    try {
      const res = await fetch(`/api/attendance?id=${modal.existing.id}`, { method: 'DELETE' });
      if (!res.ok) { setErr('Failed to delete.'); return; }
      const dateStr = toLocalDateStr(modal.date);
      setRecords((prev) => prev.filter((r) => toLocalDateStr(new Date(r.date)) !== dateStr));
      setModal(null);
    } catch { setErr('Network error.'); }
    finally { setDeleting(false); }
  }

  // ─── Download CSV ─────────────────────────────────────────────────────────────

  function handleDownload() {
    const header = [
      `Student: ${student.user.fullName}`,
      `Admission No: ${student.admissionNo}`,
      `Class: ${classInfo}`,
      `Month: ${monthName}`,
      `Present: ${stats.present}  Absent: ${stats.absent}  Late: ${stats.late}  Leave: ${stats.leave}`,
      ''
    ].join('\n');
    const rows = [
      ['Date', 'Day', 'Status', 'Remarks'],
      ...monthRecords
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((r) => {
          const d = new Date(r.date);
          return [
            d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            d.toLocaleDateString('en-US', { weekday: 'long' }),
            r.status,
            r.remarks ?? ''
          ];
        })
    ];
    const csv = header + rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${student.user.fullName.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleShare() {
    if (!waPhone) return;
    const msg = `📅 Attendance Report\n\nStudent: ${student.user.fullName}\nMonth: ${monthName}\n\n✅ Present: ${stats.present}\n❌ Absent: ${stats.absent}\n🕒 Late: ${stats.late}\n📋 Leave: ${stats.leave}`;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafb] p-4">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Back */}
        <Link href={`/admin/students/${student.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#004649] hover:text-[#1b5e62] transition">
          <ChevronLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        {/* Hero */}
        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#dcfce7] to-[#bbf7d0] text-lg font-bold text-[#15803d] ring-4 ring-[#f0fdf4]">
              {initials(student.user.fullName)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#111827]">{student.user.fullName}</h1>
                {student.user.isActive
                  ? <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[9px] font-bold uppercase text-[#15803d]">Active</span>
                  : <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[9px] font-bold uppercase text-[#b91c1c]">Inactive</span>
                }
              </div>
              <p className="mt-0.5 text-xs text-[#6b7280]">
                {classInfo} • Admission: <span className="font-semibold text-[#374151]">{student.admissionNo}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] p-5">
          {/* Month nav */}
          <div className="mb-5 flex items-center justify-between">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              className="h-11 w-11 flex items-center justify-center rounded-xl bg-[#f0f2f5] hover:bg-[#e2e8e8] transition">
              <ChevronLeft size={18} className="text-[#1a1c1c]" />
            </button>
            <h3 className="font-semibold text-[#1a1c1c]">{monthName}</h3>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="h-11 w-11 flex items-center justify-center rounded-xl bg-[#f0f2f5] hover:bg-[#e2e8e8] transition">
              <ChevronRight size={18} className="text-[#1a1c1c]" />
            </button>
          </div>

          {/* Week header */}
          <div className="mb-3 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-[#6b7280]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d}>{d}</div>)}
          </div>

          {/* Days grid — click any day to mark */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} className="aspect-square" />;
              const dateStr = toLocalDateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
              const record = recordMap.get(dateStr);
              const cfg = record ? STATUS_CONFIG[record.status] : null;
              const isToday = dateStr === toLocalDateStr(new Date());

              return (
                <button
                  key={day}
                  onClick={() => openDay(day)}
                  className={`aspect-square flex items-center justify-center rounded-lg text-xs font-semibold transition-all hover:scale-105 active:scale-95 relative
                    ${cfg ? `${cfg.bg} ${cfg.text}` : 'bg-[#f1f5f9] text-[#94a3b8] hover:bg-[#e2e8f0]'}
                    ${isToday ? 'ring-2 ring-[#004649] ring-offset-1' : ''}
                  `}
                >
                  {day}
                  {record && (
                    <span className={`absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full ${cfg?.dot}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3">
            {STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
                <span className="text-[10px] font-semibold text-[#6b7280]">{STATUS_CONFIG[s].label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f1f5f9] ring-1 ring-[#9ca3af]" />
              <span className="text-[10px] font-semibold text-[#6b7280]">Not marked</span>
            </div>
          </div>
        </div>

        {/* Summary */}
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

        {/* Bottom buttons */}
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
            disabled={!waPhone}
            className={`h-11 flex flex-1 items-center justify-center gap-2 rounded-xl font-semibold transition ${
              waPhone ? 'bg-[#25d366] text-white hover:scale-105 active:scale-[0.98]' : 'bg-[#f0f2f5] text-[#6f7979] cursor-not-allowed opacity-60'
            }`}
          >
            <Share2 className="h-4 w-4" />
            WhatsApp
          </button>
        </div>
      </div>

      {/* ── Day Modal ────────────────────────────────────────────────────────── */}
      {modal && (
        <Modal
          title={modal.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            {/* Status buttons */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-2">Status</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setSelStatus(s)}
                      className={`h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold border-2 transition ${
                        selStatus === s
                          ? `${cfg.bg} ${cfg.text} border-current`
                          : 'bg-[#f8fafc] text-[#6b7280] border-transparent hover:bg-[#f1f5f9]'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Remarks (optional)</label>
              <input
                className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] border-none px-3 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#004649]/30"
                placeholder="e.g. Sick leave"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            {err && <p className="text-xs text-[#b91c1c] font-medium">{err}</p>}

            {/* Actions */}
            <div className="flex gap-2">
              {modal.existing && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#fef2f2] text-[#b91c1c] hover:bg-[#fee2e2] transition disabled:opacity-60"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-11 flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#004649] text-white font-semibold hover:bg-[#1b5e62] transition disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {modal.existing ? 'Update' : 'Mark Attendance'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
