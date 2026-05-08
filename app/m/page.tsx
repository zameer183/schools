import Link from 'next/link';
import { SplashRedirect } from '@/components/m-admin/splash-redirect';

export const dynamic = 'force-dynamic';

export default function MobileSplashPage() {
  return (
    <main className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center bg-[#1B4D4B] px-6 text-white">
      <SplashRedirect to="/m/login" delayMs={2400} />

      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-white">
        <svg viewBox="0 0 52 52" fill="none" className="h-14 w-14">
          <path d="M26 6 L46 16 L26 26 L6 16 Z" fill="#1B4D4B" />
          <path d="M14 20 L14 32 C14 36 19 40 26 40 C33 40 38 36 38 32 L38 20" stroke="#1B4D4B" strokeWidth="3" fill="none" />
          <path d="M44 18 L44 30" stroke="#E68A00" strokeWidth="3" strokeLinecap="round" />
          <circle cx="44" cy="33" r="2" fill="#E68A00" />
        </svg>
      </div>

      <h1 className="text-center text-2xl font-semibold leading-tight">
        Manarah<br />Institute
      </h1>
      <p className="mt-3 text-center text-xs opacity-80">Admin · powered by Stitch HMS</p>

      <div className="mt-10 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#E68A00]" />
        <span className="h-2 w-2 rounded-full bg-white/30" />
        <span className="h-2 w-2 rounded-full bg-white/30" />
      </div>

      <Link
        href="/m/login"
        className="absolute bottom-10 text-[11px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100"
      >
        Tap to continue
      </Link>
    </main>
  );
}
