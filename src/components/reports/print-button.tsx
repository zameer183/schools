'use client';

import { Printer } from 'lucide-react';

type Props = {
  label?: string;
  orientation?: 'portrait' | 'landscape';
};

export function PrintButton({ label = 'Print / PDF', orientation = 'portrait' }: Props) {
  function handlePrint() {
    if (orientation === 'landscape') {
      const style = document.createElement('style');
      style.id = '__print_orientation__';
      style.textContent = '@media print { @page { size: A4 landscape; margin: 10mm; } }';
      document.head.appendChild(style);
      window.print();
      setTimeout(() => {
        const el = document.getElementById('__print_orientation__');
        if (el) el.remove();
      }, 1000);
    } else {
      window.print();
    }
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#f0f2f5] px-3 text-xs font-semibold text-[#2c3e50] hover:bg-[#e8ecf0] transition"
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
