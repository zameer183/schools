import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
  asChild?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  fullWidth = false,
  asChild = false
}: ButtonProps) {
  const variantClass = {
    primary: 'bg-[#1F5A5C] text-white hover:bg-[#174548] active:scale-[0.98]',
    secondary: 'bg-white border border-[#E5E7EB] text-[#1F2937] hover:bg-[#F9FAFB] active:scale-[0.98]',
    danger: 'bg-[#EF4444] text-white hover:bg-[#DC2626] active:scale-[0.98]'
  }[variant];

  const sizeClass = {
    sm: 'h-8 px-3 py-1.5 text-xs font-medium',
    md: 'h-10 px-4 py-2.5 text-sm font-medium',
    lg: 'h-11 px-5 py-3 text-sm font-semibold'
  }[size];

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
  const baseClass = 'rounded-lg transition-all inline-flex items-center justify-center gap-2';

  const buttonClass = `${baseClass} ${variantClass} ${sizeClass} ${widthClass} ${disabledClass} ${className}`;

  if (asChild) {
    return <span className={buttonClass}>{children}</span>;
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonClass}
    >
      {children}
    </button>
  );
}
