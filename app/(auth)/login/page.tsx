'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@stitchhms.com');
  const [password, setPassword] = useState('Pass@123');
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
      router.refresh();
    } catch {
      setError('Unable to login right now');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f8f9fa] text-[#191c1d] flex items-center justify-center p-6">
      <div className="fixed top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-[#004649]/5 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full bg-[#865300]/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-white rounded-[2.5rem] overflow-hidden border border-[#e2e8e8]">

        <div className="hidden md:flex flex-col justify-between p-12 bg-[#1b5e62] relative overflow-hidden text-white">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>

          <div className="z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="text-2xl font-black tracking-tight text-white font-headline">S</span>
              </div>
              <span className="font-headline font-black uppercase tracking-[0.2em] text-2xl">Scholarly</span>
            </div>
            <h1 className="text-5xl font-headline font-extrabold tracking-tight leading-tight mb-6">
              Cultivating the{' '}
              <br />
              <span className="text-[#fdb24f]">Leaders of Tomorrow</span>
            </h1>
            <p className="text-lg opacity-80 max-w-md font-body leading-relaxed">
              Access your personalized academic atelier. Manage grades, attendance, and student growth with editorial precision and effortless clarity.
            </p>
          </div>

          <div className="z-10 mt-12 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
            <p className="text-[11px] font-label font-bold uppercase tracking-[0.15em] text-[#ffddb8] mb-4">Latest Institution Update</p>
            <h3 className="text-xl font-headline font-bold mb-2">Academic Excellence Forum 2024</h3>
            <p className="text-sm opacity-70">Registration for the annual student-teacher synergy workshop is now open for all departments.</p>
          </div>
        </div>

        <div className="p-8 md:p-14 flex flex-col justify-center bg-white">
          <div className="mb-8 block md:hidden">
            <div className="w-10 h-10 rounded-xl bg-[#004649] flex items-center justify-center mb-4">
              <span className="text-lg font-black text-white font-headline">S</span>
            </div>
            <h2 className="text-2xl font-headline font-black uppercase tracking-[0.15em] text-[#004649]">Scholarly</h2>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-headline font-bold text-[#191c1d] mb-2">Welcome Back</h2>
            <p className="text-[#3f4849] font-body">Please enter your credentials to continue.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-[0.15em] text-[#6f7979] mb-2 ml-1">
                Academic Email
              </label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6f7979]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                <input
                  id="email"
                  className="h-14 w-full rounded-xl border-none bg-[#edeeef] pl-12 pr-4 text-[#191c1d] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@scholarly.edu"
                  type="email"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 ml-1">
                <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-[0.15em] text-[#6f7979]">
                  Password
                </label>
                <Link href="/forgot-password" className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#865300] hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6f7979]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <input
                  id="password"
                  className="h-14 w-full rounded-xl border-none bg-[#edeeef] pl-12 pr-4 text-[#191c1d] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 py-1">
              <input
                type="checkbox"
                id="remember"
                className="h-5 w-5 rounded border-[#bfc8c9] text-[#004649] focus:ring-[#004649]/20 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-[#3f4849] font-body cursor-pointer">
                Remember my workstation
              </label>
            </div>

            {error ? <p className="text-sm text-[#ba1a1a]">{error}</p> : null}

            <button
              disabled={loading}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] font-headline text-lg font-bold text-white shadow-[0_8px_20px_rgba(0,70,73,0.15)] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In to Portal'}
              {!loading && (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-[#edeeef] flex flex-col items-center gap-4">
            <p className="text-sm text-[#3f4849] font-body">Need technical assistance?</p>
            <div className="flex gap-6">
              <a href="#" className="text-xs font-semibold text-[#6f7979] hover:text-[#004649] transition flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
                Support Center
              </a>
              <a href="#" className="text-xs font-semibold text-[#6f7979] hover:text-[#004649] transition flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
