'use client';

import { Download, MessageCircle, Printer } from 'lucide-react';

export function StudentReportDetailActions({
  studentId,
  whatsApp,
  guardianPhone,
  studentName,
  className,
  admissionNo,
  pendingCount,
  overdueCount,
  paidCount,
  totalCollected,
  presentCount,
  absentCount,
  lateCount,
  latestLesson,
  latestTajweeditotal,
  latestHifzTotal,
  examCount
}: {
  studentId: string;
  whatsApp: string | null;
  guardianPhone: string | null;
  studentName: string;
  className: string;
  admissionNo: string;
  pendingCount: number;
  overdueCount: number;
  paidCount: number;
  totalCollected: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  latestLesson: string;
  latestTajweeditotal: number;
  latestHifzTotal: number;
  examCount: number;
}) {
  const waPhone = whatsApp ?? guardianPhone;
  const hasWaPhone = Boolean(waPhone);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (!waPhone) return;
    const message = `📋 Student Report — ${studentName}
🏫 Class: ${className} | Admission: ${admissionNo}

💰 Fees:
  ✅ Paid: ${paidCount} | ⏳ Pending: ${pendingCount} | 🔴 Overdue: ${overdueCount}
  Total Collected: AED ${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

📅 Attendance (last 30 days):
  Present: ${presentCount} | Absent: ${absentCount} | Late: ${lateCount}

📖 Hifz: ${latestLesson}
  Tajweedi: ${latestTajweeditotal} mistakes | Hifz: ${latestHifzTotal} mistakes

📊 Exam Results: ${examCount} recorded`;

    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handlePrint}
        className="h-11 flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-3 text-xs font-semibold text-white hover:scale-105 active:scale-[0.98] transition-all print:hidden"
        title="Print or save as PDF"
      >
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">Print</span>
      </button>
      <a
        href={`/api/reports/export?type=fees&studentId=${studentId}&period=all`}
        download
        className="h-11 flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-[#f0f2f5] px-3 text-xs font-semibold text-[#2c3e50] hover:bg-[#e8ecf0] active:scale-[0.98] transition-all print:hidden"
        title="Download fees CSV"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">CSV</span>
      </a>
      <button
        onClick={handleShare}
        disabled={!hasWaPhone}
        title={hasWaPhone ? 'Share via WhatsApp' : 'No WhatsApp number'}
        className={`h-11 flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all print:hidden ${
          hasWaPhone
            ? 'bg-[#25d366] text-white hover:scale-105 active:scale-[0.98]'
            : 'bg-[#f0f2f5] text-[#6f7979] cursor-not-allowed opacity-60'
        }`}
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Share</span>
      </button>
    </div>
  );
}
