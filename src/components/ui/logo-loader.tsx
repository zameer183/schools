import Image from 'next/image';

interface LogoLoaderProps {
  compact?: boolean;
}

export default function LogoLoader({ compact }: LogoLoaderProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e0eff0] border-t-[#2b676e]" />
          <p className="text-sm font-medium text-[#6B7280]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white/90 px-6">
      <div className="flex flex-col items-center gap-5 rounded-3xl border border-[#e6ecec] bg-white px-8 py-10 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
        <Image
          src="/manarah-logo.png"
          alt="Manarah Institute logo"
          width={320}
          height={120}
          className="h-auto w-[180px] object-contain"
          priority
        />
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e0eff0] border-t-[#2b676e]" />
        <p className="text-sm font-medium text-[#6B7280]">Loading...</p>
      </div>
    </div>
  );
}
