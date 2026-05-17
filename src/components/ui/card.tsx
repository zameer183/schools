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
    <div className={`rounded-[24px] border border-white/80 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.07)] transition-shadow hover:shadow-[0_18px_42px_rgba(15,23,42,0.10)] ${paddingClass} ${className}`}>
      {children}
    </div>
  );
}

interface CardTextProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTextProps) {
  return <h3 className={`text-lg font-bold text-[#0F172A] ${className}`.trim()}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: CardTextProps) {
  return <p className={`text-sm leading-relaxed text-[#64748B] ${className}`.trim()}>{children}</p>;
}
