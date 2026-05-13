'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token. Request a new link.');
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
      } else {
        setDone(true);
        setTimeout(() => router.push('/login'), 3000);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-between p-6">
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Image
              src="/manarah-p4.png"
              alt="Manarah Institute logo"
              width={1382}
              height={504}
              className="mx-auto h-auto w-[220px] max-w-full"
              priority
            />
          </div>

          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,70,73,0.10)] overflow-hidden">
            <div className="h-44 bg-[#1b5e62] relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#004649] to-[#1b5e62]" />
              <div className="relative z-10 text-white text-center px-6">
                <p className="text-xs opacity-60 uppercase tracking-widest">Set New Password</p>
              </div>
            </div>

            <div className="p-7">
              {done ? (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-[#e8f5e9] flex items-center justify-center mx-auto">
                    <svg className="h-7 w-7 text-[#004649]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                  <h2 className="font-headline text-2xl font-bold text-[#1a1c1c]">Password Updated</h2>
                  <p className="text-sm text-[#6f7979] leading-relaxed">
                    Your password has been reset. Redirecting to login...
                  </p>
                  <Link
                    href="/login"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#865300] hover:underline"
                  >
                    Go to Login
                  </Link>
                </div>
              ) : (
                <>
                  <h2 className="font-headline text-2xl font-bold text-[#1a1c1c] mb-1">New Password</h2>
                  <p className="text-sm text-[#6f7979] leading-relaxed mb-6">
                    Choose a strong password for your account.
                  </p>

                  <form onSubmit={onSubmit} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#6f7979] mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="h-12 w-full rounded-xl bg-[#edeeef] border-none px-4 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#6f7979] mb-2">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Repeat password"
                        className="h-12 w-full rounded-xl bg-[#edeeef] border-none px-4 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2"
                      />
                    </div>

                    {error && (
                      <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !token}
                      className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] text-sm font-bold text-white shadow-[0_8px_20px_rgba(0,70,73,0.15)] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                    >
                      {loading ? 'Updating...' : 'Update Password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
