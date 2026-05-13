import Image from 'next/image';
import Link from 'next/link';
import LoginForm from '../_form';

const THEME = {
  accent: '#0ea5e9',
  accentAlpha: 'rgba(14,165,233,0.15)',
  btnBg: 'linear-gradient(135deg, #0B2E4A 0%, #0e4d82 100%)',
  btnShadow: 'rgba(11,46,74,0.40)',
};

const BG = '#0B2E4A';

export default function TeacherLoginPage() {
  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] overflow-hidden md:h-screen" style={{ background: BG }}>

      {/* Subtle grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.8"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>
      </div>

      {/* Ambient glows */}
      <div className="pointer-events-none absolute -left-24 top-1/3 h-[400px] w-[400px] rounded-full bg-[#0ea5e9]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-20 right-1/3 h-[350px] w-[350px] rounded-full bg-[#0284c7]/15 blur-[100px]" />

      {/* ── Left panel ── */}
      <div className="relative hidden flex-col md:flex md:w-[52%] lg:w-[55%]">
        <div className="absolute left-0 top-0 z-10 h-[3px] w-full bg-gradient-to-r from-[#0ea5e9] via-[#38bdf8] to-transparent" />
        <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-gradient-to-b from-[#0ea5e9]/80 via-[#0ea5e9]/20 to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 lg:p-14">
          <div>
            <Image
              src="/manarah-p4.png"
              alt="Manarah Institute"
              width={1382}
              height={504}
              className="h-auto w-[300px] object-contain drop-shadow-[0_4px_24px_rgba(14,165,233,0.2)] lg:w-[380px]"
              priority
            />

            <div className="mt-8 flex items-center gap-3">
              <div className="h-[2px] w-8 rounded-full bg-[#0ea5e9]" />
              <div className="h-[1px] w-16 rounded-full bg-white/15" />
            </div>

            <div className="mt-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0ea5e9]/80">
                Educator Portal
              </p>
              <h1 className="text-4xl font-bold leading-[1.2] text-white xl:text-5xl">
                Empowering
                <br />
                <span className="bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] bg-clip-text text-transparent">
                  Educators,
                </span>
                <br />
                <span className="bg-gradient-to-r from-[#0ea5e9] to-[#7dd3fc] bg-clip-text text-transparent">
                  Inspiring Minds
                </span>
              </h1>
              <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-white/50">
                Manage your classes, track attendance, assign work, and review results — effortlessly.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Classes Today', value: '8' },
              { label: 'My Students', value: '240+' },
              { label: 'Assignments', value: '36' },
            ].map((stat) => (
              <div key={stat.label} className="group relative overflow-hidden rounded-2xl bg-white/[0.06] px-4 py-5 ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-white/[0.09] hover:ring-[#0ea5e9]/30">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#0ea5e9]/40 to-transparent" />
                <p className="text-xl font-bold text-[#38bdf8] lg:text-2xl">{stat.value}</p>
                <p className="mt-1 text-[11px] font-medium leading-tight text-white/40">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-[#f7f8fa] px-5 py-8 shadow-[-20px_0_60px_rgba(0,0,0,0.25)] sm:px-8 md:rounded-l-[2.5rem] md:px-10 lg:px-14">

        {/* Mobile sky accent */}
        <div className="absolute left-6 right-6 top-0 h-[3px] rounded-b-full bg-gradient-to-r from-[#0ea5e9] to-transparent md:hidden" />

        <div className="w-full max-w-[400px]">

          {/* Back link */}
          <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#94a3b8] transition hover:text-[#0B2E4A]">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            All Portals
          </Link>

          {/* Mobile logo */}
          <div className="mb-7 block md:hidden">
            <div className="overflow-hidden rounded-2xl border border-[#dbeafe] px-6 py-5 shadow-sm" style={{ background: BG }}>
              <Image src="/manarah-p4.png" alt="Manarah Institute" width={1382} height={504} className="mx-auto h-auto w-full max-w-[240px] object-contain" priority/>
            </div>
          </div>

          {/* Header */}
          <div className="mb-7">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-5 w-1 rounded-full bg-[#0ea5e9]" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#0ea5e9]">Teacher Portal</p>
            </div>
            <h2 className="text-[1.65rem] font-bold text-[#0B2E4A]">Welcome Back</h2>
            <p className="mt-1 text-sm text-[#94a3b8]">Sign in to your educator dashboard</p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-[#e2eef6] bg-white p-6 shadow-[0_4px_24px_rgba(11,46,74,0.07)]">
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
