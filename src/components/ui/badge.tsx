import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function Badge({
  children,
  variant = 'default'
}: {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider',
        variant === 'default' && 'bg-teal-100 text-teal-700',
        variant === 'success' && 'bg-emerald-100 text-emerald-700',
        variant === 'warning' && 'bg-amber-100 text-amber-800',
        variant === 'danger' && 'bg-rose-100 text-rose-700'
      )}
    >
      {children}
    </span>
  );
}
