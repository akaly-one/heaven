"use client";

/**
 * AgenceHeader — Phase 2 Agent 2.B
 *
 * Header partagé du shell `/agence/page.tsx` : avatar + name + KPIs inline +
 * tabs + shortcuts. Extrait du monolithe P0-7 pour alléger le shell principal.
 */

import { Eye, Pencil, Link2 } from "lucide-react";
import type { FeedPost, HeavenAuth, AccessCode } from "@/types/heaven";

const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtNum = new Intl.NumberFormat("fr-FR");

export interface AgenceHeaderProps {
  modelSlug: string;
  auth: HeavenAuth | null;
  modelInfo: { avatar?: string; online?: boolean; display_name?: string } | null;
  statusUpdating: boolean;
  revenue: number;
  uniqueClients: number;
  activeCodes: AccessCode[];
  modelCodes: AccessCode[];
  feedPosts: FeedPost[];
  retentionRate: number;
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onAvatarUpload: (file: File) => void;
  onToggleStatus: () => void;
}

export function AgenceHeader(p: AgenceHeaderProps) {
  return (
    <>
      {/* ══ HEADER ══ */}
      <div className="flex items-center gap-4 py-3">
        <div className="relative shrink-0">
          <label className="cursor-pointer">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center text-base font-black"
              style={{ background: p.modelInfo?.avatar ? "transparent" : "linear-gradient(135deg, #E63329, #E84393)", color: "#fff" }}>
              {p.modelInfo?.avatar ? <img src={p.modelInfo.avatar} alt="" className="w-full h-full object-cover" /> : p.modelSlug.charAt(0).toUpperCase()}
            </div>
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0]; if (!file) return;
              p.onAvatarUpload(file);
              e.target.value = "";
            }} />
          </label>
          <button onClick={p.onToggleStatus} disabled={p.statusUpdating}
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full cursor-pointer transition-all border-none p-0 disabled:opacity-50"
            style={{ background: p.modelInfo?.online ? "#10B981" : "#6B7280", boxShadow: `0 0 0 2.5px var(--bg)` }} />
        </div>

        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <span className="text-lg font-bold text-white">
            {p.modelInfo?.display_name || p.auth?.display_name || p.modelSlug.toUpperCase()}
          </span>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.modelInfo?.online ? "#10B981" : "#6B7280" }} />
          <span className="text-xs text-white/30 shrink-0 hidden sm:inline">{p.modelInfo?.online ? "en ligne" : "hors ligne"}</span>
        </div>

        {/* Mobile compact KPI */}
        <div className="flex md:hidden items-center gap-1.5 ml-auto shrink-0">
          <span className="text-[11px] font-black tabular-nums" style={{ color: "#D4AF37" }}>{fmt.format(p.revenue)}</span>
          <span className="text-white/10">·</span>
          <span className="text-[11px] font-bold tabular-nums text-white">{fmtNum.format(p.uniqueClients)}<span className="text-white/25 text-[9px] ml-0.5">abo</span></span>
          <span className="text-white/10">·</span>
          <span className="text-[11px] font-bold tabular-nums text-white">{p.activeCodes.length}<span className="text-white/25 text-[9px]">/{p.modelCodes.length}</span></span>
        </div>

        <div className="flex-1 hidden md:block" />
        <div className="hidden md:flex items-center gap-0 overflow-x-auto no-scrollbar shrink-0">
          {[
            { label: "Rev", value: fmt.format(p.revenue), color: "#D4AF37" },
            { label: "Abo", value: String(p.uniqueClients), color: "var(--text)" },
            { label: "Posts", value: String(p.feedPosts.length), color: "var(--text)" },
            { label: "Ret", value: `${p.retentionRate}%`, color: "var(--text)" },
            { label: "Codes", value: `${p.activeCodes.length}/${p.modelCodes.length}`, color: "var(--text)" },
          ].map((kpi, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2.5">
              {i > 0 && <div className="w-px h-3.5 bg-white/[0.06] mr-1.5" />}
              <span className="text-[10px] text-white/25 uppercase tracking-wider font-medium">{kpi.label}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: kpi.color }}>{kpi.value}</span>
            </div>
          ))}
        </div>

        <button onClick={p.onToggleStatus} disabled={p.statusUpdating}
          className="hidden md:inline-flex px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border border-white/[0.06] bg-transparent shrink-0 disabled:opacity-50"
          style={{ color: p.modelInfo?.online ? "#10B981" : "#6B7280" }}>
          {p.statusUpdating ? "..." : p.modelInfo?.online ? "En ligne" : "Hors ligne"}
        </button>
      </div>

      {/* ══ UNDERLINE TABS + shortcuts ══ */}
      <div className="flex items-center gap-4 md:gap-7 border-b border-white/[0.06]">
        <div className="flex items-center gap-4 md:gap-7 overflow-x-auto no-scrollbar">
          {p.tabs.map(tab => {
            const isActive = p.activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => p.onTabChange(tab.id)}
                className="relative pb-3 text-sm font-medium cursor-pointer transition-colors whitespace-nowrap bg-transparent border-none px-0"
                style={{ color: isActive ? "#D4AF37" : "var(--w35)" }}>
                {tab.label}
                {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#D4AF37" }} />}
              </button>
            );
          })}
        </div>
        <div className="flex-1 min-w-0" />
        <div className="flex items-center gap-0.5 pb-1 shrink-0">
          <a href={`/m/${p.modelSlug}`} target="_blank" rel="noopener"
            className="p-1.5 rounded-md no-underline transition-all hover:bg-white/[0.06]"
            title="Voir profil public">
            <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: "var(--w3)" }} />
          </a>
          <a href={`/m/${p.modelSlug}?edit=true`} target="_blank" rel="noopener"
            className="p-1.5 rounded-md no-underline transition-all hover:bg-white/[0.06]"
            title="Modifier profil">
            <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: "var(--w3)" }} />
          </a>
          <button onClick={() => window.dispatchEvent(new CustomEvent("heaven:toggle-socials"))}
            className="p-1.5 rounded-md transition-all hover:bg-white/[0.06] cursor-pointer border-none bg-transparent"
            title="Liens sociaux">
            <Link2 className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: "var(--w3)" }} />
          </button>
        </div>
      </div>
    </>
  );
}

export default AgenceHeader;
