import Image from 'next/image';
import Link from 'next/link';
import LoginForm, { LoginTheme } from './_form';

type PatternType = 'islamic' | 'grid' | 'dots';

interface Stat { label: string; value: string }

export interface LoginPageConfig {
  theme: LoginTheme;
  bg: string;
  accent: string;
  portalLabel: string;
  headingLines: [string, string, string];
  description: string;
  stats: [Stat, Stat, Stat];
  pattern: PatternType;
}

function BgPattern({ type }: { type: PatternType }) {
  if (type === 'islamic') return (
    <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="p" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="white" strokeWidth="0.8"/>
          <path d="M30 10 L50 30 L30 50 L10 30 Z" fill="none" stroke="white" strokeWidth="0.5"/>
          <circle cx="30" cy="30" r="3.5" fill="none" stroke="white" strokeWidth="0.5"/>
          <circle cx="0"  cy="0"  r="3.5" fill="none" stroke="white" strokeWidth="0.5"/>
          <circle cx="60" cy="0"  r="3.5" fill="none" stroke="white" strokeWidth="0.5"/>
          <circle cx="0"  cy="60" r="3.5" fill="none" stroke="white" strokeWidth="0.5"/>
          <circle cx="60" cy="60" r="3.5" fill="none" stroke="white" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#p)"/>
    </svg>
  );
  if (type === 'grid') return (
    <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.8"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#p)"/>
    </svg>
  );
  return (
    <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="white"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#p)"/>
    </svg>
  );
}

export default function LoginPageLayout({ config }: { config: LoginPageConfig }) {
  const { theme, bg, accent, portalLabel, headingLines, description, stats, pattern } = config;

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] overflow-hidden md:h-screen" style={{ background: bg }}>

      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]">
        <BgPattern type={pattern} />
      </div>

      {/* Ambient glows */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-[520px] w-[520px] rounded-full blur-[140px]" style={{ background: `${accent}1a` }} />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-[400px] w-[400px] rounded-full blur-[120px]" style={{ background: `${bg}99` }} />
      <div className="pointer-events-none absolute left-0 top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full blur-[100px]" style={{ background: `${accent}0d` }} />

      {/* ═══════════════════════════════
          LEFT PANEL — desktop only
      ═══════════════════════════════ */}
      <div className="relative hidden flex-col md:flex md:w-[52%] lg:w-[55%]">
        {/* Accent lines */}
        <div className="absolute left-0 top-0 z-10 h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}40, transparent)` }} />
        <div className="absolute bottom-0 left-0 top-0 w-[2px]" style={{ background: `linear-gradient(180deg, ${accent}cc, ${accent}30, transparent)` }} />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 lg:p-14">

          {/* Logo */}
          <div>
            <div className="inline-block">
              <Image
                src="/manarah-p4.png"
                alt="Manarah Institute"
                width={1382}
                height={504}
                className="h-auto w-[280px] object-contain lg:w-[350px]"
                style={{ filter: `drop-shadow(0 4px 24px ${accent}35)` }}
                priority
              />
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="h-[2px] w-10 rounded-full" style={{ background: accent }} />
              <div className="h-px w-16 rounded-full bg-white/15" />
            </div>

            <div className="mt-7">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: `${accent}cc` }}>
                {portalLabel}
              </p>
              <h1 className="font-bold leading-[1.12] text-white" style={{ fontSize: 'clamp(2.4rem, 4vw, 3.5rem)' }}>
                {headingLines[0]}
                <br />
                <span style={{ color: accent }}>{headingLines[1]}</span>
                <br />
                <span style={{ color: accent }}>{headingLines[2]}</span>
              </h1>
              <p className="mt-5 max-w-[280px] text-[15px] leading-relaxed text-white/50">
                {description}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-[16px] p-4 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)' }}
              >
                <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}55, transparent)` }} />
                <p className="text-[22px] font-bold lg:text-2xl" style={{ color: accent }}>{stat.value}</p>
                <p className="mt-0.5 text-[11px] font-medium leading-tight text-white/38">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════
          RIGHT PANEL — always visible
      ═══════════════════════════════ */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-[#f7f8fa] px-5 py-6 shadow-[-24px_0_70px_rgba(0,0,0,0.22)] sm:px-8 md:rounded-l-[2rem] md:px-10 lg:px-14">

        {/* Mobile top accent bar */}
        <div className="absolute inset-x-5 top-0 h-[3px] rounded-b-full md:hidden" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />

        <div className="w-full max-w-[400px] animate-fade-in-up">

          {/* Back button */}
          <Link
            href="/login"
            className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#64748b] shadow-sm ring-1 ring-[#e2e8f0] transition-all hover:shadow-md hover:text-[#0f172a]"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            All Portals
          </Link>

          {/* Mobile logo */}
          <div className="mb-5 block md:hidden">
            <div
              className="overflow-hidden rounded-[18px] px-5 py-[14px]"
              style={{ background: bg, border: `1px solid ${accent}28`, boxShadow: `0 4px 24px ${accent}18` }}
            >
              <Image
                src="/manarah-p4.png"
                alt="Manarah Institute"
                width={1382}
                height={504}
                className="mx-auto h-auto w-full max-w-[200px] object-contain"
                priority
              />
            </div>
          </div>

          {/* Portal badge + heading */}
          <div className="mb-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: `${accent}16` }}>
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
                {portalLabel}
              </span>
            </div>
            <h2 className="text-[1.75rem] font-bold leading-tight text-[#0d1117] md:text-[2rem]">
              Welcome Back
            </h2>
            <p className="mt-1 text-[14px] text-[#64748b]">
              Sign in to continue to your portal
            </p>
          </div>

          {/* Form card */}
          <div className="animate-fade-in-up-delay rounded-[20px] border border-[#e8edf2] bg-white p-6 shadow-[0_8px_40px_rgba(15,23,42,0.09)]">
            <LoginForm theme={theme} />
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[11px] uppercase tracking-widest text-[#c8d3e0]">
            Manarah Institute &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
