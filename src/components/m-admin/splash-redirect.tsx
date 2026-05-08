'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function SplashRedirect({ to, delayMs = 2200 }: { to: string; delayMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace(to);
    }, delayMs);
    return () => clearTimeout(t);
  }, [router, to, delayMs]);

  return null;
}
