import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'default' | 'lg';
  className?: string;
}

export function Card({ children, padding = 'default', className = '' }: CardProps) {
  const paddingClass = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8'
  }[padding];

  return (
    <div className={`rounded-xl bg-white border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow ${paddingClass} ${className}`}>
      {children}
    </div>
  );
}
