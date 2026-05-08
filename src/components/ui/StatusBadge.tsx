import { ReactNode } from 'react';

interface StatusBadgeProps {
  variant: 'success' | 'pending' | 'danger' | 'info';
  children: ReactNode;
}

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  const variantClass = {
    success: 'bg-[#D1FAE5] text-[#065F46]',
    pending: 'bg-[#F5E6CC] text-[#92400E]',
    danger: 'bg-[#FEE2E2] text-[#991B1B]',
    info: 'bg-[#E0EBEC] text-[#1F5A5C]'
  }[variant];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${variantClass}`}>
      {children}
    </span>
  );
}
