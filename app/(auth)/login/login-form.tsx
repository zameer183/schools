'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('admin@stitchhms.com');
  const [password, setPassword] = useState('Pass@123');
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
    <form onSubmit={onSubmit} className="space-y-3 sm:space-y-6">
      <div>
        <label htmlFor="email" className="mb-1.5 ml-1 block text-[11px] font-bold uppercase tracking-[0.15em] text-[#6f7979]">
          Academic Email
        </label>
        <div className="relative">
          <input
            id="email"
            className="h-11 w-full rounded-xl border-none bg-[#edeeef] pl-4 pr-24 text-[#191c1d] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2 sm:h-14"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@manarah.edu"
            type="email"
            required
          />
        </div>
      </div>

      <div>
        <div className="mb-1.5 ml-1 flex items-center justify-between">
          <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-[0.15em] text-[#6f7979]">
            Password
          </label>
          <Link href="/forgot-password" className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#865300] hover:underline">
            Forgot Password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            className="h-11 w-full rounded-xl border-none bg-[#edeeef] pl-4 pr-24 text-[#191c1d] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2 sm:h-14"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#004649] hover:bg-[#e1e4e5]"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <span>{showPassword ? 'Hide' : 'Show'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 py-0.5">
        <input
          type="checkbox"
          id="remember"
          className="h-5 w-5 cursor-pointer rounded border-[#bfc8c9] text-[#004649] focus:ring-[#004649]/20"
        />
        <label htmlFor="remember" className="cursor-pointer text-sm font-body text-[#3f4849]">
          Remember my workstation
        </label>
      </div>

      {error ? <p className="text-sm text-[#ba1a1a]">{error}</p> : null}

      <button
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] text-base font-bold font-headline text-white shadow-[0_8px_20px_rgba(0,70,73,0.15)] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60 sm:h-14 sm:text-lg"
      >
        {loading ? 'Signing in...' : 'Sign In to Portal'}
      </button>
    </form>
  );
}
