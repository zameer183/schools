import { ReactNode } from 'react';

interface TableProps {
  headers: string[];
  rows: Array<Record<string, ReactNode>>;
  onRowClick?: (row: Record<string, ReactNode>) => void;
  className?: string;
}

export function Table({ headers, rows, onRowClick, className = '' }: TableProps) {
  return (
    <div className={`rounded-xl border border-[#E5E7EB] overflow-hidden ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
            {headers.map((header) => (
              <th
                key={header}
                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-[#F3F4F6] h-14 ${onRowClick ? 'cursor-pointer hover:bg-[#F9FAFB]' : ''}`}
            >
              {headers.map((header) => (
                <td key={`${idx}-${header}`} className="px-6 py-4 text-sm text-[#1F2937]">
                  {row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="px-6 py-8 text-center text-sm text-[#9CA3AF]">
          No data to display
        </div>
      )}
    </div>
  );
}

export const DataTable = Table;
