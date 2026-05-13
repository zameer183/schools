'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      const target = data.role === 'ADMIN' ? '/admin' : data.role === 'TEACHER' ? '/teacher' : data.role === 'STUDENT' ? '/student' : '/parent';
      router.push(target);
    } catch {
      setError('Unable to login right now');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">

      {/* Email */}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-[#94a3b8]">
          Email Address
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </span>
          <input
            id="email"
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-10 pr-4 text-sm text-[#0f172a] outline-none transition placeholder:text-[#c4cdd8] focus:border-[#C9952A] focus:bg-white focus:ring-2 focus:ring-[#C9952A]/15 sm:h-12"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@manarah.edu"
            type="email"
            required
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-widest text-[#94a3b8]">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs font-semibold text-[#C9952A] transition hover:text-[#a87820] hover:underline">
            Forgot Password?
          </Link>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <input
            id="password"
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-10 pr-16 text-sm text-[#0f172a] outline-none transition placeholder:text-[#c4cdd8] focus:border-[#C9952A] focus:bg-white focus:ring-2 focus:ring-[#C9952A]/15 sm:h-12"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0C3D2E]"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Remember me */}
      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          id="remember"
          className="h-4 w-4 cursor-pointer rounded border-[#cbd5e1] accent-[#C9952A]"
        />
        <label htmlFor="remember" className="cursor-pointer select-none text-sm text-[#64748b]">
          Remember me for 30 days
        </label>
      </div>

      {/* Error */}
      {error ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#dc2626]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm font-medium text-[#dc2626]">{error}</p>
        </div>
      ) : null}

      {/* Submit */}
      <button
        disabled={loading}
        className="group relative mt-1 flex h-11 w-full items-center justify-center overflow-hidden rounded-xl bg-[#0C3D2E] text-sm font-bold text-white shadow-[0_4px_20px_rgba(12,61,46,0.30)] transition hover:bg-[#0e4a37] active:scale-[0.98] disabled:opacity-60 sm:h-12"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-[#C9952A]/0 via-[#C9952A]/10 to-[#C9952A]/0 opacity-0 transition group-hover:opacity-100" />
        <span className="relative flex items-center gap-2">
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Signing in...
            </>
          ) : (
            <>
              Sign In to Portal
              <svg className="h-4 w-4 transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </>
          )}
        </span>
      </button>
    </form>
  );
}
