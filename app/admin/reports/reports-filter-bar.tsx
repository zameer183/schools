'use client';

import { useRouter } from 'next/navigation';

type ClassOption = { id: string; name: string; section: string };

interface ReportsFilterBarProps {
  classes: ClassOption[];
  selectedClassId: string;
  selectedPeriod: string;
}

export function ReportsFilterBar({ classes, selectedClassId, selectedPeriod }: ReportsFilterBarProps) {
  const router = useRouter();

  const update = (key: string, value: string) => {
    const params = new URLSearchParams();
    params.set('classId', key === 'classId' ? value : selectedClassId);
    params.set('period', key === 'period' ? value : selectedPeriod);
    router.push(`/admin/reports?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white border border-[#E5E7EB] px-4 py-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-[#6B7280]">Class:</label>
        <select
          value={selectedClassId}
          onChange={(e) => update('classId', e.target.value)}
          className="h-8 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 text-xs font-medium text-[#1F2937] outline-none focus:ring-2 focus:ring-[#1F5A5C]/20"
        >
          <option value="all">All Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} — {cls.section}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-[#6B7280]">Period:</label>
        <select
          value={selectedPeriod}
          onChange={(e) => update('period', e.target.value)}
          className="h-8 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 text-xs font-medium text-[#1F2937] outline-none focus:ring-2 focus:ring-[#1F5A5C]/20"
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
    </div>
  );
}
