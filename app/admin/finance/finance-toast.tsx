'use client';

import { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export function FinanceToast({
  message,
  type,
  onDismiss
}: {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(0,0,0,0.18)] transition-all ${
        type === 'success' ? 'bg-[#27ae60]' : 'bg-[#e74c3c]'
      }`}
    >
      {type === 'success'
        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
        : <XCircle className="h-4 w-4 shrink-0" />}
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
