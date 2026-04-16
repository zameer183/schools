import { Card } from '@/components/ui/card';

export function KpiCard({
  title,
  value,
  subtitle
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card className="rounded-2xl">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        <span className="text-lg">•</span>
      </div>
      <p className="text-3xl font-headline font-extrabold text-teal-900">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">{title}</p>
      <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
    </Card>
  );
}
