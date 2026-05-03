import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  badge?: ReactNode;
}

export function PageHeader({ title, subtitle, action, badge }: PageHeaderProps) {
  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-4 sm:p-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1F2937]">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-[#6B7280] hidden sm:block">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {badge && <div>{badge}</div>}
          {action && <div>{action}</div>}
        </div>
      </div>
    </div>
  );
}
