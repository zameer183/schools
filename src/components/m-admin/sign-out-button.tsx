'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/m/login');
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full rounded-xl border border-[#E5E7EB] bg-white py-3 text-center text-xs font-medium text-[#B91C1C] disabled:opacity-60"
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
