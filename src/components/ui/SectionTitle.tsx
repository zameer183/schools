interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-[#1F2937]">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-[#6B7280]">{subtitle}</p>}
    </div>
  );
}
