"use client";

import { useState, useMemo } from "react";
import {
  Target, TrendingUp, Zap, Users, DollarSign,
  ChevronDown, ChevronUp, RotateCcw, Sparkles,
  Clock, AlertTriangle, Eye, Key, Pencil,
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
/*  Overview Simulator — Real + Hypothetical       */
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
      .slice(0, 10),
    [modelCodes]);

  const avgPerClient = uniqueClients > 0 ? Math.round(revenue / uniqueClients) : 0;

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

    // Weight-based distribution: how many of each pack to sell
    const totalWeight = Object.values(tierWeights).reduce((s, w) => s + w, 0) || 1;
    const needed: Record<string, number> = {};
    let totalNeeded = 0;
    let allocatedRevenue = 0;

    // First pass: distribute by weight
    activePacks.forEach(p => {
      const weight = tierWeights[p.id] || 0;
      const share = gap * (weight / totalWeight);
      const count = p.price > 0 ? Math.ceil(share / p.price) : 0;
      needed[p.id] = count;
      totalNeeded += count;
      allocatedRevenue += count * p.price;
    });

    // Recommendations based on analysis
    const recommendations: { text: string; priority: "high" | "medium" | "low"; action?: string }[] = [];

    // Most profitable pack
    const bestPack = activePacks.reduce((best, p) => (p.price > (best?.price || 0) ? p : best), activePacks[0]);
    if (bestPack && needed[bestPack.id] > 0) {
      recommendations.push({
        text: `Push ${bestPack.name} (${fmt.format(bestPack.price)}) — ${needed[bestPack.id]} ventes = ${fmt.format(needed[bestPack.id] * bestPack.price)}`,
        priority: "high",
        action: "promo_story",
      });
    }

    // Expiring soon = renewal opportunity
    if (expiringCodes.length > 0) {
      const renewalRevenue = expiringCodes.reduce((s, c) => {
        const p = packs.find(pk => pk.id === c.tier);
        return s + (p?.price || 0);
      }, 0);
      recommendations.push({
        text: `${expiringCodes.length} abonnes expirent bientot — relancer = ${fmt.format(renewalRevenue)} potentiel`,
        priority: "high",
        action: "renewal",
      });
    }

    // Low retention
    if (retentionRate < 70) {
      recommendations.push({
        text: `Retention ${retentionRate}% — promo renouvellement ou story exclusive pour fideliser`,
        priority: "medium",
        action: "retention",
      });
    }

    // Content gap
    if (stories.length < 3) {
      recommendations.push({
        text: `Seulement ${stories.length} stories — publier du contenu exclusif pour attirer de nouveaux abonnes`,
        priority: "medium",
        action: "content",
      });
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
  /*  Render                                        */
  /* ══════════════════════════════════════════════ */

  return (
    <div className="space-y-4">

      {/* ═══ SECTION 1: Current Reality — Big KPIs ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl p-3" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3 h-3" style={{ color: "#10B981" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Revenus</span>
          </div>
          <div className="text-lg font-black" style={{ color: "#10B981" }}>{fmt.format(revenue)}</div>
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>ce mois</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3 h-3" style={{ color: "#D4AF37" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Abonnes</span>
          </div>
          <div className="text-lg font-black" style={{ color: "#D4AF37" }}>{activeCodes.length}</div>
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{uniqueClients} clients uniques</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3 h-3" style={{ color: "#8B5CF6" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Retention</span>
          </div>
          <div className="text-lg font-black" style={{ color: "#8B5CF6" }}>{retentionRate}%</div>
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>moy. {fmt.format(avgPerClient)}/client</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3 h-3" style={{ color: "#F59E0B" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Expirent</span>
          </div>
          <div className="text-lg font-black" style={{ color: "#F59E0B" }}>{expiringCodes.length}</div>
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>a renouveler</div>
        </div>
      </div>

      {/* ═══ SECTION 2: Sales by Pack — Real Distribution ═══ */}
      <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Ventes par pack</span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{paidCodes.length} ventes totales</span>
        </div>
        <div className="space-y-2">
          {activePacks.map(p => {
            const count = salesByTier[p.id] || 0;
            const tierRev = count * p.price;
            const maxCount = Math.max(...Object.values(salesByTier), 1);
            const pct = (count / maxCount) * 100;
            const hex = TIER_HEX[p.id] || p.color || "#888";
            return (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-20 shrink-0 flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: hex }} />
                  <span className="text-[11px] font-bold truncate" style={{ color: "var(--text)" }}>{p.name}</span>
                </div>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: hex }} />
                </div>
                <span className="text-[11px] font-bold w-8 text-right shrink-0" style={{ color: hex }}>{count}</span>
                <span className="text-[10px] w-14 text-right shrink-0" style={{ color: "var(--text-muted)" }}>{fmt.format(tierRev)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ SECTION 3: Simulator Toggle ═══ */}
      <button onClick={() => setSimMode(!simMode)}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: simMode ? "rgba(212,175,55,0.08)" : "var(--surface)",
          border: `1px solid ${simMode ? "rgba(212,175,55,0.25)" : "var(--border)"}`,
        }}>
        <Target className="w-4 h-4" style={{ color: simMode ? "#D4AF37" : "var(--text-muted)" }} />
        <span className="text-xs font-bold flex-1 text-left" style={{ color: simMode ? "#D4AF37" : "var(--text)" }}>
          Simulateur d'objectifs
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {simMode ? "Fermer" : "Definir un objectif"}
        </span>
        {simMode ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "#D4AF37" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
      </button>

      {/* ═══ SECTION 4: Simulator Panel ═══ */}
      {simMode && (
        <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.15)" }}>

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
            <div className="flex justify-between mt-1">
              <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{fmt.format(100)}</span>
              <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{fmt.format(Math.max(5000, revenue * 3))}</span>
            </div>
          </div>

          {/* Gap indicator */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: targetRevenue <= revenue ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.06)" }}>
            {targetRevenue <= revenue ? (
              <>
                <Sparkles className="w-4 h-4 shrink-0" style={{ color: "#10B981" }} />
                <span className="text-[11px] font-bold" style={{ color: "#10B981" }}>Objectif atteint ! +{fmt.format(revenue - targetRevenue)} au-dessus</span>
              </>
            ) : (
              <>
                <Target className="w-4 h-4 shrink-0" style={{ color: "#F59E0B" }} />
                <span className="text-[11px] font-bold" style={{ color: "#F59E0B" }}>Il manque {fmt.format(simulation.gap)}</span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>soit ~{simulation.totalNeeded} ventes</span>
              </>
            )}
          </div>

          {/* Pack weight calibrator */}
          {targetRevenue > revenue && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>
                Calibrage des ventes par pack
              </span>
              <div className="space-y-1.5">
                {activePacks.map(p => {
                  const weight = tierWeights[p.id] || 0;
                  const needed = simulation.needed[p.id] || 0;
                  const hex = TIER_HEX[p.id] || p.color || "#888";
                  const meta = TIER_META[p.id];
                  return (
                    <div key={p.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: hex }} />
                      <span className="text-[11px] font-bold w-16 truncate shrink-0" style={{ color: "var(--text)" }}>{p.name}</span>
                      <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>{fmt.format(p.price)}</span>
                      {/* Weight adjuster */}
                      <div className="flex items-center gap-0.5 ml-auto">
                        <button onClick={() => updateWeight(p.id, -1)}
                          className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-[11px] font-bold"
                          style={{ background: "rgba(255,255,255,0.04)", border: "none", color: "var(--text-muted)" }}>-</button>
                        <div className="flex items-center gap-px">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="w-2 h-4 rounded-sm" style={{ background: i <= weight ? hex : "rgba(255,255,255,0.06)" }} />
                          ))}
                        </div>
                        <button onClick={() => updateWeight(p.id, 1)}
                          className="w-5 h-5 rounded flex items-center justify-center cursor-pointer text-[11px] font-bold"
                          style={{ background: "rgba(255,255,255,0.04)", border: "none", color: "var(--text-muted)" }}>+</button>
                      </div>
                      {/* Needed count */}
                      <div className="text-right shrink-0 w-14">
                        <span className="text-[11px] font-black" style={{ color: hex }}>{needed}</span>
                        <span className="text-[10px] ml-0.5" style={{ color: "var(--text-muted)" }}>ventes</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {simulation.recommendations.length > 0 && targetRevenue > revenue && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3 h-3" style={{ color: "#D4AF37" }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#D4AF37" }}>Actions recommandees</span>
              </div>
              <div className="space-y-1.5">
                {simulation.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 px-2.5 py-2 rounded-lg"
                    style={{ background: rec.priority === "high" ? "rgba(230,51,41,0.04)" : "rgba(255,255,255,0.02)" }}>
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{
                      background: rec.priority === "high" ? "#E63329" : rec.priority === "medium" ? "#F59E0B" : "var(--text-muted)",
                    }} />
                    <span className="text-[11px] leading-snug" style={{ color: "var(--text)" }}>{rec.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ SECTION 5: Quick Actions ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <a href={`/m/${modelSlug}`} target="_blank" rel="noopener"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl no-underline transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "rgba(230,51,41,0.06)", border: "1px solid rgba(230,51,41,0.12)" }}>
          <Eye className="w-3.5 h-3.5" style={{ color: "#E63329" }} />
          <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Profil</span>
        </a>
        <a href={`/m/${modelSlug}?edit=true`} target="_blank" rel="noopener"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl no-underline transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)" }}>
          <Pencil className="w-3.5 h-3.5" style={{ color: "#D4AF37" }} />
          <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Modifier</span>
        </a>
        <button onClick={onGenerate}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
          <Key className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
          <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Code</span>
        </button>
        <button onClick={() => onSwitchTab("contenu")}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
          style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
          <Zap className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
          <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Contenu</span>
        </button>
      </div>

      {/* ═══ SECTION 6: Expiring Subscriptions ═══ */}
      {expiringCodes.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
            <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Abonnements a renouveler</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>{expiringCodes.length}</span>
          </div>
          <div className="space-y-1">
            {expiringCodes.map(code => {
              const client = clients.find(cl => cl.pseudo_snap === code.client || cl.pseudo_insta === code.client || cl.nickname === code.client);
              const name = client?.pseudo_snap || client?.pseudo_insta || code.client;
              const pack = packs.find(p => p.id === code.tier);
              const hex = TIER_HEX[code.tier] || pack?.color || "#888";
              const timeLeft = new Date(code.expiresAt).getTime() - Date.now();
              const hoursLeft = Math.floor(timeLeft / 3_600_000);
              const daysLeft = Math.floor(timeLeft / 86_400_000);
              const urgency = hoursLeft < 24 ? "#F87171" : hoursLeft < 72 ? "#FBBF24" : "#10B981";
              const timeStr = daysLeft > 0 ? `${daysLeft}j` : `${hoursLeft}h`;

              return (
                <div key={code.code} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.02]">
                  <span className="text-[11px] font-bold truncate flex-1" style={{ color: "var(--text)" }}>@{name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: `${hex}15`, color: hex }}>
                    {pack?.name || code.tier}
                  </span>
                  <span className="text-[10px] font-bold shrink-0" style={{ color: urgency }}>{timeStr}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
