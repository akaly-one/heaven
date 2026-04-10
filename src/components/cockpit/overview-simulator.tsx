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

      {/* ═══ SECTION 1: Current Reality — Compact KPIs ═══ */}
      <div className="flex flex-wrap gap-2">
        {[
          { icon: DollarSign, color: "#10B981", label: "Revenus", value: fmt.format(revenue), sub: "ce mois" },
          { icon: Users, color: "#D4AF37", label: "Abonnes", value: String(activeCodes.length), sub: `${uniqueClients} uniques` },
          { icon: TrendingUp, color: "#8B5CF6", label: "Retention", value: `${retentionRate}%`, sub: `${fmt.format(avgPerClient)}/client` },
          { icon: AlertTriangle, color: "#F59E0B", label: "Expirent", value: String(expiringCodes.length), sub: "a renouveler" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-lg px-3 py-2 flex items-center gap-2.5 min-w-0"
            style={{ background: `${kpi.color}08`, border: `1px solid ${kpi.color}1A` }}>
            <kpi.icon className="w-3.5 h-3.5 shrink-0" style={{ color: kpi.color }} />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-black leading-none" style={{ color: kpi.color }}>{kpi.value}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{kpi.label}</span>
              </div>
              <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ SECTION 2+6: Sales by Pack + Expiring — Kanban ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Sales by pack */}
        <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Ventes par pack</span>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{paidCodes.length} total</span>
          </div>
          <div className="space-y-2">
            {activePacks.map(p => {
              const count = salesByTier[p.id] || 0;
              const tierRev = count * p.price;
              const maxCount = Math.max(...Object.values(salesByTier), 1);
              const pct = (count / maxCount) * 100;
              const hex = TIER_HEX[p.id] || p.color || "#888";
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="w-16 shrink-0 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: hex }} />
                    <span className="text-[11px] font-bold truncate" style={{ color: "var(--text)" }}>{p.name}</span>
                  </div>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: hex }} />
                  </div>
                  <span className="text-[11px] font-bold w-6 text-right shrink-0" style={{ color: hex }}>{count}</span>
                  <span className="text-[10px] w-12 text-right shrink-0" style={{ color: "var(--text-muted)" }}>{fmt.format(tierRev)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expiring subscriptions */}
        {expiringCodes.length > 0 ? (
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
              <span className="text-xs font-bold" style={{ color: "var(--text)" }}>A renouveler</span>
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
                  <div key={code.code} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.02]">
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
        ) : (
          <div className="rounded-xl p-4 flex items-center justify-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Aucun abonnement a renouveler</span>
          </div>
        )}
      </div>

      {/* ═══ SECTION 3: Simulator Toggle ═══ */}
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

          {/* Calibrator + Recommendations — Kanban */}
          {targetRevenue > revenue && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Pack weight calibrator */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>
                  Calibrage par pack
                </span>
                <div className="space-y-1.5">
                  {activePacks.map(p => {
                    const weight = tierWeights[p.id] || 0;
                    const needed = simulation.needed[p.id] || 0;
                    const hex = TIER_HEX[p.id] || p.color || "#888";
                    return (
                      <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: hex }} />
                        <span className="text-[11px] font-bold w-14 truncate shrink-0" style={{ color: "var(--text)" }}>{p.name}</span>
                        <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>{fmt.format(p.price)}</span>
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
                        <div className="text-right shrink-0 w-12">
                          <span className="text-[11px] font-black" style={{ color: hex }}>{needed}</span>
                          <span className="text-[10px] ml-0.5" style={{ color: "var(--text-muted)" }}>v.</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommendations */}
              {simulation.recommendations.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap className="w-3 h-3" style={{ color: "#D4AF37" }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#D4AF37" }}>Actions</span>
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
        </div>
      )}

      {/* ═══ SECTION 5: Quick Actions — Compact ═══ */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { href: `/m/${modelSlug}`, icon: Eye, label: "Profil", color: "#E63329", onClick: undefined as (() => void) | undefined },
          { href: `/m/${modelSlug}?edit=true`, icon: Pencil, label: "Modifier", color: "#D4AF37", onClick: undefined },
          { href: undefined as string | undefined, icon: Key, label: "Code", color: "#10B981", onClick: onGenerate },
          { href: undefined, icon: Zap, label: "Contenu", color: "#8B5CF6", onClick: () => onSwitchTab("contenu") },
        ].map((act, i) => {
          const cls = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] no-underline cursor-pointer";
          const st = { background: `${act.color}0A`, border: `1px solid ${act.color}1A` };
          return act.href ? (
            <a key={i} href={act.href} target="_blank" rel="noopener" className={cls} style={st}>
              <act.icon className="w-3 h-3" style={{ color: act.color }} />
              <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{act.label}</span>
            </a>
          ) : (
            <button key={i} onClick={act.onClick} className={`${cls} text-left`} style={st}>
              <act.icon className="w-3 h-3" style={{ color: act.color }} />
              <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{act.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
