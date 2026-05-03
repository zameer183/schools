import { ReactNode } from 'react';

interface KpiCardProps {
  variant: 'primary' | 'accent' | 'success' | 'danger';
  icon: ReactNode;
  label: string;
  value: string | number;
}

export function KpiCard({ variant, icon, label, value }: KpiCardProps) {
  const variantConfig = {
    primary: {
      cardBg: 'bg-white',
      borderAccent: 'border-l-[#1F5A5C]',
      iconBg: 'bg-[#E0EBEC]',
      iconColor: 'text-[#1F5A5C]',
      valueColor: 'text-[#1F5A5C]',
    },
    accent: {
      cardBg: 'bg-white',
      borderAccent: 'border-l-[#D69E3F]',
      iconBg: 'bg-[#F5E6CC]',
      iconColor: 'text-[#D69E3F]',
      valueColor: 'text-[#D69E3F]',
    },
    success: {
      cardBg: 'bg-white',
      borderAccent: 'border-l-[#10B981]',
      iconBg: 'bg-[#D1FAE5]',
      iconColor: 'text-[#10B981]',
      valueColor: 'text-[#10B981]',
    },
    danger: {
      cardBg: 'bg-white',
      borderAccent: 'border-l-[#EF4444]',
      iconBg: 'bg-[#FEE2E2]',
      iconColor: 'text-[#EF4444]',
      valueColor: 'text-[#EF4444]',
    }
  }[variant];

  return (
    <div className={`${variantConfig.cardBg} min-h-[80px] rounded-xl border border-l-[3px] border-[#E5E7EB] ${variantConfig.borderAccent} p-4 sm:p-5 flex items-center gap-4 hover:shadow-md transition-shadow duration-200`}>
      <div className={`${variantConfig.iconBg} rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0`}>
        <div className={`${variantConfig.iconColor} w-5 h-5`}>
          {icon}
        </div>
      </div>
      <div className="flex flex-col justify-center">
        <p className={`text-2xl sm:text-3xl font-bold ${variantConfig.valueColor} leading-none`}>
          {value}
        </p>
        <p className="text-sm text-[#6B7280] mt-1">{label}</p>
      </div>
    </div>
  );
}
