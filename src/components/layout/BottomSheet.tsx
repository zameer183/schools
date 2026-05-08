'use client';

import { useEffect } from 'react';

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <button
          aria-label="Close bottom sheet"
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 w-full rounded-t-3xl bg-white shadow-lg transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {title && (
          <div className="border-b border-[#e2e8e8] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#1a1c1c]">{title}</h2>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto pb-8">
          {children}
        </div>
      </div>
    </>
  );
}
