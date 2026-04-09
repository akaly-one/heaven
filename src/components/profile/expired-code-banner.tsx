import { AlertTriangle } from "lucide-react";

interface ExpiredCodeBannerProps {
  tierName: string;
  onUnlock: () => void;
}

export function ExpiredCodeBanner({ tierName, onUnlock }: ExpiredCodeBannerProps) {
  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12 mb-4 mt-4">
      <div className="flex items-center justify-between px-5 py-3.5 rounded-xl"
        style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.2)" }}>
        <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: "var(--warning)" }}>
          <AlertTriangle className="w-4 h-4" />
          <span>Ton code a expire</span>
        </div>
        <button
          onClick={onUnlock}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
          style={{ background: "var(--warning)", color: "#fff" }}
        >
          Renouveler
        </button>
      </div>
    </div>
  );
}
