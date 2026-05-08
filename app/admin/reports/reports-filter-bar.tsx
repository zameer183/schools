'use client';

import { useRouter } from 'next/navigation';

export function ReportsFilterBar({
  classes,
  students,
  selectedClassId,
  selectedStudentId,
  selectedPeriod
}: {
  classes: { id: string; name: string; section: string }[];
  students: { id: string; admissionNo: string; user: { fullName: string } }[];
  selectedClassId: string;
  selectedStudentId: string;
  selectedPeriod: string;
}) {
  const router = useRouter();

  const handleClassChange = (classId: string) => {
    const params = new URLSearchParams();
    params.set('classId', classId);
    params.set('studentId', 'all');
    params.set('period', selectedPeriod);
    router.push(`/admin/reports?${params.toString()}`);
  };

  const handleStudentChange = (studentId: string) => {
    const params = new URLSearchParams();
    params.set('classId', selectedClassId);
    params.set('studentId', studentId);
    params.set('period', selectedPeriod);
    router.push(`/admin/reports?${params.toString()}`);
  };

  const handlePeriodChange = (period: string) => {
    const params = new URLSearchParams();
    params.set('classId', selectedClassId);
    params.set('studentId', selectedStudentId);
    params.set('period', period);
    router.push(`/admin/reports?${params.toString()}`);
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#6f7979] mb-2">
            Filter by Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => handleClassChange(e.target.value)}
            className="h-10 w-full rounded-xl bg-[#f0f2f5] border-none px-3 text-sm text-[#2c3e50] outline-none focus:ring-2 focus:ring-[#004649]/20"
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.section}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#6f7979] mb-2">
            Filter by Student
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => handleStudentChange(e.target.value)}
            className="h-10 w-full rounded-xl bg-[#f0f2f5] border-none px-3 text-sm text-[#2c3e50] outline-none focus:ring-2 focus:ring-[#004649]/20"
          >
            <option value="all">All Students</option>
            {selectedClassId !== 'all' && students.length === 0 ? (
              <option value="all" disabled>
                No students in selected class
              </option>
            ) : null}
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.user.fullName} ({student.admissionNo})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#6f7979] mb-2">
            Period
          </label>
          <div className="flex gap-2">
            {['monthly', 'weekly', 'daily'].map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={`flex-1 h-11 rounded-xl text-xs font-semibold transition-all ${
                  selectedPeriod === period
                    ? 'bg-gradient-to-br from-[#004649] to-[#1b5e62] text-white shadow-sm'
                    : 'bg-[#f0f2f5] text-[#2c3e50] hover:bg-[#e8ecf0]'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
