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

interface CardTextProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTextProps) {
  return <h3 className={`text-lg font-semibold text-[#111827] ${className}`.trim()}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: CardTextProps) {
  return <p className={`text-sm text-[#6B7280] ${className}`.trim()}>{children}</p>;
}
