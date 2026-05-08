interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[#1F2937]">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-sm text-[#6B7280]">{subtitle}</p>
      )}
    </div>
  );
}
