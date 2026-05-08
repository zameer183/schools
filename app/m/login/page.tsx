import { MobileLoginForm } from '@/components/m-admin/login-form';

export const dynamic = 'force-dynamic';

export default function MobileLoginPage() {
  return (
    <main className="mx-auto min-h-[100dvh] max-w-md bg-white">
      <header className="relative flex h-52 flex-col items-center justify-end rounded-b-[32px] bg-[#1B4D4B] pb-7 text-white">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white">
          <svg viewBox="0 0 52 52" fill="none" className="h-9 w-9">
            <path d="M26 6 L46 16 L26 26 L6 16 Z" fill="#1B4D4B" />
            <path d="M14 20 L14 32 C14 36 19 40 26 40 C33 40 38 36 38 32 L38 20" stroke="#1B4D4B" strokeWidth="3" fill="none" />
            <path d="M44 18 L44 30" stroke="#E68A00" strokeWidth="3" strokeLinecap="round" />
            <circle cx="44" cy="33" r="2" fill="#E68A00" />
          </svg>
        </div>
        <p className="text-base font-medium">Welcome back</p>
        <p className="mt-1 text-xs opacity-70">Sign in as administrator</p>
      </header>

      <section className="px-6 pt-6">
        <div className="mb-5 flex gap-1 rounded-xl bg-[#F3F4F6] p-1">
          <span className="flex-1 rounded-lg bg-white py-2 text-center text-xs font-medium text-[#1B4D4B]">Admin</span>
          <span className="flex-1 py-2 text-center text-xs text-[#6B7280]">Teacher</span>
          <span className="flex-1 py-2 text-center text-xs text-[#6B7280]">Parent</span>
        </div>

        <MobileLoginForm />
      </section>
    </main>
  );
}
