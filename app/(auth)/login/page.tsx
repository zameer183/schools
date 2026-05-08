import Image from 'next/image';
import { LanguageSwitcher } from '@/components/language/language-switcher';
import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-[#f8f9fa] p-2 py-4 text-[#191c1d] sm:h-[100dvh] sm:overflow-hidden sm:p-6">
      <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
        <LanguageSwitcher />
      </div>
      <div className="pointer-events-none fixed right-[-5%] top-[-10%] h-[40vw] w-[40vw] rounded-full bg-[#004649]/5 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] left-[-5%] h-[30vw] w-[30vw] rounded-full bg-[#865300]/5 blur-[100px]" />

      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-[2rem] bg-white shadow-[0_12px_40px_rgba(0,70,73,0.12)] sm:max-h-[calc(100dvh-0.5rem)] md:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[#1b5e62] p-12 text-white md:flex">
          <div className="pointer-events-none absolute inset-0 opacity-10">
            <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>

          <div className="z-10">
            <div className="mb-16">
              <div className="inline-flex rounded-2xl bg-white/95 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.2)] ring-1 ring-white/60">
                <Image
                  src="/manarah-mark.png"
                  alt="Manarah Institute logo"
                  width={280}
                  height={94}
                  className="h-auto w-[280px] max-w-full"
                  priority
                />
              </div>
            </div>
            <h1 className="mb-6 text-5xl font-headline font-extrabold leading-tight tracking-tight">
              Cultivating the
              <br />
              <span className="text-[#fdb24f]"> Leaders of Tomorrow</span>
            </h1>
            <p className="max-w-md font-body text-lg leading-relaxed opacity-80">
              Access your personalized academic atelier. Manage grades, attendance, and student growth with editorial precision and effortless clarity.
            </p>
          </div>

          <div className="z-10 mt-12 rounded-2xl border border-white/10 bg-white/10 p-6 backdrop-blur-md">
            <p className="mb-4 text-[11px] font-label font-bold uppercase tracking-[0.15em] text-[#ffddb8]">Latest Institution Update</p>
            <h3 className="mb-2 text-xl font-headline font-bold">Academic Excellence Forum 2024</h3>
            <p className="text-sm opacity-70">Registration for the annual student-teacher synergy workshop is now open for all departments.</p>
          </div>
        </div>

        <div className="flex flex-col justify-center overflow-y-auto bg-white p-4 sm:overflow-visible sm:p-7 md:p-14">
          <div className="mb-3 block md:hidden">
            <Image
              src="/manarah-mark.png"
              alt="Manarah Institute logo"
              width={84}
              height={84}
              className="mb-1 h-[72px] w-[72px] object-contain"
              priority
            />
          </div>

          <div className="mb-4 sm:mb-7">
            <h2 className="mb-1 text-[1.9rem] font-headline font-bold leading-tight text-[#191c1d] sm:text-3xl">Welcome Back</h2>
            <p className="font-body text-[#3f4849]">Please enter your credentials to continue.</p>
          </div>

          <LoginForm />

          <div className="mt-8 hidden flex-col items-center gap-3 border-t border-[#edeeef] pt-6 sm:flex">
            <p className="font-body text-sm text-[#3f4849]">Need technical assistance?</p>
            <div className="flex gap-6">
              <button type="button" className="flex items-center gap-1 text-xs font-semibold text-[#6f7979] transition hover:text-[#004649]">
                Support Center
              </button>
              <button type="button" className="flex items-center gap-1 text-xs font-semibold text-[#6f7979] transition hover:text-[#004649]">
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
