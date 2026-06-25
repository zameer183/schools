type DashboardRouteLoadingProps = {
  title: string;
  hint?: string;
};

export function DashboardRouteLoading({ title, hint = 'Loading latest data...' }: DashboardRouteLoadingProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="h-4 w-24 animate-pulse rounded-full bg-[#E2E8F0]" />
        <div className="mt-4 h-8 w-56 animate-pulse rounded-full bg-[#D7E3E8]" />
        <div className="mt-3 h-4 w-40 animate-pulse rounded-full bg-[#EEF2F7]" />
        <p className="mt-4 text-sm text-[#64748B]">{title} - {hint}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="h-5 w-2/5 animate-pulse rounded-full bg-[#D7E3E8]" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full animate-pulse rounded-full bg-[#EEF2F7]" />
              <div className="h-3 w-4/5 animate-pulse rounded-full bg-[#EEF2F7]" />
              <div className="h-3 w-3/5 animate-pulse rounded-full bg-[#EEF2F7]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
