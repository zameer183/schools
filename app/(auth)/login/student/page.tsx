import Image from 'next/image';
import Link from 'next/link';
import LoginForm from '../_form';

const THEME = {
  accent: '#c09070',
  accentAlpha: 'rgba(192,144,112,0.15)',
  btnBg: 'linear-gradient(135deg, #2d1b4e 0%, #4a2d7a 100%)',
  btnShadow: 'rgba(45,27,78,0.45)',
};

const BG = '#2d1b4e';

export default function StudentLoginPage() {
  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] overflow-hidden md:h-screen" style={{ background: BG }}>

      {/* Dot pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="white"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)"/>
        </svg>
      </div>

      {/* Ambient glows */}
      <div className="pointer-events-none absolute -right-20 top-0 h-[450px] w-[450px] rounded-full bg-[#c09070]/12 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-20 left-0 h-[350px] w-[350px] rounded-full bg-[#4a2060]/20 blur-[100px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3d2060]/10 blur-[80px]" />

      {/* ── Left panel ── */}
      <div className="relative hidden flex-col md:flex md:w-[52%] lg:w-[55%]">
        <div className="absolute left-0 top-0 z-10 h-[3px] w-full bg-gradient-to-r from-[#c09070] via-[#d4aa88] to-transparent" />
        <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-gradient-to-b from-[#c09070]/80 via-[#c09070]/20 to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 lg:p-14">
          <div>
            <Image
              src="/manarah-p4.png"
              alt="Manarah Institute"
              width={1382}
              height={504}
              className="h-auto w-[300px] object-contain drop-shadow-[0_4px_24px_rgba(139,92,246,0.25)] lg:w-[380px]"
              priority
            />

            <div className="mt-8 flex items-center gap-3">
              <div className="h-[2px] w-8 rounded-full bg-[#c09070]" />
              <div className="h-[1px] w-16 rounded-full bg-white/15" />
            </div>

            <div className="mt-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#d4aa88]/80">
                Student Portal
              </p>
              <h1 className="text-4xl font-bold leading-[1.2] text-white xl:text-5xl">
                Begin Your
                <br />
                <span className="bg-gradient-to-r from-[#c09070] to-[#d4aa88] bg-clip-text text-transparent">
                  Journey to
                </span>
                <br />
                <span className="bg-gradient-to-r from-[#d4aa88] to-[#e8c8a8] bg-clip-text text-transparent">
                  Excellence
                </span>
              </h1>
              <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-white/50">
                Track your attendance, fees, results, and assignments — stay ahead every day.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Attendance', value: '94%' },
              { label: 'Subjects', value: '8' },
              { label: 'Results', value: 'Online' },
            ].map((stat) => (
              <div key={stat.label} className="group relative overflow-hidden rounded-2xl bg-white/[0.06] px-4 py-5 ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-white/[0.09] hover:ring-[#c09070]/30">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#c09070]/40 to-transparent" />
                <p className="text-xl font-bold text-[#d4aa88] lg:text-2xl">{stat.value}</p>
                <p className="mt-1 text-[11px] font-medium leading-tight text-white/40">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-[#f7f8fa] px-5 py-8 shadow-[-20px_0_60px_rgba(0,0,0,0.25)] sm:px-8 md:rounded-l-[2.5rem] md:px-10 lg:px-14">

        {/* Mobile violet accent */}
        <div className="absolute left-6 right-6 top-0 h-[3px] rounded-b-full bg-gradient-to-r from-[#c09070] to-transparent md:hidden" />

        <div className="w-full max-w-[400px]">

          {/* Back link */}
          <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#94a3b8] transition hover:text-[#2d1b4e]">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            All Portals
          </Link>

          {/* Mobile logo */}
          <div className="mb-7 block md:hidden">
            <div className="overflow-hidden rounded-2xl border border-[#ede0d8] px-6 py-5 shadow-sm" style={{ background: BG }}>
              <Image src="/manarah-p4.png" alt="Manarah Institute" width={1382} height={504} className="mx-auto h-auto w-full max-w-[240px] object-contain" priority/>
            </div>
          </div>

          {/* Header */}
          <div className="mb-7">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-5 w-1 rounded-full bg-[#c09070]" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#c09070]">Student Portal</p>
            </div>
            <h2 className="text-[1.65rem] font-bold text-[#2d1b4e]">Welcome Back</h2>
            <p className="mt-1 text-sm text-[#94a3b8]">Sign in to your student dashboard</p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-[#ede0d8] bg-white p-6 shadow-[0_4px_24px_rgba(30,27,75,0.07)]">
            <LoginForm theme={THEME} />
          </div>

          <p className="mt-8 text-center text-[11px] uppercase tracking-widest text-[#cbd5e1]">
            Manarah Institute &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
