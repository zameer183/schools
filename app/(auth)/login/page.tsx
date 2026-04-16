'use client';

import { useState } from 'react';
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
    <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c]">
      <main className="flex min-h-screen">
        <section className="relative hidden w-1/2 overflow-hidden bg-[#124346] lg:flex lg:flex-col lg:justify-center lg:px-12">
          <div className="absolute inset-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAt6EeJjyyzAUfD2uojijFuVcmP7q4dZt7F9_4oLG5UXtEaQnl2XJdr20WmZw5yQuoqBSkIZS-G6RuV_0F5cafOIHN6yj6ZRUxcE1wL-5ceLJeegONND39l8DpGv3vVdYrRjJFsXUfbDo19FiJ7koEXkwc839P0TLPv-VdJryw_OoVkpU7xzrXAkzN4Y4oxv1VciResoFmC6ACaS-Oe1pdEf7_AfPKExZk4yUlTyoCr-XtnMhUWJh6dAWXo8P2otvQyx5bf0AD2mlw"
              alt="Academic campus"
              className="h-full w-full object-cover opacity-30 grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#124346]/95 to-[#2d5a5e]/85" />
          </div>

          <div className="relative z-10 max-w-xl">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2r4HKadwDneVN7JeS81-lgdTwt06XZX9AdExp8VeBtLpPHRxQqSV66ZzfqTisAPG8jzJC9C5q4SPBY-KResnZ2JiPQXr1TXMYYr5ielg3EhDQ0aAs85XTiOpHzMYtRzggLUV0asBHmGMHbG04YnPsU-Egf-094ZpFcXAnPebpSfhldzcy5QpWtBPJhXgkgWuYZLjVZpZGhn7ZmLmMSWqIUpgGYUsYCtAJbUJCN-HEIODuf26GlYgZ0kUTcCxZX6a8bRDt0QZRi_g"
              alt="Manarah logo"
              className="mb-10 h-20 w-auto"
            />
            <h1 className="font-headline text-4xl font-extrabold leading-tight text-white">Welcome to the Curator&apos;s Portal.</h1>
            <p className="mt-6 text-lg font-light leading-relaxed text-[#cde4e7]">
              An editorial space designed for academic leadership. Manage your institution with precision and clarity.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Premium Admin Access
            </div>
          </div>

          <div className="absolute bottom-10 left-12 right-12 flex justify-between border-t border-white/15 pt-5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/70">
            <span>Excellence In Education</span>
            <span>Est. 2024</span>
          </div>
        </section>

        <section className="relative flex w-full items-center justify-center px-6 py-10 lg:w-1/2 lg:p-12">
          <div className="absolute inset-0 -z-10 overflow-hidden lg:hidden">
            <div className="absolute right-[-12%] top-[-10%] h-[42%] w-[62%] rounded-full bg-[#bcebef]/25 blur-[120px]" />
            <div className="absolute bottom-[-8%] left-[-8%] h-[30%] w-[55%] rounded-full bg-[#ffdcbd]/20 blur-[100px]" />
          </div>

          <div className="w-full max-w-md">
            <div className="mb-10 text-center lg:hidden">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfo15yTdPS9Z7nBbzrOUJp2UOaREBnF-Ye6ELO_F9QlKXz2CN1oOxC8imn37-CLQ1aWXL4MCDNQtUfrFG2KA_iyxUgaGaCTDwRX_TfhqIBCHAJUNWUlrIpMA5mgjtOEMVuoTg__XvLQivhklI_LBOe35HpRIh382EAb3T2XVFNIswcHnaxepK5rg7oHtyvzGTzQn_7elzLhcLMD_Gh7dNsw4NbXUzSwO6qAxlr4Y5f7po5IkGWuflLng9_DyklaYWZcb2fYo_UGLU"
                alt="Manarah logo"
                className="mx-auto mb-4 h-16 w-auto"
              />
              <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[#124346]">Welcome Back</h2>
              <p className="mt-1 text-sm text-[#404849]">Sign in to your curator dashboard</p>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
              <div className="hidden lg:block">
                <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[#1a1c1c]">Sign In</h2>
                <p className="mt-2 text-[#404849]">Access your administrative dashboard</p>
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-5 lg:mt-8">
                <div>
                  <label htmlFor="email" className="ml-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#895100]">
                    Email
                  </label>
                  <input
                    id="email"
                    className="mt-2 h-14 w-full rounded-xl border-none bg-[#f3f4f3] px-4 text-[#1a1c1c] placeholder:text-[#707979] focus:ring-2 focus:ring-[#a1cfd3]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="curator@manarah.edu"
                    type="email"
                    required
                  />
                </div>

                <div>
                  <div className="ml-1 flex items-center justify-between">
                    <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#895100]">
                      Password
                    </label>
                    <button type="button" className="text-xs font-semibold text-[#895100] hover:underline">
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    id="password"
                    className="mt-2 h-14 w-full rounded-xl border-none bg-[#f3f4f3] px-4 text-[#1a1c1c] placeholder:text-[#707979] focus:ring-2 focus:ring-[#a1cfd3]"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                {error ? <p className="text-sm text-[#ba1a1a]">{error}</p> : null}

                <button
                  disabled={loading}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#124346] font-headline text-base font-bold text-white shadow-lg shadow-[#124346]/20 transition active:scale-[0.98] disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            </div>

            <div className="mt-8 space-y-5 text-center lg:hidden">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-[#c0c8c9]/40" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#707979]">or explore as</span>
                <div className="h-px flex-1 bg-[#c0c8c9]/40" />
              </div>
              <button type="button" className="h-12 w-full rounded-xl border border-[#c0c8c9]/40 bg-[#e7e8e8] text-sm font-medium text-[#404849]">
                Guest Access
              </button>
              <p className="text-xs text-[#404849]">
                Don&apos;t have an account? <span className="font-bold text-[#124346]">Apply for Enrollment</span>
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 py-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-6 text-xs text-slate-500 md:flex-row">
          <div>© 2024 Manarah Institute. All rights reserved.</div>
          <nav className="flex gap-5">
            <a href="#" className="hover:text-teal-700">Privacy Policy</a>
            <a href="#" className="hover:text-teal-700">Terms of Service</a>
            <a href="#" className="hover:text-teal-700">Contact Support</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
