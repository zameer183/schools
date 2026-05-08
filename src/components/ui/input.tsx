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
        <label className="block text-sm font-medium text-[#1F2937] mb-1.5">
          {label}
          {required && <span className="ml-1 text-[#EF4444]">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`h-11 w-full rounded-lg border-none bg-[#F9FAFB] px-3 text-sm text-[#1F2937] outline-none transition-all placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-[#1F5A5C] focus:bg-white ${
            icon ? 'pl-9' : ''
          } ${error ? 'ring-2 ring-[#EF4444]/50 bg-[#FEF2F2]' : ''}`}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-[#EF4444]">{error}</p>
      )}
    </div>
  );
}
