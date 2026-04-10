"use client";

import { useState, useMemo } from "react";
import {
  Target, TrendingUp, Zap, Users, DollarSign,
  ChevronDown, ChevronUp, RotateCcw, Sparkles,
  Clock, AlertTriangle, Eye, Key, Pencil,
  Image, ShieldCheck, UserX,
} from "lucide-react";
import type { AccessCode, PackConfig, ClientInfo, FeedPost } from "@/types/heaven";
import { isExpired } from "@/lib/timezone";
import { TIER_META, TIER_HEX } from "@/constants/tiers";

/* ── Types ── */

interface SimulatorProps {
  revenue: number;
  activeCodes: AccessCode[];
  modelCodes: AccessCode[];
  packs: PackConfig[];
  clients: ClientInfo[];
  uniqueClients: number;
  retentionRate: number;
  stories: FeedPost[];
  modelSlug: string;
  onSwitchTab: (tab: string) => void;
  onGenerate: () => void;
}

const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/* ══════════════════════════════════════════════ */
/*  Overview Simulator — Dense Kanban Layout       */
/* ══════════════════════════════════════════════ */

export function OverviewSimulator({
  revenue, activeCodes, modelCodes, packs, clients,
  uniqueClients, retentionRate, stories, modelSlug,
  onSwitchTab, onGenerate,
}: SimulatorProps) {
  // ── Current reality data ──
  const activePacks = packs.filter(p => p.active);
  const paidCodes = modelCodes.filter(c => c.type === "paid" && !c.revoked);
  const salesByTier = useMemo(() => {
    const map: Record<string, number> = {};
    activePacks.forEach(p => { map[p.id] = 0; });
    paidCodes.forEach(c => { if (map[c.tier] !== undefined) map[c.tier]++; });
    return map;
  }, [paidCodes, activePacks]);

  const expiringCodes = useMemo(() =>
    modelCodes
      .filter(c => c.active && !c.revoked && c.expiresAt && !isExpired(c.expiresAt))
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
      .slice(0, 6),
    [modelCodes]);

  const avgPerClient = uniqueClients > 0 ? Math.round(revenue / uniqueClients) : 0;

  // ── Extra computed metrics ──
  const verifiedClients = clients.filter(c => c.is_verified).length;
  const pendingClients = clients.filter(c => !c.is_verified && !c.is_blocked).length;
  const bannedClients = clients.filter(c => c.is_blocked).length;
  const totalCodes = modelCodes.length;
  const revokedCodes = modelCodes.filter(c => c.revoked).length;
  const freeCodes = modelCodes.filter(c => c.type !== "paid" && !c.revoked && c.active).length;

  // Revenue by pack
  const revenueByPack = useMemo(() => {
    return activePacks.map(p => ({
      ...p,
      count: salesByTier[p.id] || 0,
      rev: (salesByTier[p.id] || 0) * p.price,
      hex: TIER_HEX[p.id] || p.color || "#888",
    })).sort((a, b) => b.rev - a.rev);
  }, [activePacks, salesByTier]);

  const bestPack = revenueByPack[0];

  // ── Simulator state ──
  const [simMode, setSimMode] = useState(false);
  const [targetRevenue, setTargetRevenue] = useState(() => Math.ceil((revenue || 500) * 1.5 / 100) * 100);
  const [tierWeights, setTierWeights] = useState<Record<string, number>>(() => {
    const w: Record<string, number> = {};
    activePacks.forEach(p => { w[p.id] = 1; });
    return w;
  });

  // ── Simulator calculations ──
  const simulation = useMemo(() => {
    const gap = Math.max(0, targetRevenue - revenue);
    if (gap === 0) return { needed: {}, totalNeeded: 0, gap: 0, recommendations: [] };

    const totalWeight = Object.values(tierWeights).reduce((s, w) => s + w, 0) || 1;
    const needed: Record<string, number> = {};
    let totalNeeded = 0;

    activePacks.forEach(p => {
      const weight = tierWeights[p.id] || 0;
      const share = gap * (weight / totalWeight);
      const count = p.price > 0 ? Math.ceil(share / p.price) : 0;
      needed[p.id] = count;
      totalNeeded += count;
    });

    const recommendations: { text: string; priority: "high" | "medium" | "low" }[] = [];

    const best = activePacks.reduce((b, p) => (p.price > (b?.price || 0) ? p : b), activePacks[0]);
    if (best && needed[best.id] > 0) {
      recommendations.push({ text: `Push ${best.name} (${fmt.format(best.price)}) — ${needed[best.id]} ventes`, priority: "high" });
    }
    if (expiringCodes.length > 0) {
      const renewRev = expiringCodes.reduce((s, c) => s + (packs.find(pk => pk.id === c.tier)?.price || 0), 0);
      recommendations.push({ text: `${expiringCodes.length} expirent — relancer = ${fmt.format(renewRev)}`, priority: "high" });
    }
    if (retentionRate < 70) {
      recommendations.push({ text: `Retention ${retentionRate}% — promo fidelisation`, priority: "medium" });
    }
    if (stories.length < 3) {
      recommendations.push({ text: `${stories.length} stories — publier plus`, priority: "medium" });
    }

    return { needed, totalNeeded, gap, recommendations };
  }, [targetRevenue, revenue, tierWeights, activePacks, expiringCodes, retentionRate, stories, packs]);

  const resetSim = () => {
    setTargetRevenue(Math.ceil((revenue || 500) * 1.5 / 100) * 100);
    const w: Record<string, number> = {};
    activePacks.forEach(p => { w[p.id] = 1; });
    setTierWeights(w);
  };

  const updateWeight = (tierId: string, delta: number) => {
    setTierWeights(prev => ({ ...prev, [tierId]: Math.max(0, Math.min(5, (prev[tierId] || 1) + delta)) }));
  };

  /* ══════════════════════════════════════════════ */
  /*  Render — Dense 3-column kanban                 */
  /* ══════════════════════════════════════════════ */

  const cardStyle = { background: "var(--surface)", border: "1px solid var(--border)" };

  const maxSales = Math.max(...Object.values(salesByTier), 1);

  return (
    <div className="space-y-4">

      {/* ═══ Quick actions ═══ */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { href: `/m/${modelSlug}`, icon: Eye, color: "#E63329", label: "Profil", onClick: undefined as (() => void) | undefined },
          { href: `/m/${modelSlug}?edit=true`, icon: Pencil, color: "#D4AF37", label: "Edit", onClick: undefined },
          { href: undefined as string | undefined, icon: Key, color: "#10B981", label: "Code", onClick: onGenerate },
          { href: undefined, icon: Zap, color: "#8B5CF6", label: "Contenu", onClick: () => onSwitchTab("contenu") },
        ].map((a, i) => {
          const cls = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg no-underline cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]";
          const st = { background: `${a.color}0A`, border: `1px solid ${a.color}18` };
          return a.href ? (
            <a key={`a${i}`} href={a.href} target="_blank" rel="noopener" className={cls} style={st}>
              <a.icon className="w-3.5 h-3.5" style={{ color: a.color }} />
              <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{a.label}</span>
            </a>
          ) : (
            <button key={`a${i}`} onClick={a.onClick} className={`${cls} text-left`} style={st}>
              <a.icon className="w-3.5 h-3.5" style={{ color: a.color }} />
              <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ Single dense block — everything ═══ */}
      <div className="rounded-xl p-4" style={cardStyle}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Overview</span>
            <span className="text-xs ml-3" style={{ color: "var(--text-muted)" }}>
              {paidCodes.length} ventes · {clients.length} clients · {fmt.format(avgPerClient)}/moy
            </span>
          </div>
          <span className="text-lg font-black" style={{ color: "#10B981" }}>{fmt.format(revenue)}</span>
        </div>

        {/* Packs — horizontal bars (compact) + 4 stat columns — all in one row */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr] gap-x-5 gap-y-4">

          {/* Ventes — horizontal bars */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Ventes</span>
            <div className="space-y-2">
              {revenueByPack.map(p => {
                const pct = maxSales > 0 ? (p.count / maxSales) * 100 : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{p.name}</span>
                      <span className="text-xs font-bold" style={{ color: p.hex }}>{p.count} · {fmt.format(p.rev)}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 3)}%`, background: `linear-gradient(90deg, ${p.hex}, ${p.hex}88)` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Codes */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Codes</span>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-xs" style={{ color: "var(--text)" }}>Actifs</span><span className="text-xs font-bold" style={{ color: "#10B981" }}>{activeCodes.length}</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "var(--text)" }}>Payes</span><span className="text-xs font-bold" style={{ color: "#D4AF37" }}>{paidCodes.length}</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "var(--text)" }}>Gratuits</span><span className="text-xs font-bold" style={{ color: "#F59E0B" }}>{freeCodes}</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "var(--text)" }}>Revoques</span><span className="text-xs font-bold" style={{ color: "#EF4444" }}>{revokedCodes}</span></div>
            </div>
          </div>

          {/* Clients */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Clients</span>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-xs" style={{ color: "var(--text)" }}>Verifies</span><span className="text-xs font-bold" style={{ color: "#10B981" }}>{verifiedClients}</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "var(--text)" }}>En attente</span><span className="text-xs font-bold" style={{ color: "#F59E0B" }}>{pendingClients}</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "var(--text)" }}>Bannis</span><span className="text-xs font-bold" style={{ color: "#EF4444" }}>{bannedClients}</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "var(--text)" }}>Retention</span><span className="text-xs font-bold" style={{ color: "#8B5CF6" }}>{retentionRate}%</span></div>
            </div>
          </div>

          {/* Contenu + Expirations */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Activite</span>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-xs" style={{ color: "var(--text)" }}>Stories</span><span className="text-xs font-bold" style={{ color: "#8B5CF6" }}>{stories.length}</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "var(--text)" }}>Uniques</span><span className="text-xs font-bold" style={{ color: "var(--text)" }}>{uniqueClients}</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "var(--text)" }}>Abonnes</span><span className="text-xs font-bold" style={{ color: "#D4AF37" }}>{activeCodes.length}</span></div>
              {expiringCodes.length > 0 && (
                <div className="flex justify-between"><span className="text-xs" style={{ color: "var(--text)" }}>Expirent</span><span className="text-xs font-bold" style={{ color: "#F59E0B" }}>{expiringCodes.length}</span></div>
              )}
            </div>
          </div>
        </div>

        {/* Expiring list — inline under the grid if any */}
        {expiringCodes.length > 0 && (
          <div className="mt-3 pt-3 flex flex-wrap gap-2" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="text-xs font-semibold shrink-0" style={{ color: "#F59E0B" }}>A renouveler :</span>
            {expiringCodes.map(code => {
              const cl = clients.find(c => c.pseudo_snap === code.client || c.pseudo_insta === code.client || c.nickname === code.client);
              const name = cl?.pseudo_snap || cl?.pseudo_insta || code.client;
              const timeLeft = new Date(code.expiresAt).getTime() - Date.now();
              const h = Math.floor(timeLeft / 3_600_000);
              const d = Math.floor(timeLeft / 86_400_000);
              const urgency = h < 24 ? "#F87171" : h < 72 ? "#FBBF24" : "#10B981";
              return (
                <span key={code.code} className="text-xs">
                  <span style={{ color: "var(--text)" }}>@{name}</span>{" "}
                  <span className="font-bold" style={{ color: urgency }}>{d > 0 ? `${d}j` : `${h}h`}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Simulator toggle ═══ */}
      <button onClick={() => setSimMode(!simMode)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: simMode ? "rgba(212,175,55,0.08)" : "var(--surface)",
          border: `1px solid ${simMode ? "rgba(212,175,55,0.25)" : "var(--border)"}`,
        }}>
        <Target className="w-3.5 h-3.5" style={{ color: simMode ? "#D4AF37" : "var(--text-muted)" }} />
        <span className="text-[11px] font-bold" style={{ color: simMode ? "#D4AF37" : "var(--text)" }}>
          {simMode ? "Fermer simulateur" : "Simulateur d'objectifs"}
        </span>
        {simMode ? <ChevronUp className="w-3 h-3" style={{ color: "#D4AF37" }} /> : <ChevronDown className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
      </button>

      {simMode && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.15)" }}>

          {/* Target revenue slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Objectif mensuel</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black" style={{ color: "#D4AF37" }}>{fmt.format(targetRevenue)}</span>
                <button onClick={resetSim} className="p-1 rounded cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }} title="Reset">
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
            <input type="range"
              min={100} max={Math.max(5000, revenue * 3)} step={50}
              value={targetRevenue}
              onChange={e => setTargetRevenue(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, #D4AF37 ${((targetRevenue - 100) / (Math.max(5000, revenue * 3) - 100)) * 100}%, var(--border) ${((targetRevenue - 100) / (Math.max(5000, revenue * 3) - 100)) * 100}%)` }}
            />
          </div>

          {/* Gap indicator */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: targetRevenue <= revenue ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.06)" }}>
            {targetRevenue <= revenue ? (
              <>
                <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: "#10B981" }} />
                <span className="text-[11px] font-bold" style={{ color: "#10B981" }}>Objectif atteint ! +{fmt.format(revenue - targetRevenue)}</span>
              </>
            ) : (
              <>
                <Target className="w-3.5 h-3.5 shrink-0" style={{ color: "#F59E0B" }} />
                <span className="text-[11px] font-bold" style={{ color: "#F59E0B" }}>Il manque {fmt.format(simulation.gap)}</span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>~{simulation.totalNeeded} ventes</span>
              </>
            )}
          </div>

          {/* Calibrator + Recommendations — 2 cols */}
          {targetRevenue > revenue && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>
                  Calibrage
                </span>
                <div className="space-y-1">
                  {activePacks.map(p => {
                    const weight = tierWeights[p.id] || 0;
                    const needed = simulation.needed[p.id] || 0;
                    const hex = TIER_HEX[p.id] || p.color || "#888";
                    return (
                      <div key={p.id} className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: hex }} />
                        <span className="text-[10px] font-bold w-12 truncate shrink-0" style={{ color: "var(--text)" }}>{p.name}</span>
                        <div className="flex items-center gap-px ml-auto">
                          <button onClick={() => updateWeight(p.id, -1)}
                            className="w-4 h-4 rounded flex items-center justify-center cursor-pointer text-[10px] font-bold"
                            style={{ background: "rgba(255,255,255,0.04)", border: "none", color: "var(--text-muted)" }}>-</button>
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="w-1.5 h-3 rounded-sm" style={{ background: i <= weight ? hex : "rgba(255,255,255,0.06)" }} />
                          ))}
                          <button onClick={() => updateWeight(p.id, 1)}
                            className="w-4 h-4 rounded flex items-center justify-center cursor-pointer text-[10px] font-bold"
                            style={{ background: "rgba(255,255,255,0.04)", border: "none", color: "var(--text-muted)" }}>+</button>
                        </div>
                        <span className="text-[10px] font-black w-6 text-right shrink-0" style={{ color: hex }}>{needed}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {simulation.recommendations.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap className="w-3 h-3" style={{ color: "#D4AF37" }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#D4AF37" }}>Actions</span>
                  </div>
                  <div className="space-y-1">
                    {simulation.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-1.5 px-2 py-1.5 rounded"
                        style={{ background: rec.priority === "high" ? "rgba(230,51,41,0.04)" : "rgba(255,255,255,0.02)" }}>
                        <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{
                          background: rec.priority === "high" ? "#E63329" : rec.priority === "medium" ? "#F59E0B" : "var(--text-muted)",
                        }} />
                        <span className="text-[10px] leading-snug" style={{ color: "var(--text)" }}>{rec.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
