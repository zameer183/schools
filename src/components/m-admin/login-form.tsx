'use client';

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export function MobileLoginForm() {
  const [email, setEmail] = useState('manarahinstitute01@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      if (data.role !== 'ADMIN') {
        setError('This portal is for the admin role only');
        return;
      }

      window.location.assign('/m/admin');
    } catch {
      setError('Unable to login right now');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[11px] font-medium text-[#6B7280]">Email or institute ID</label>
        <div className="flex h-11 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 focus-within:border-[#1B4D4B] focus-within:ring-2 focus-within:ring-[#1B4D4B]/20">
          <Mail className="h-4 w-4 text-[#6B7280]" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 bg-transparent text-sm text-[#111] outline-none"
            placeholder="manarahinstitute01@gmail.com"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[11px] font-medium text-[#6B7280]">Password</label>
        <div className="flex h-11 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 focus-within:border-[#1B4D4B] focus-within:ring-2 focus-within:ring-[#1B4D4B]/20">
          <Lock className="h-4 w-4 text-[#1B4D4B]" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="flex-1 bg-transparent text-sm text-[#111] outline-none"
            placeholder="Pass@123"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="text-[#6B7280]"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-[#6B7280]">
          <input type="checkbox" className="h-4 w-4 rounded border-[#E5E7EB] accent-[#1B4D4B]" />
          Remember me
        </label>
        <a href="/forgot-password" className="text-xs font-medium text-[#1B4D4B]">
          Forgot password?
        </a>
      </div>

      {error ? <p className="text-xs text-[#B91C1C]">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-[#E68A00] text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="flex items-center gap-3 pt-2">
        <span className="h-px flex-1 bg-[#E5E7EB]" />
        <span className="text-[10px] uppercase tracking-wider text-[#6B7280]">or</span>
        <span className="h-px flex-1 bg-[#E5E7EB]" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="h-10 rounded-xl border border-[#E5E7EB] text-xs font-medium text-[#1B4D4B]"
        >
          Biometric
        </button>
        <button
          type="button"
          className="h-10 rounded-xl border border-[#E5E7EB] text-xs font-medium text-[#1B4D4B]"
        >
          SSO
        </button>
      </div>

      <p className="pt-2 text-center text-[10px] text-[#6B7280]">
        By signing in you agree to our <span className="font-medium text-[#653B28]">Terms</span> and{' '}
        <span className="font-medium text-[#653B28]">Privacy</span>
      </p>
    </form>
  );
}
