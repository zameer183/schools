import Image from 'next/image';
import Link from 'next/link';
import LoginForm from '../_form';

const THEME = {
  accent: '#C9952A',
  accentAlpha: 'rgba(201,149,42,0.15)',
  btnBg: 'linear-gradient(135deg, #0C3D2E 0%, #1a5c41 100%)',
  btnShadow: 'rgba(12,61,46,0.35)',
};

export default function AdminLoginPage() {
  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#0C3D2E] md:h-screen">

      {/* Islamic geometric pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="geo" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="white" strokeWidth="0.8"/>
              <path d="M30 10 L50 30 L30 50 L10 30 Z" fill="none" stroke="white" strokeWidth="0.5"/>
              <circle cx="30" cy="30" r="4" fill="none" stroke="white" strokeWidth="0.5"/>
              <circle cx="0" cy="0" r="4" fill="none" stroke="white" strokeWidth="0.5"/>
              <circle cx="60" cy="0" r="4" fill="none" stroke="white" strokeWidth="0.5"/>
              <circle cx="0" cy="60" r="4" fill="none" stroke="white" strokeWidth="0.5"/>
              <circle cx="60" cy="60" r="4" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#geo)"/>
        </svg>
      </div>

      {/* Ambient glows */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-[500px] w-[500px] rounded-full bg-[#C9952A]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 h-[400px] w-[400px] rounded-full bg-[#1a5c41]/60 blur-[100px]" />

      {/* ── Left panel ── */}
      <div className="relative hidden flex-col md:flex md:w-[52%] lg:w-[55%]">
        <div className="absolute left-0 top-0 z-10 h-[3px] w-full bg-gradient-to-r from-[#C9952A] via-[#e8b84b] to-transparent" />
        <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-gradient-to-b from-[#C9952A]/80 via-[#C9952A]/20 to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 lg:p-14">
          <div>
            <Image
              src="/manarah-p4.png"
              alt="Manarah Institute"
              width={1382}
              height={504}
              className="h-auto w-[300px] object-contain drop-shadow-[0_4px_24px_rgba(201,149,42,0.18)] lg:w-[380px]"
              priority
            />

            <div className="mt-8 flex items-center gap-3">
              <div className="h-[2px] w-8 rounded-full bg-[#C9952A]" />
              <div className="h-[1px] w-16 rounded-full bg-white/15" />
            </div>

            <div className="mt-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#C9952A]/80">
                Administration Portal
              </p>
              <h1 className="text-4xl font-bold leading-[1.2] text-white xl:text-5xl">
                Manage with
                <br />
                <span className="bg-gradient-to-r from-[#C9952A] to-[#e8b84b] bg-clip-text text-transparent">
                  Clarity &
                </span>
                <br />
                <span className="bg-gradient-to-r from-[#C9952A] to-[#e8b84b] bg-clip-text text-transparent">
                  Purpose
                </span>
              </h1>
              <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-white/50">
                Full control over students, staff, fees, and academics — all in one place.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Students Enrolled', value: '2,400+' },
              { label: 'Staff Members', value: '120+' },
              { label: 'Active Classes', value: '80+' },
            ].map((stat) => (
              <div key={stat.label} className="group relative overflow-hidden rounded-2xl bg-white/[0.06] px-4 py-5 ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-white/[0.09] hover:ring-[#C9952A]/30">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C9952A]/40 to-transparent" />
                <p className="text-xl font-bold text-[#C9952A] lg:text-2xl">{stat.value}</p>
                <p className="mt-1 text-[11px] font-medium leading-tight text-white/40">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-[#f7f8fa] px-5 py-8 shadow-[-20px_0_60px_rgba(0,0,0,0.25)] sm:px-8 md:rounded-l-[2.5rem] md:px-10 lg:px-14">

        {/* Mobile gold accent */}
        <div className="absolute left-6 right-6 top-0 h-[3px] rounded-b-full bg-gradient-to-r from-[#C9952A] to-transparent md:hidden" />

        <div className="w-full max-w-[400px]">

          {/* Back link */}
          <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#94a3b8] transition hover:text-[#0C3D2E]">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            All Portals
          </Link>

          {/* Mobile logo */}
          <div className="mb-7 block md:hidden">
            <div className="overflow-hidden rounded-2xl border border-[#e8eeeb] bg-[#0C3D2E] px-6 py-5 shadow-sm">
              <Image src="/manarah-p4.png" alt="Manarah Institute" width={1382} height={504} className="mx-auto h-auto w-full max-w-[240px] object-contain" priority/>
            </div>
          </div>

          {/* Header */}
          <div className="mb-7">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-5 w-1 rounded-full bg-[#C9952A]" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#C9952A]">Admin Portal</p>
            </div>
            <h2 className="text-[1.65rem] font-bold text-[#0C3D2E]">Welcome Back</h2>
            <p className="mt-1 text-sm text-[#94a3b8]">Sign in to your admin dashboard</p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-[#e8eeeb] bg-white p-6 shadow-[0_4px_24px_rgba(12,61,46,0.07)]">
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
