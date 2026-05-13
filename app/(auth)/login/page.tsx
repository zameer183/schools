import Image from 'next/image';
import Link from 'next/link';

const roles = [
  {
    href: '/login/admin',
    label: 'Admin',
    tagline: 'Manage your institution',
    accent: '#D6A44C',
    glow: 'rgba(214,164,76,0.20)',
    border: 'rgba(214,164,76,0.35)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    href: '/login/teacher',
    label: 'Teacher',
    tagline: 'Inspire minds, shape futures',
    accent: '#FB923C',
    glow: 'rgba(251,146,60,0.20)',
    border: 'rgba(251,146,60,0.35)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="8" y1="7" x2="16" y2="7"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
  },
  {
    href: '/login/student',
    label: 'Student',
    tagline: 'Begin your journey to excellence',
    accent: '#E9B384',
    glow: 'rgba(233,179,132,0.20)',
    border: 'rgba(233,179,132,0.35)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    ),
  },
];

export default function LoginSelectorPage() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#0C3D2E] px-5 py-12">

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
      <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[#C9952A]/8 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-[400px] w-[400px] rounded-full bg-[#1a5c41]/50 blur-[100px]" />

      <div className="relative z-10 w-full max-w-3xl text-center">

        {/* Logo */}
        <div className="mb-10">
          <Image
            src="/manarah-p4.png"
            alt="Manarah Institute"
            width={1382}
            height={504}
            className="mx-auto h-auto w-[240px] object-contain drop-shadow-[0_4px_24px_rgba(201,149,42,0.2)]"
            priority
          />
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="h-[1px] w-12 rounded-full bg-[#C9952A]/40" />
            <div className="h-1 w-1 rounded-full bg-[#C9952A]/60" />
            <div className="h-[1px] w-12 rounded-full bg-[#C9952A]/40" />
          </div>
        </div>

        {/* Heading */}
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#C9952A]/70">
          Manarah Portal
        </p>
        <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">
          Welcome Back
        </h1>
        <p className="mb-10 text-sm text-white/40">
          Choose your role to continue
        </p>

        {/* Role cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {roles.map((role) => (
            <Link
              key={role.href}
              href={role.href}
              style={{ '--glow': role.glow, '--border': role.border } as React.CSSProperties}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-7 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-[var(--border)] hover:bg-white/[0.09] hover:shadow-[0_12px_40px_var(--glow)]"
            >
              {/* Top accent line */}
              <div
                className="absolute inset-x-0 top-0 h-[2px] opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: `linear-gradient(90deg, transparent, ${role.accent}, transparent)` }}
              />

              {/* Icon */}
              <div
                className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/[0.07] ring-1 ring-white/10 transition-colors group-hover:bg-white/[0.12]"
                style={{ color: role.accent }}
              >
                {role.icon}
              </div>

              {/* Text */}
              <h2 className="mb-1 text-lg font-bold text-white">{role.label}</h2>
              <p className="text-[13px] leading-relaxed text-white/45">{role.tagline}</p>

              {/* Arrow */}
              <div
                className="mt-5 flex items-center gap-1.5 text-xs font-semibold transition-all group-hover:gap-2.5"
                style={{ color: role.accent }}
              >
                Sign in
                <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-10 text-[11px] uppercase tracking-widest text-white/20">
          Manarah Institute &copy; 2026
        </p>
      </div>
    </div>
  );
}
