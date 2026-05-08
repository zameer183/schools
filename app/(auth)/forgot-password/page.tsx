'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-between p-6">
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Image
              src="/manarah-mark.png"
              alt="Manarah Institute logo"
              width={220}
              height={74}
              className="mx-auto h-auto w-[220px] max-w-full"
              priority
            />
          </div>

          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,70,73,0.10)] overflow-hidden">
            <div className="h-44 bg-[#1b5e62] relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#004649] to-[#1b5e62]" />
              <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice">
                <rect x="20" y="70" width="160" height="4" rx="2" fill="white" />
                <rect x="30" y="55" width="140" height="60" rx="3" fill="none" stroke="white" strokeWidth="1" />
                <rect x="70" y="85" width="60" height="35" rx="2" fill="white" opacity="0.3" />
                <ellipse cx="45" cy="60" rx="12" ry="16" fill="white" opacity="0.2" />
              </svg>
              <div className="relative z-10 text-white text-center px-6">
                <p className="text-xs opacity-60 uppercase tracking-widest">Open Book</p>
              </div>
            </div>

            <div className="p-7">
              {sent ? (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-[#e8f5e9] flex items-center justify-center mx-auto">
                    <svg className="h-7 w-7 text-[#004649]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                  <h2 className="font-headline text-2xl font-bold text-[#1a1c1c]">Check Your Inbox</h2>
                  <p className="text-sm text-[#6f7979] leading-relaxed">
                    We sent a secure reset link to <span className="font-semibold text-[#1a1c1c]">{email}</span>. Please check your email.
                  </p>
                  <Link
                    href="/login"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#865300] hover:underline"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                    </svg>
                    Back to Login
                  </Link>
                </div>
              ) : (
                <>
                  <h2 className="font-headline text-2xl font-bold text-[#1a1c1c] mb-1">Account Recovery</h2>
                  <p className="text-sm text-[#6f7979] leading-relaxed mb-6">
                    Enter the institutional email associated with your profile. We will dispatch a secure reset link to your inbox.
                  </p>

                  <form onSubmit={onSubmit} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#6f7979] mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6f7979]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@university.edu"
                          className="h-12 w-full rounded-xl bg-[#edeeef] border-none pl-10 pr-4 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] text-sm font-bold text-white shadow-[0_8px_20px_rgba(0,70,73,0.15)] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                    >
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </form>

                  <div className="mt-5 text-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#865300] hover:underline"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                      </svg>
                      Back to Login
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-[#6f7979] uppercase tracking-widest text-center mt-6">
        Secure Student Portal &copy; 2026 Manarah Institute
      </p>
    </div>
  );
}

