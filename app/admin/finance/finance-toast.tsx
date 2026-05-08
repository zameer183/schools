'use client';

import { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface FinanceToastProps {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}

export function FinanceToast({ message, type, onDismiss }: FinanceToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg text-sm font-semibold ${
        type === 'success'
          ? 'bg-[#D1FAE5] text-[#065F46]'
          : 'bg-[#FEE2E2] text-[#991B1B]'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-1 opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
