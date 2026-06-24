'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface LoginTheme {
  accent: string;
  accentAlpha: string;
  btnBg: string;
  btnShadow: string;
}

export default function LoginForm({ theme }: { theme: LoginTheme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid credentials'); return; }
      const target =
        data.role === 'ADMIN' ? '/admin' :
        data.role === 'TEACHER' ? '/teacher' :
        data.role === 'STUDENT' ? '/student' : '/parent';
      window.location.assign(target);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: 'email' | 'password') => ({
    borderColor: focused === field ? theme.accent : '#e2e8f0',
    boxShadow: focused === field ? `0 0 0 3px ${theme.accentAlpha}` : 'none',
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">

      {/* Email */}
      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
          Email Address
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: focused === 'email' ? theme.accent : '#94a3b8' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </span>
          <input
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
            placeholder="your@email.com" style={inputStyle('email')}
            className="h-11 w-full rounded-[14px] border bg-[#f8fafc] pl-11 pr-4 text-[14px] text-[#0d1117] outline-none transition-all placeholder:text-[#c4cdd8] focus:bg-white"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">Password</label>
          <Link href="/forgot-password" style={{ color: theme.accent }} className="text-[13px] font-semibold transition-opacity hover:opacity-70">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: focused === 'password' ? theme.accent : '#94a3b8' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <input
            type={showPassword ? 'text' : 'password'} required value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
            placeholder="••••••••" style={inputStyle('password')}
            className="h-11 w-full rounded-[14px] border bg-[#f8fafc] pl-11 pr-12 text-[14px] text-[#0d1117] outline-none transition-all placeholder:text-[#c4cdd8] focus:bg-white"
          />
          <button type="button" onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#94a3b8] transition hover:text-[#0d1117]">
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-[12px] border border-red-100 bg-red-50 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-[13px] font-medium text-red-600">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit" disabled={loading}
        style={{ background: theme.btnBg, boxShadow: `0 4px 18px ${theme.btnShadow}` }}
        className="group mt-1 flex h-11 w-full items-center justify-center rounded-[14px] text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0 active:scale-[0.99] disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Signing in...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Sign In
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        )}
      </button>

    </form>
  );
}
