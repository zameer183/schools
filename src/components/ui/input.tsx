import { ReactNode } from 'react';

interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  error?: string;
  icon?: ReactNode;
  className?: string;
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  required = false,
  error,
  icon,
  className = ''
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#64748B]">
          {label}
          {required && <span className="ml-1 text-[#EF4444]">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`h-12 w-full rounded-[18px] border border-[#EFE8DE] bg-[#FBFAF8] px-4 text-sm text-[#0F172A] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#004D47] focus:bg-white focus:ring-4 focus:ring-[#004D47]/10 ${
            icon ? 'pl-9' : ''
          } ${error ? 'border-[#EF4444]/50 bg-[#FEF2F2] ring-4 ring-[#EF4444]/10' : ''}`}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-[#EF4444]">{error}</p>
      )}
    </div>
  );
}
