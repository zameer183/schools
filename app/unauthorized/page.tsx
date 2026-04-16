export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-[#f5f6f5]">
      <div className="w-full max-w-lg rounded-[1.75rem] border border-[#d4dee7] bg-white p-10 text-center shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#6e7778]">Manarah Institute</p>
        <h1 className="font-headline mt-4 text-3xl font-extrabold tracking-[-0.02em] text-[#004649]">Access Denied</h1>
        <p className="mt-3 text-sm text-[#5c6668]">
          You do not have permission to access this section. Please contact your administrator.
        </p>
        <a href="/" className="mt-6 inline-block rounded-xl bg-[#004649] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#005a5e]">
          Go to Login
        </a>
      </div>
    </div>
  );
}
