import { ReactNode } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
}

export function Select({
  label,
  options,
  value,
  onChange,
  required = false,
  error,
  placeholder,
  className = ''
}: SelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-[#1F2937] mb-1.5">
          {label}
          {required && <span className="ml-1 text-[#EF4444]">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        className={`h-11 w-full rounded-lg border-none bg-[#F9FAFB] px-3 text-sm text-[#1F2937] outline-none transition-all focus:ring-2 focus:ring-[#1F5A5C] focus:bg-white ${
          error ? 'ring-2 ring-[#EF4444]/50 bg-[#FEF2F2]' : ''
        }`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 text-xs text-[#EF4444]">{error}</p>
      )}
    </div>
  );
}
