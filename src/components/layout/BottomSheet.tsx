'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)] animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
          {title && <h3 className="text-sm font-bold text-[#1F2937]">{title}</h3>}
          <button
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pb-safe">{children}</div>
      </div>
    </>
  );
}
