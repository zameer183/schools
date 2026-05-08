'use client';

import { Link as LinkIcon, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export function StudentReportActions({
  studentId,
  whatsApp,
  guardianPhone,
  studentName,
  className,
  pendingCount,
  overdueCount
}: {
  studentId: string;
  whatsApp: string | null;
  guardianPhone: string | null;
  studentName: string;
  className: string;
  pendingCount: number;
  overdueCount: number;
}) {
  const waPhone = whatsApp?.trim() || guardianPhone?.trim() || null;
  const hasWaPhone = Boolean(waPhone);

  const handleShare = () => {
    if (!waPhone) return;
    const message = `📋 Report for ${studentName} (${className})\n⏳ Pending: ${pendingCount} fee(s) | 🔴 Overdue: ${overdueCount}\n👉 View full report: /admin/reports/students/${studentId}`;
    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex gap-1.5">
      <Link
        href={`/admin/reports/students/${studentId}`}
        className="h-11 flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-2 text-xs font-semibold text-white hover:scale-105 active:scale-[0.98] transition-all"
        title="View full report"
      >
        <LinkIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">View</span>
      </Link>
      <button
        onClick={handleShare}
        disabled={!hasWaPhone}
        title={hasWaPhone ? 'Share via WhatsApp' : 'No WhatsApp number'}
        className={`h-11 flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold transition-all ${
          hasWaPhone
            ? 'bg-[#25d366] text-white hover:scale-105 active:scale-[0.98]'
            : 'bg-[#f0f2f5] text-[#6f7979] cursor-not-allowed opacity-60'
        }`}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Share</span>
      </button>
    </div>
  );
}
