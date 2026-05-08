interface LogoLoaderProps {
  compact?: boolean;
}

export default function LogoLoader({ compact }: LogoLoaderProps) {
  return (
    <div className={`flex items-center justify-center ${compact ? 'py-12' : 'min-h-screen'}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e0eff0] border-t-[#2b676e]" />
        {!compact && <p className="text-sm font-medium text-[#6B7280]">Loading...</p>}
      </div>
    </div>
  );
}
