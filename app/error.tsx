'use client';

import { useEffect } from 'react';
import Image from 'next/image';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app/error]', error);

    const message = `${error?.name ?? ''} ${error?.message ?? ''}`.toLowerCase();
    const isChunkLoadError =
      message.includes('chunkloaderror') ||
      message.includes('loading chunk') ||
      message.includes('failed to fetch dynamically imported module');

    if (!isChunkLoadError || typeof window === 'undefined') return;

    const reloadKey = '__chunk_reload_once__';
    const alreadyReloaded = window.sessionStorage.getItem(reloadKey);
    if (!alreadyReloaded) {
      window.sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] p-6">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] p-6 text-center">
        <Image
          src="/manarah-mark.png"
          alt="Manarah Institute logo"
          width={220}
          height={74}
          className="mx-auto h-auto w-[220px] max-w-full"
          priority
        />
        <h2 className="mt-5 text-xl font-bold text-[#1a1c1c]">Something went wrong</h2>
        <p className="mt-2 text-sm text-[#5c6668]">Please try again. If issue repeats, refresh once.</p>
        {error.digest ? <p className="mt-1 text-xs text-[#6f7979]">Digest: {error.digest}</p> : null}
        <button
          onClick={reset}
          className="mt-5 h-10 rounded-lg bg-[#004649] px-4 text-sm font-semibold text-white hover:bg-[#005a5e]"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

