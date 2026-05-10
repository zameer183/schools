'use client';

import { Download } from 'lucide-react';

type CsvRow = {
  date: string;
  attendance: string;
  sabqRange: string;
  sabqKaifiyat: string;
  sabqTajweed: string;
  sabqHifz: string;
  sabqiRange: string;
  sabqiKaifiyat: string;
  sabqiTajweed: string;
  sabqiHifz: string;
  manzilRange: string;
  manzilKaifiyat: string;
  manzilTajweed: string;
  manzilHifz: string;
  testExam: string;
};

type Props = {
  rows: CsvRow[];
  studentName: string;
  className: string;
  fromLabel: string;
  toLabel: string;
};

export default function CsvDownloadButton({ rows, studentName, className, fromLabel, toLabel }: Props) {
  function handleDownload() {
    const header = [
      `Student: ${studentName}`,
      `Class: ${className}`,
      `Period: ${fromLabel} to ${toLabel}`,
      ''
    ].join('\n');

    const cols = [
      'Date', 'Attendance',
      'Sabaq Range', 'Sabaq Kaifiyat', 'Sabaq T.Ghalt', 'Sabaq H.Ghalt',
      'Sabqi Range', 'Sabqi Kaifiyat', 'Sabqi T.Ghalt', 'Sabqi H.Ghalt',
      'Manzil Range', 'Manzil Kaifiyat', 'Manzil T.Ghalt', 'Manzil H.Ghalt',
      'Test / Exam'
    ];

    const dataRows = rows.map((r) => [
      r.date, r.attendance,
      r.sabqRange, r.sabqKaifiyat, r.sabqTajweed, r.sabqHifz,
      r.sabqiRange, r.sabqiKaifiyat, r.sabqiTajweed, r.sabqiHifz,
      r.manzilRange, r.manzilKaifiyat, r.manzilTajweed, r.manzilHifz,
      r.testExam
    ]);

    const csv = header + [cols, ...dataRows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complete_report_${studentName.replace(/\s+/g, '_')}_${fromLabel.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 rounded-xl bg-[#004649] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b5e62] transition"
    >
      <Download className="h-4 w-4" />
      Download CSV
    </button>
  );
}
