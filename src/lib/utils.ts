import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  const num = Number(value) || 0;
  return `₨ ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(num)}`;
}
