"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Target, Check, ChevronRight, DollarSign, TrendingUp,
  Camera, Eye, Lock, Unlock, Zap, Users, Star,
  BarChart3, Circle, CheckCircle, Flame, Crown, Shield,
  Sparkles, Play, MessageSquare, Video, Heart, Bot,
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { AutomationContent } from "@/components/automation-content";

// ══════════════════════════════════════════════
//  MARKET DATA — Prix moyens du marche (EUR)
// ══════════════════════════════════════════════

// Niveau d'experience
type ExperienceLevel = "debutante" | "moyenne" | "pro" | "experte";

const EXPERIENCE_LEVELS: { id: ExperienceLevel; label: string; icon: typeof Star; color: string; subsRange: string; desc: string }[] = [
  { id: "debutante", label: "Debutante", icon: Star, color: "#60A5FA", subsRange: "0-100", desc: "Premier mois, construction d'audience" },
  { id: "moyenne", label: "Moyenne", icon: Flame, color: "#F59E0B", subsRange: "100-500", desc: "Audience etablie, revenus reguliers" },
  { id: "pro", label: "Pro", icon: Crown, color: "#7C3AED", subsRange: "500-2000", desc: "Grande audience, multi-plateformes" },
  { id: "experte", label: "Experte", icon: Sparkles, color: "#F43F5E", subsRange: "2000+", desc: "Top creatrices, revenus massifs" },
];

// Niveaux de contenu 0-4
interface ContentLevel {
  id: number;
  label: string;
  desc: string;
  color: string;
  tierLabel: string;
  icon: typeof Eye;
  // Prix moyens du marche par canal de vente, par experience
  marketPrices: Record<ExperienceLevel, { ppv: number; abo: number; story: number; caming: number }>;
}

const CONTENT_LEVELS: ContentLevel[] = [
  {
    id: 0, label: "Soft Public", desc: "Lifestyle, selfies SFW, teasings legers", color: "#64748B",
    tierLabel: "Public", icon: Eye,
    marketPrices: {
      debutante: { ppv: 0, abo: 0, story: 0, caming: 0 },
      moyenne: { ppv: 0, abo: 0, story: 0, caming: 0 },
      pro: { ppv: 0, abo: 0, story: 0, caming: 0 },
      experte: { ppv: 0, abo: 0, story: 0, caming: 0 },
    },
  },
  {
    id: 1, label: "Charme Followers", desc: "Lingerie, sous-vetements, poses charme", color: "#F43F5E",
    tierLabel: "VIP", icon: Heart,
    marketPrices: {
      debutante: { ppv: 5, abo: 5, story: 3, caming: 15 },
      moyenne: { ppv: 8, abo: 10, story: 5, caming: 25 },
      pro: { ppv: 12, abo: 15, story: 8, caming: 40 },
      experte: { ppv: 20, abo: 25, story: 12, caming: 60 },
    },
  },
  {
    id: 2, label: "Sensuel", desc: "Sexy, provocant, poses suggestives", color: "#F59E0B",
    tierLabel: "Gold", icon: Flame,
    marketPrices: {
      debutante: { ppv: 8, abo: 10, story: 5, caming: 25 },
      moyenne: { ppv: 15, abo: 15, story: 8, caming: 40 },
      pro: { ppv: 25, abo: 25, story: 15, caming: 60 },
      experte: { ppv: 40, abo: 40, story: 25, caming: 100 },
    },
  },
  {
    id: 3, label: "Nudes sans visage", desc: "Nudes, sextapes — sans visage", color: "#7C3AED",
    tierLabel: "Diamond", icon: Lock,
    marketPrices: {
      debutante: { ppv: 15, abo: 15, story: 8, caming: 40 },
      moyenne: { ppv: 25, abo: 25, story: 15, caming: 60 },
      pro: { ppv: 40, abo: 40, story: 25, caming: 100 },
      experte: { ppv: 60, abo: 60, story: 40, caming: 150 },
    },
  },
  {
    id: 4, label: "Nudes avec visage", desc: "Nudes, sextapes avec visage — Platinum", color: "#A78BFA",
    tierLabel: "Platinum", icon: Crown,
    marketPrices: {
      debutante: { ppv: 25, abo: 25, story: 15, caming: 60 },
      moyenne: { ppv: 40, abo: 40, story: 25, caming: 100 },
      pro: { ppv: 60, abo: 60, story: 40, caming: 150 },
      experte: { ppv: 100, abo: 100, story: 60, caming: 250 },
    },
  },
];

// Canaux de vente
type SalesChannel = "ppv" | "abo" | "story" | "caming";
const CHANNELS: { id: SalesChannel; label: string; desc: string; icon: typeof Play; color: string }[] = [
  { id: "ppv", label: "PPV (Pay Per View)", desc: "Contenu vendu a l'unite via messages", icon: Play, color: "#E040FB" },
  { id: "abo", label: "Abonnement", desc: "Acces mensuel recurrent", icon: Users, color: "#10B981" },
  { id: "story", label: "Story privee", desc: "Contenu ephemere exclusif", icon: MessageSquare, color: "#F59E0B" },
  { id: "caming", label: "Caming / Live", desc: "Sessions live avec pourboires", icon: Video, color: "#F43F5E" },
];

// Pipeline steps — dynamiques selon les choix
interface PipelineStep {
  id: string;
  label: string;
  desc: string;
  category: "setup" | "content" | "sales" | "growth";
  requiresLevel?: number; // Minimum content level needed
  requiresChannel?: SalesChannel;
}

const PIPELINE_STEPS: PipelineStep[] = [
  // Setup
  { id: "choose-platforms", label: "Choisir ses plateformes", desc: "Fanvue, OF, MYM, Snap, Insta", category: "setup" },
  { id: "create-profiles", label: "Creer les profils", desc: "Bio, avatar, banner, liens", category: "setup" },
  { id: "set-prices", label: "Definir ses prix", desc: "Abonnements, PPV, pourboires", category: "setup" },
  { id: "payment-setup", label: "Configurer les paiements", desc: "Stripe, Wise, paiements integres", category: "setup" },
  // Content
  { id: "first-shoot", label: "Premier shooting", desc: "10-20 photos de base", category: "content" },
  { id: "content-calendar", label: "Calendrier de contenu", desc: "Planifier posts hebdomadaires", category: "content" },
  { id: "soft-content", label: "Publier contenu Soft (N0)", desc: "Teasings, lifestyle, selfies SFW", category: "content", requiresLevel: 0 },
  { id: "charme-content", label: "Publier contenu Charme (N1)", desc: "Lingerie, poses charme pour VIP", category: "content", requiresLevel: 1 },
  { id: "sensuel-content", label: "Publier contenu Sensuel (N2)", desc: "Provocant, suggestif pour Gold", category: "content", requiresLevel: 2 },
  { id: "nude-nf-content", label: "Publier Nudes sans visage (N3)", desc: "Nudes, sextapes anonymes pour Diamond", category: "content", requiresLevel: 3 },
  { id: "nude-face-content", label: "Publier Nudes avec visage (N4)", desc: "Contenu complet pour Platinum", category: "content", requiresLevel: 4 },
  // Sales
  { id: "ppv-setup", label: "Configurer les PPV", desc: "Preparer messages PPV automatiques", category: "sales", requiresChannel: "ppv" },
  { id: "sub-launch", label: "Lancer les abonnements", desc: "Page abonnes + prix mensuel", category: "sales", requiresChannel: "abo" },
  { id: "story-routine", label: "Routine stories privees", desc: "Stories exclusives quotidiennes", category: "sales", requiresChannel: "story" },
  { id: "live-schedule", label: "Planning lives/caming", desc: "Horaires fixes, materiel pret", category: "sales", requiresChannel: "caming" },
  { id: "first-sales", label: "Premieres ventes", desc: "Obtenir les 10 premiers clients payants", category: "sales" },
  // Growth
  { id: "promo-social", label: "Promotion sur reseaux", desc: "Reels, stories, cross-promo", category: "growth" },
  { id: "engage-fans", label: "Engager la communaute", desc: "Repondre DMs, commentaires, fidiliser", category: "growth" },
  { id: "analyze-metrics", label: "Analyser les metriques", desc: "Revenus, conversion, retention", category: "growth" },
  { id: "scale-content", label: "Scaler la production", desc: "Plus de contenu, nouveaux niveaux", category: "growth" },
  { id: "ads-launch", label: "Lancer la publicite", desc: "Instagram Ads, Snap Ads, TikTok", category: "growth" },
];

const CATEGORY_META: Record<string, { label: string; color: string; icon: typeof Target }> = {
  setup: { label: "Mise en place", color: "#60A5FA", icon: Shield },
  content: { label: "Contenu", color: "#F59E0B", icon: Camera },
  sales: { label: "Ventes", color: "#10B981", icon: DollarSign },
  growth: { label: "Croissance", color: "#E040FB", icon: TrendingUp },
};

// ── State persistence ──
const STORAGE_KEY = "heaven_strategy_v2";

interface StrategyState {
  experience: ExperienceLevel;
  monthlyGoal: number;
  activeLevels: number[]; // Content levels activated (0-4)
  activeChannels: SalesChannel[];
  completedSteps: string[];
  contentVolume: Record<number, number>; // level → posts per month
  updatedAt: string;
}

function defaultState(): StrategyState {
  return {
    experience: "debutante",
    monthlyGoal: 1000,
    activeLevels: [0, 1],
    activeChannels: ["ppv", "abo"],
    completedSteps: [],
    contentVolume: { 0: 20, 1: 10, 2: 0, 3: 0, 4: 0 },
    updatedAt: new Date().toISOString(),
  };
}

function loadState(): StrategyState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultState();
}

function saveState(s: StrategyState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, updatedAt: new Date().toISOString() }));
}

// ══════════ COMPONENT ══════════

export default function StrategiePage() {
  const { auth, currentModel } = useModel();
  const [state, setState] = useState<StrategyState>(loadState);
  const [tab, setTab] = useState<"objectif" | "contenu" | "pipeline" | "projections" | "automation">("objectif");

  // Auto-save
  useEffect(() => { saveState(state); }, [state]);

  const set = useCallback(<K extends keyof StrategyState>(key: K, val: StrategyState[K]) => {
    setState(prev => ({ ...prev, [key]: val }));
  }, []);

  const toggleLevel = useCallback((lvl: number) => {
    setState(prev => {
      const has = prev.activeLevels.includes(lvl);
      // Always include levels below the one being activated
      if (!has) {
        const newLevels = [...new Set([...prev.activeLevels, ...Array.from({ length: lvl + 1 }, (_, i) => i)])];
        const newVolume = { ...prev.contentVolume };
        for (const l of newLevels) { if (!newVolume[l]) newVolume[l] = l === 0 ? 20 : 8; }
        return { ...prev, activeLevels: newLevels.sort(), contentVolume: newVolume };
      }
      // Deactivating — also remove higher levels
      const newLevels = prev.activeLevels.filter(l => l < lvl);
      return { ...prev, activeLevels: newLevels };
    });
  }, []);

  const toggleChannel = useCallback((ch: SalesChannel) => {
    setState(prev => ({
      ...prev,
      activeChannels: prev.activeChannels.includes(ch)
        ? prev.activeChannels.filter(c => c !== ch)
        : [...prev.activeChannels, ch],
    }));
  }, []);

  const toggleStep = useCallback((stepId: string) => {
    setState(prev => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(stepId)
        ? prev.completedSteps.filter(s => s !== stepId)
        : [...prev.completedSteps, stepId],
    }));
  }, []);

  const setVolume = useCallback((lvl: number, vol: number) => {
    setState(prev => ({ ...prev, contentVolume: { ...prev.contentVolume, [lvl]: vol } }));
  }, []);

  // ── Computed: revenue projections ──
  const maxActiveLevel = useMemo(() => Math.max(...state.activeLevels, 0), [state.activeLevels]);

  const revenueByLevel = useMemo(() => {
    return state.activeLevels.filter(l => l > 0).map(lvl => {
      const level = CONTENT_LEVELS[lvl];
      const prices = level.marketPrices[state.experience];
      const volume = state.contentVolume[lvl] || 0;

      // Revenue per channel
      const channelRevenue = state.activeChannels.reduce((sum, ch) => {
        return sum + prices[ch] * volume;
      }, 0);

      return { level: lvl, label: level.label, color: level.color, volume, channelRevenue };
    });
  }, [state.activeLevels, state.activeChannels, state.experience, state.contentVolume]);

  const totalProjectedRevenue = useMemo(() => revenueByLevel.reduce((s, r) => s + r.channelRevenue, 0), [revenueByLevel]);
  const goalProgress = useMemo(() => Math.min((totalProjectedRevenue / Math.max(state.monthlyGoal, 1)) * 100, 100), [totalProjectedRevenue, state.monthlyGoal]);
  const goalReached = totalProjectedRevenue >= state.monthlyGoal;

  // Pipeline: filter visible steps based on active levels and channels
  const visibleSteps = useMemo(() => {
    return PIPELINE_STEPS.filter(step => {
      if (step.requiresLevel !== undefined && !state.activeLevels.includes(step.requiresLevel)) return false;
      if (step.requiresChannel && !state.activeChannels.includes(step.requiresChannel)) return false;
      return true;
    });
  }, [state.activeLevels, state.activeChannels]);

  const pipelineProgress = useMemo(() => {
    if (visibleSteps.length === 0) return 0;
    return Math.round((state.completedSteps.filter(s => visibleSteps.some(vs => vs.id === s)).length / visibleSteps.length) * 100);
  }, [visibleSteps, state.completedSteps]);

  // ── Best price recommendation ──
  const recommendedPrices = useMemo(() => {
    return CONTENT_LEVELS.filter(l => state.activeLevels.includes(l.id) && l.id > 0).map(level => {
      const prices = level.marketPrices[state.experience];
      const bestChannel = state.activeChannels.reduce<{ ch: SalesChannel; price: number } | null>((best, ch) => {
        const p = prices[ch];
        if (!best || p > best.price) return { ch, price: p };
        return best;
      }, null);
      return { level, bestChannel };
    });
  }, [state.activeLevels, state.activeChannels, state.experience]);

  const expMeta = EXPERIENCE_LEVELS.find(e => e.id === state.experience)!;

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-28 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3 fade-up">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #E040FB, #7C3AED)", boxShadow: "0 0 20px rgba(224,64,251,0.2)" }}>
              <Target className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Strategie</h1>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Pipeline · Objectifs · Projections · Niveaux {maxActiveLevel}/4
              </p>
            </div>
            {/* Goal badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: goalReached ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                border: `1px solid ${goalReached ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
              }}>
              <DollarSign className="w-3.5 h-3.5" style={{ color: goalReached ? "#10B981" : "#F59E0B" }} />
              <span className="text-[11px] font-bold" style={{ color: goalReached ? "#10B981" : "#F59E0B" }}>
                {totalProjectedRevenue.toLocaleString()}€ / {state.monthlyGoal.toLocaleString()}€
              </span>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 fade-up">
            {[
              { label: "Objectif", value: `${state.monthlyGoal.toLocaleString()}€`, color: "#F59E0B", icon: Target },
              { label: "Projete", value: `${totalProjectedRevenue.toLocaleString()}€`, color: goalReached ? "#10B981" : "#EF4444", icon: DollarSign },
              { label: "Pipeline", value: `${pipelineProgress}%`, color: pipelineProgress === 100 ? "#10B981" : "#60A5FA", icon: BarChart3 },
              { label: "Niveau max", value: `N${maxActiveLevel}`, color: CONTENT_LEVELS[maxActiveLevel].color, icon: Flame },
            ].map(card => (
              <div key={card.label} className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <card.icon className="w-3 h-3" style={{ color: card.color }} />
                  <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{card.label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: card.color }}>{card.value}</span>
              </div>
            ))}
          </div>

          {/* Goal progress bar */}
          <div className="rounded-xl p-3 fade-up" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>Progression vers l'objectif</span>
              <span className="text-[10px] font-bold" style={{ color: goalReached ? "#10B981" : "#F59E0B" }}>
                {Math.round(goalProgress)}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg2)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${goalProgress}%`,
                background: goalReached ? "linear-gradient(90deg, #10B981, #059669)" : "linear-gradient(90deg, #F59E0B, #EF4444)",
              }} />
            </div>
            {!goalReached && totalProjectedRevenue > 0 && (
              <p className="text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>
                Il manque {(state.monthlyGoal - totalProjectedRevenue).toLocaleString()}€ — augmente le volume ou active un niveau superieur
              </p>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 p-0.5 rounded-xl fade-up" style={{ background: "var(--bg2)" }}>
            {([
              { id: "objectif" as const, label: "Objectif", icon: Target },
              { id: "contenu" as const, label: "Contenu & Prix", icon: Camera },
              { id: "pipeline" as const, label: "Pipeline", icon: BarChart3 },
              { id: "projections" as const, label: "Projections", icon: TrendingUp },
              { id: "automation" as const, label: "Automation", icon: Bot },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all"
                style={{
                  background: tab === t.id ? "var(--surface)" : "transparent",
                  color: tab === t.id ? "var(--text)" : "var(--text-muted)",
                  boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                }}>
                <t.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* ═══ OBJECTIF TAB ═══ */}
          {tab === "objectif" && (
            <div className="space-y-4 fade-up">

              {/* Experience level */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>Niveau d'experience</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {EXPERIENCE_LEVELS.map(exp => {
                    const active = state.experience === exp.id;
                    return (
                      <button key={exp.id} onClick={() => set("experience", exp.id)}
                        className="p-3 rounded-xl text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                          background: active ? `${exp.color}12` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${active ? `${exp.color}40` : "var(--border)"}`,
                        }}>
                        <exp.icon className="w-4 h-4 mb-1" style={{ color: active ? exp.color : "var(--text-muted)" }} />
                        <p className="text-[11px] font-bold" style={{ color: active ? exp.color : "var(--text)" }}>{exp.label}</p>
                        <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{exp.subsRange} abonnes</p>
                        <p className="text-[8px] mt-0.5" style={{ color: "var(--text-muted)" }}>{exp.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monthly goal */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Target className="w-4 h-4" style={{ color: "#F59E0B" }} />
                  Objectif mensuel
                </h3>
                <div className="flex items-center gap-4 mb-3">
                  <input type="range" min={200} max={20000} step={100}
                    value={state.monthlyGoal}
                    onChange={e => set("monthlyGoal", Number(e.target.value))}
                    className="flex-1" style={{ accentColor: "#F59E0B" }} />
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ background: "rgba(245,158,11,0.1)" }}>
                    <DollarSign className="w-3 h-3" style={{ color: "#F59E0B" }} />
                    <span className="text-sm font-black" style={{ color: "#F59E0B" }}>{state.monthlyGoal.toLocaleString()}€</span>
                  </div>
                </div>
                <div className="flex justify-between text-[8px]" style={{ color: "var(--text-muted)" }}>
                  <span>200€</span>
                  <span>5 000€</span>
                  <span>10 000€</span>
                  <span>20 000€</span>
                </div>
              </div>

              {/* Sales channels */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>Canaux de vente</h3>
                <div className="grid grid-cols-2 gap-2">
                  {CHANNELS.map(ch => {
                    const active = state.activeChannels.includes(ch.id);
                    return (
                      <button key={ch.id} onClick={() => toggleChannel(ch.id)}
                        className="flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                        style={{
                          background: active ? `${ch.color}10` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${active ? `${ch.color}35` : "var(--border)"}`,
                        }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: active ? ch.color : "var(--bg2)", color: active ? "#fff" : "var(--text-muted)" }}>
                          <ch.icon className="w-4 h-4" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-[11px] font-bold" style={{ color: active ? "var(--text)" : "var(--text-muted)" }}>{ch.label}</p>
                          <p className="text-[8px]" style={{ color: "var(--text-muted)" }}>{ch.desc}</p>
                        </div>
                        {active && <Check className="w-4 h-4 shrink-0" style={{ color: ch.color }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══ CONTENU & PRIX TAB ═══ */}
          {tab === "contenu" && (
            <div className="space-y-4 fade-up">

              {/* Content levels */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>Niveaux de contenu</h3>
                <p className="text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>
                  Active les niveaux que tu veux produire. Chaque niveau inferieur est inclus automatiquement.
                </p>
                <div className="space-y-2">
                  {CONTENT_LEVELS.map(level => {
                    const active = state.activeLevels.includes(level.id);
                    const prices = level.marketPrices[state.experience];
                    const volume = state.contentVolume[level.id] || 0;
                    return (
                      <div key={level.id} className="rounded-xl overflow-hidden transition-all"
                        style={{
                          background: active ? `${level.color}06` : "rgba(255,255,255,0.02)",
                          border: `1px solid ${active ? `${level.color}30` : "var(--border)"}`,
                          opacity: active ? 1 : 0.5,
                        }}>
                        <div className="flex items-center gap-3 px-4 py-3">
                          <button onClick={() => toggleLevel(level.id)}
                            className="cursor-pointer shrink-0" style={{ background: "none", border: "none" }}>
                            {active
                              ? <CheckCircle className="w-5 h-5" style={{ color: level.color }} />
                              : <Circle className="w-5 h-5" style={{ color: "var(--border3)" }} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: `${level.color}20`, color: level.color }}>
                                N{level.id}
                              </span>
                              <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{level.label}</span>
                              <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${level.color}15`, color: level.color }}>
                                {level.tierLabel}
                              </span>
                            </div>
                            <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{level.desc}</p>
                          </div>
                          {active && level.id > 0 && (
                            <level.icon className="w-4 h-4 shrink-0" style={{ color: level.color }} />
                          )}
                        </div>

                        {/* Price grid + volume slider (if active and not level 0) */}
                        {active && level.id > 0 && (
                          <div className="px-4 pb-3 space-y-2" style={{ borderTop: `1px solid ${level.color}15` }}>
                            <div className="pt-2">
                              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: level.color }}>
                                Prix moyens du marche ({expMeta.label})
                              </span>
                              <div className="grid grid-cols-4 gap-2 mt-1.5">
                                {CHANNELS.filter(ch => state.activeChannels.includes(ch.id)).map(ch => (
                                  <div key={ch.id} className="text-center p-2 rounded-lg" style={{ background: `${ch.color}08` }}>
                                    <span className="text-[8px] font-medium block" style={{ color: "var(--text-muted)" }}>{ch.label.split(" ")[0]}</span>
                                    <span className="text-xs font-black" style={{ color: ch.color }}>{prices[ch.id]}€</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Volume slider */}
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] font-medium shrink-0" style={{ color: "var(--text-muted)" }}>Volume/mois:</span>
                              <input type="range" min={0} max={60} step={1} value={volume}
                                onChange={e => setVolume(level.id, Number(e.target.value))}
                                className="flex-1" style={{ accentColor: level.color }} />
                              <span className="text-[11px] font-bold w-10 text-right" style={{ color: level.color }}>{volume}</span>
                            </div>
                            {volume > 0 && (
                              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ background: `${level.color}08` }}>
                                <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>Revenu estime ce niveau:</span>
                                <span className="text-[11px] font-bold" style={{ color: "#10B981" }}>
                                  {(state.activeChannels.reduce((sum, ch) => sum + prices[ch] * volume, 0)).toLocaleString()}€/mois
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price recommendations */}
              {recommendedPrices.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.04), rgba(245,158,11,0.04))", border: "1px solid rgba(16,185,129,0.1)" }}>
                  <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
                    <Zap className="w-4 h-4" style={{ color: "#10B981" }} />
                    Prix recommandes ({expMeta.label})
                  </h3>
                  <div className="space-y-2">
                    {recommendedPrices.map(({ level, bestChannel }) => (
                      <div key={level.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "var(--surface)" }}>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ background: `${level.color}20`, color: level.color }}>
                          N{level.id}
                        </span>
                        <span className="text-[10px] font-medium flex-1" style={{ color: "var(--text)" }}>{level.label}</span>
                        {bestChannel && (
                          <div className="text-right">
                            <span className="text-[11px] font-bold" style={{ color: "#10B981" }}>{bestChannel.price}€</span>
                            <span className="text-[8px] ml-1" style={{ color: "var(--text-muted)" }}>
                              via {CHANNELS.find(c => c.id === bestChannel.ch)?.label.split(" ")[0]}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ PIPELINE TAB ═══ */}
          {tab === "pipeline" && (
            <div className="space-y-4 fade-up">

              {/* Pipeline progress */}
              <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>Progression globale</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                      {state.completedSteps.filter(s => visibleSteps.some(vs => vs.id === s)).length}/{visibleSteps.length}
                    </span>
                    <span className="text-xs font-black" style={{ color: pipelineProgress === 100 ? "#10B981" : "#60A5FA" }}>
                      {pipelineProgress}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg2)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: `${pipelineProgress}%`,
                    background: pipelineProgress === 100 ? "#10B981" : "linear-gradient(90deg, #60A5FA, #7C3AED)",
                  }} />
                </div>
              </div>

              {/* Category blocks — horizontal scroll on mobile, grid on desktop */}
              <div className="flex md:grid md:grid-cols-2 gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none"
                style={{ scrollbarWidth: "none" }}>
                {(["setup", "content", "sales", "growth"] as const).map(cat => {
                  const catMeta = CATEGORY_META[cat];
                  const catSteps = visibleSteps.filter(s => s.category === cat);
                  if (catSteps.length === 0) return null;
                  const catCompleted = catSteps.filter(s => state.completedSteps.includes(s.id)).length;
                  const catDone = catCompleted === catSteps.length;

                  return (
                    <div key={cat} className="min-w-[260px] md:min-w-0 snap-start rounded-xl overflow-hidden flex flex-col"
                      style={{
                        background: "var(--surface)",
                        border: `1px solid ${catDone ? "rgba(16,185,129,0.2)" : "var(--border)"}`,
                      }}>
                      {/* Category header */}
                      <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${catMeta.color}15` }}>
                          <catMeta.icon className="w-3 h-3" style={{ color: catMeta.color }} />
                        </div>
                        <span className="text-[11px] font-bold flex-1" style={{ color: catMeta.color }}>{catMeta.label}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{
                            background: catDone ? "rgba(16,185,129,0.1)" : `${catMeta.color}10`,
                            color: catDone ? "#10B981" : catMeta.color,
                          }}>
                          {catCompleted}/{catSteps.length}
                        </span>
                      </div>
                      {/* Mini progress */}
                      <div className="h-0.5" style={{ background: "var(--bg2)" }}>
                        <div className="h-full transition-all" style={{
                          width: `${(catCompleted / catSteps.length) * 100}%`,
                          background: catDone ? "#10B981" : catMeta.color,
                        }} />
                      </div>
                      {/* Steps — compact */}
                      <div className="flex-1 p-1.5 space-y-0.5">
                        {catSteps.map(step => {
                          const done = state.completedSteps.includes(step.id);
                          return (
                            <button key={step.id} onClick={() => toggleStep(step.id)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all hover:opacity-80 text-left"
                              style={{
                                background: done ? "rgba(16,185,129,0.05)" : "transparent",
                              }}>
                              {done
                                ? <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#10B981" }} />
                                : <Circle className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--border3)" }} />}
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-medium block truncate" style={{
                                  color: done ? "#10B981" : "var(--text)",
                                  textDecoration: done ? "line-through" : "none",
                                }}>{step.label}</span>
                              </div>
                              {step.requiresLevel !== undefined && (
                                <span className="text-[7px] font-bold px-1 py-0.5 rounded shrink-0"
                                  style={{ background: `${CONTENT_LEVELS[step.requiresLevel].color}15`, color: CONTENT_LEVELS[step.requiresLevel].color }}>
                                  N{step.requiresLevel}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ PROJECTIONS TAB ═══ */}
          {tab === "projections" && (
            <div className="space-y-4 fade-up">

              {/* Revenue breakdown by level */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <BarChart3 className="w-4 h-4" style={{ color: "#10B981" }} />
                  Revenus par niveau
                </h3>
                {revenueByLevel.length === 0 ? (
                  <div className="text-center py-6">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Active des niveaux de contenu pour voir les projections</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {revenueByLevel.map(r => (
                      <div key={r.level}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: `${r.color}20`, color: r.color }}>
                              N{r.level}
                            </span>
                            <span className="text-[10px] font-medium" style={{ color: "var(--text)" }}>{r.label}</span>
                            <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{r.volume} posts</span>
                          </div>
                          <span className="text-[11px] font-bold" style={{ color: "#10B981" }}>{r.channelRevenue.toLocaleString()}€</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg2)" }}>
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${Math.min((r.channelRevenue / Math.max(state.monthlyGoal, 1)) * 100, 100)}%`,
                            background: r.color,
                          }} />
                        </div>
                      </div>
                    ))}
                    {/* Total */}
                    <div className="flex items-center justify-between pt-3 mt-2" style={{ borderTop: "1px solid var(--border)" }}>
                      <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Total projete</span>
                      <span className="text-base font-black" style={{ color: goalReached ? "#10B981" : "#F59E0B" }}>
                        {totalProjectedRevenue.toLocaleString()}€/mois
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Revenue by channel */}
              {state.activeChannels.length > 0 && revenueByLevel.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>Revenus par canal</h3>
                  <div className="space-y-2">
                    {state.activeChannels.map(chId => {
                      const ch = CHANNELS.find(c => c.id === chId)!;
                      const chRevenue = state.activeLevels.filter(l => l > 0).reduce((sum, lvl) => {
                        const prices = CONTENT_LEVELS[lvl].marketPrices[state.experience];
                        const volume = state.contentVolume[lvl] || 0;
                        return sum + prices[chId] * volume;
                      }, 0);
                      return (
                        <div key={chId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                          style={{ background: `${ch.color}06`, border: `1px solid ${ch.color}15` }}>
                          <ch.icon className="w-4 h-4 shrink-0" style={{ color: ch.color }} />
                          <span className="text-[10px] font-semibold flex-1" style={{ color: "var(--text)" }}>{ch.label}</span>
                          <span className="text-[11px] font-bold" style={{ color: ch.color }}>{chRevenue.toLocaleString()}€</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Goal gap analysis */}
              <div className="rounded-xl p-4" style={{
                background: goalReached
                  ? "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.06))"
                  : "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(239,68,68,0.06))",
                border: `1px solid ${goalReached ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}`,
              }}>
                <h3 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: goalReached ? "#10B981" : "#F59E0B" }}>
                  {goalReached ? <CheckCircle className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                  {goalReached ? "Objectif atteint!" : "Comment atteindre ton objectif"}
                </h3>
                {goalReached ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                      Avec ta config actuelle, tu depasses ton objectif de <strong>{(totalProjectedRevenue - state.monthlyGoal).toLocaleString()}€</strong>.
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Pense a augmenter ton objectif ou a diversifier tes canaux.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {maxActiveLevel < 4 && (
                      <div className="flex items-start gap-2 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                        <Unlock className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#7C3AED" }} />
                        <span>Active le niveau <strong>N{maxActiveLevel + 1}</strong> ({CONTENT_LEVELS[maxActiveLevel + 1]?.label}) pour augmenter les prix</span>
                      </div>
                    )}
                    {state.activeChannels.length < CHANNELS.length && (
                      <div className="flex items-start gap-2 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                        <Zap className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
                        <span>Ajoute un canal de vente supplementaire pour multiplier les revenus</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                      <TrendingUp className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#10B981" }} />
                      <span>Augmente le volume de posts sur tes niveaux les plus rentables</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <p className="text-[8px] text-center" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                Les projections sont basees sur les moyennes du marche pour ton niveau d'experience.
                Les revenus reels dependent de ta niche, ton engagement, et ta regularite.
              </p>
            </div>
          )}

          {/* ═══ TAB: Automation ═══ */}
          {tab === "automation" && (
            <AutomationContent
              modelName={(currentModel || "model").toUpperCase()}
              storageKey={`heaven_automation_${currentModel || "yumi"}`}
              compact
            />
          )}

        </div>
      </div>
    </OsLayout>
  );
}
