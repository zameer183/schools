import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
}

export function Button({ className, variant = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'default' && 'tonal-button text-white shadow-[0_8px_20px_rgba(0,70,73,0.15)] hover:opacity-90',
        variant === 'outline' && 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        variant === 'ghost' && 'text-slate-700 hover:bg-slate-100',
        className
      )}
      {...props}
    />
  );
}
