import { ReactNode } from 'react';

interface PersonCardProps {
  avatar: ReactNode;
  name: string;
  subtitle?: string;
  status?: 'active' | 'inactive';
  actions?: ReactNode;
  viewMode?: 'grid' | 'list';
  onClick?: () => void;
  className?: string;
}

export function PersonCard({
  avatar,
  name,
  subtitle,
  status = 'active',
  actions,
  viewMode = 'grid',
  onClick,
  className = ''
}: PersonCardProps) {
  const statusColor = status === 'active' ? 'bg-[#10B981]' : 'bg-[#D1D5DB]';

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-4 border-b border-[#E5E7EB] px-4 py-4 hover:bg-[#F9FAFB] transition-colors ${className}`}
      >
        <div className="flex-shrink-0">{avatar}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#1F2937]">{name}</p>
          {subtitle && <p className="text-xs text-[#6B7280]">{subtitle}</p>}
        </div>
        <div className="flex-shrink-0 flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${statusColor}`} />
          {actions}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {avatar}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1F2937]">{name}</p>
            {subtitle && <p className="text-xs text-[#6B7280]">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      {status && (
        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
          <div className={`h-2 w-2 rounded-full ${statusColor}`} />
          {status === 'active' ? 'Active' : 'Inactive'}
        </div>
      )}
    </div>
  );
}
