import {
  Star, Flame, Crown, Sparkles,
  Eye, Heart, Lock,
  Play, Users, MessageSquare, Video,
  Shield, Camera, DollarSign, TrendingUp, Target,
} from "lucide-react";

// ═══════════════════════════════════════════
// Experience Levels
// ═══════════════════════════════════════════

export type ExperienceLevel = "debutante" | "moyenne" | "pro" | "experte";

export const EXPERIENCE_LEVELS: { id: ExperienceLevel; label: string; icon: typeof Star; color: string; subsRange: string; desc: string }[] = [
  { id: "debutante", label: "Debutante", icon: Star, color: "#60A5FA", subsRange: "0-100", desc: "Premier mois, construction d'audience" },
  { id: "moyenne", label: "Moyenne", icon: Flame, color: "#F59E0B", subsRange: "100-500", desc: "Audience etablie, revenus reguliers" },
  { id: "pro", label: "Pro", icon: Crown, color: "#7C3AED", subsRange: "500-2000", desc: "Grande audience, multi-plateformes" },
  { id: "experte", label: "Experte", icon: Sparkles, color: "#F43F5E", subsRange: "2000+", desc: "Top creatrices, revenus massifs" },
];

// ═══════════════════════════════════════════
// Content Levels
// ═══════════════════════════════════════════

export interface ContentLevel {
  id: number;
  label: string;
  desc: string;
  color: string;
  tierLabel: string;
  icon: typeof Eye;
  marketPrices: Record<ExperienceLevel, { ppv: number; abo: number; story: number; caming: number }>;
}

export const CONTENT_LEVELS: ContentLevel[] = [
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

// ═══════════════════════════════════════════
// Sales Channels
// ═══════════════════════════════════════════

export type SalesChannel = "ppv" | "abo" | "story" | "caming";

export const CHANNELS: { id: SalesChannel; label: string; desc: string; icon: typeof Play; color: string }[] = [
  { id: "ppv", label: "PPV (Pay Per View)", desc: "Contenu vendu a l'unite via messages", icon: Play, color: "#E040FB" },
  { id: "abo", label: "Abonnement", desc: "Acces mensuel recurrent", icon: Users, color: "#10B981" },
  { id: "story", label: "Story privee", desc: "Contenu ephemere exclusif", icon: MessageSquare, color: "#F59E0B" },
  { id: "caming", label: "Caming / Live", desc: "Sessions live avec pourboires", icon: Video, color: "#F43F5E" },
];

// ═══════════════════════════════════════════
// Pipeline Steps
// ═══════════════════════════════════════════

export interface PipelineStep {
  id: string;
  label: string;
  desc: string;
  category: "setup" | "content" | "sales" | "growth";
  requiresLevel?: number;
  requiresChannel?: SalesChannel;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: "choose-platforms", label: "Choisir ses plateformes", desc: "Fanvue, OF, MYM, Snap, Insta", category: "setup" },
  { id: "create-profiles", label: "Creer les profils", desc: "Bio, avatar, banner, liens", category: "setup" },
  { id: "set-prices", label: "Definir ses prix", desc: "Abonnements, PPV, pourboires", category: "setup" },
  { id: "payment-setup", label: "Configurer les paiements", desc: "Stripe, Wise, paiements integres", category: "setup" },
  { id: "first-shoot", label: "Premier shooting", desc: "10-20 photos de base", category: "content" },
  { id: "content-calendar", label: "Calendrier de contenu", desc: "Planifier posts hebdomadaires", category: "content" },
  { id: "soft-content", label: "Publier contenu Soft (N0)", desc: "Teasings, lifestyle, selfies SFW", category: "content", requiresLevel: 0 },
  { id: "charme-content", label: "Publier contenu Charme (N1)", desc: "Lingerie, poses charme pour VIP", category: "content", requiresLevel: 1 },
  { id: "sensuel-content", label: "Publier contenu Sensuel (N2)", desc: "Provocant, suggestif pour Gold", category: "content", requiresLevel: 2 },
  { id: "nude-nf-content", label: "Publier Nudes sans visage (N3)", desc: "Nudes, sextapes anonymes pour Diamond", category: "content", requiresLevel: 3 },
  { id: "nude-face-content", label: "Publier Nudes avec visage (N4)", desc: "Contenu complet pour Platinum", category: "content", requiresLevel: 4 },
  { id: "ppv-setup", label: "Configurer les PPV", desc: "Preparer messages PPV automatiques", category: "sales", requiresChannel: "ppv" },
  { id: "sub-launch", label: "Lancer les abonnements", desc: "Page abonnes + prix mensuel", category: "sales", requiresChannel: "abo" },
  { id: "story-routine", label: "Routine stories privees", desc: "Stories exclusives quotidiennes", category: "sales", requiresChannel: "story" },
  { id: "live-schedule", label: "Planning lives/caming", desc: "Horaires fixes, materiel pret", category: "sales", requiresChannel: "caming" },
  { id: "first-sales", label: "Premieres ventes", desc: "Obtenir les 10 premiers clients payants", category: "sales" },
  { id: "promo-social", label: "Promotion sur reseaux", desc: "Reels, stories, cross-promo", category: "growth" },
  { id: "engage-fans", label: "Engager la communaute", desc: "Repondre DMs, commentaires, fidiliser", category: "growth" },
  { id: "analyze-metrics", label: "Analyser les metriques", desc: "Revenus, conversion, retention", category: "growth" },
  { id: "scale-content", label: "Scaler la production", desc: "Plus de contenu, nouveaux niveaux", category: "growth" },
  { id: "ads-launch", label: "Lancer la publicite", desc: "Instagram Ads, Snap Ads, TikTok", category: "growth" },
];

export const CATEGORY_META: Record<string, { label: string; color: string; icon: typeof Target }> = {
  setup: { label: "Mise en place", color: "#60A5FA", icon: Shield },
  content: { label: "Contenu", color: "#F59E0B", icon: Camera },
  sales: { label: "Ventes", color: "#10B981", icon: DollarSign },
  growth: { label: "Croissance", color: "#E040FB", icon: TrendingUp },
};

// ═══════════════════════════════════════════
// Simulator State Persistence
// ═══════════════════════════════════════════

export const SIM_STORAGE_KEY = "heaven_strategy_v2";

export interface SimState {
  experience: ExperienceLevel;
  monthlyGoal: number;
  activeLevels: number[];
  activeChannels: SalesChannel[];
  completedSteps: string[];
  contentVolume: Record<number, number>;
  updatedAt: string;
}

export function defaultSimState(): SimState {
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

export function loadSimState(): SimState {
  if (typeof window === "undefined") return defaultSimState();
  try {
    const raw = localStorage.getItem(SIM_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultSimState();
}

export function saveSimState(s: SimState) {
  localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify({ ...s, updatedAt: new Date().toISOString() }));
}
