import { TIER_META } from "@/constants/tiers";

interface TierMiniHeaderProps {
  tierKey: string;
  avatar: string | null;
  displayName: string;
  normalizeTier: (t: string) => string;
}

export function TierMiniHeader({ tierKey, avatar, displayName, normalizeTier }: TierMiniHeaderProps) {
  const normalized = normalizeTier(tierKey);
  const meta = TIER_META[tierKey];

  return (
    <div className="flex items-center gap-3 max-w-6xl mx-auto px-5 sm:px-8 md:px-12 py-3 fade-up">
      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0" style={{ border: `2px solid var(--tier-${normalized})` }}>
        {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ background: "var(--bg3)" }} />}
      </div>
      <div>
        <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{displayName}</span>
        <span className="text-xs ml-2" style={{ color: `var(--tier-${normalized})` }}>
          {meta?.symbol} {meta?.label}
        </span>
      </div>
    </div>
  );
}
