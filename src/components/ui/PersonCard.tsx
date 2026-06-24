import Image from 'next/image';

interface PersonCardProps {
  name: string;
  detail?: string;
  avatar?: string;
}

export function PersonCard({ name, detail, avatar }: PersonCardProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3">
      {avatar ? (
        <Image src={avatar} alt={name} width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e0eff0] text-xs font-bold text-[#2b676e]">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#1F2937]">{name}</p>
        {detail && <p className="truncate text-xs text-[#6B7280]">{detail}</p>}
      </div>
    </div>
  );
}
