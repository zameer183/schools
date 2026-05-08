export default function LoadingFinancePage() {
  return (
    <div className="space-y-4">
      <div className="z-30 rounded-2xl border border-[#d8e7e0] bg-white/95 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5 md:sticky md:top-2">
        <div className="h-7 w-56 animate-pulse rounded bg-[#e2e8f0]" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[#eef2f7]" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr_auto]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-xl bg-[#eef2f7]" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#dbeafe] bg-white p-4 shadow-sm">
            <div className="h-3 w-24 animate-pulse rounded bg-[#e2e8f0]" />
            <div className="mt-3 h-8 w-28 animate-pulse rounded bg-[#eef2f7]" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
        <section className="rounded-2xl border border-[#d8e7e0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="h-5 w-48 animate-pulse rounded bg-[#e2e8f0]" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-[#f1f5f9]" />
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#d8e7e0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="h-5 w-32 animate-pulse rounded bg-[#e2e8f0]" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded bg-[#f1f5f9]" />
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-[#d8e7e0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="h-5 w-44 animate-pulse rounded bg-[#e2e8f0]" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-[#f1f5f9]" />
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
