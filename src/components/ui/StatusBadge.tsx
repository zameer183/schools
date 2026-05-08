import type { ReactNode } from 'react';

type StatusVariant = 'success' | 'danger' | 'pending' | 'info';

const VARIANT_STYLES: Record<StatusVariant, string> = {
  success: 'bg-[#D1FAE5] text-[#065F46]',
  danger: 'bg-[#FEE2E2] text-[#991B1B]',
  pending: 'bg-[#FEF3C7] text-[#92400E]',
  info: 'bg-[#DBEAFE] text-[#1E40AF]',
};

interface StatusBadgeProps {
  variant: StatusVariant;
  children: ReactNode;
}

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${VARIANT_STYLES[variant]}`}
    >
      {children}
    </span>
  );
}
