import Image from 'next/image';

type LogoLoaderProps = {
  compact?: boolean;
};

export default function LogoLoader({ compact = false }: LogoLoaderProps) {
  return (
    <div className={`flex min-h-[40vh] w-full items-center justify-center ${compact ? '' : 'min-h-screen bg-[#f8f9fa]'}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-2xl bg-white p-3 shadow-[0_10px_30px_rgba(0,70,73,0.12)] ring-1 ring-[#e2e8e8]">
          <Image
            src="/manarah-mark.png"
            alt="Manarah Institute logo"
            width={compact ? 170 : 220}
            height={compact ? 57 : 74}
            className="h-auto w-auto max-w-full"
            priority
          />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-[#004649]">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#004649]" />
          <span>Loading...</span>
        </div>
      </div>
    </div>
  );
}

