"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Target, Globe, DollarSign, Camera, Zap, Users,
  CheckCircle, Circle, ChevronDown, ChevronUp, Power,
  Shield, AlertTriangle, Bot, Smartphone,
  Monitor, Star, Video, UserCheck,
  Check, ChevronRight, TrendingUp,
  Eye, Lock, Unlock, BarChart3,
  Flame, Crown, Sparkles, Play, MessageSquare, Heart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";

// ═══════════════════════════════════════════
// PLATFORM DATA (from strategie)
// ═══════════════════════════════════════════

interface PlatformDetail {
  id: string;
  name: string;
  logo: string;
  color: string;
  category: "auto" | "semi" | "manual" | "camming" | "social";
  commission: string;
  automationLevel: string;
  automationIcon: LucideIcon;
  monthlyPotential: string;
  audience: string;
  sfw: boolean;
  aiChat: boolean;
  requirements: string[];
  pros: string[];
  cons: string[];
  onboarding: string[];
  payoutInfo: string;
  minPayout: string;
  features: string[];
  tasks: string[];
  automation: "auto" | "semi" | "manual";
}

const PLATFORMS: PlatformDetail[] = [
  {
    id: "fanvue", name: "Fanvue", logo: "FV", color: "#E040FB",
    category: "auto", commission: "20%", automationLevel: "Automatique", automationIcon: Bot,
    monthlyPotential: "500€ – 5.000€+", audience: "Global (EN)", sfw: false, aiChat: true,
    requirements: ["Piece d'identite valide", "Compte bancaire ou Paxum", "Photos de verification", "18+ obligatoire"],
    pros: ["Agent IA integre pour gerer les chats automatiquement", "Commission la plus basse du marche (20%)", "Interface moderne et intuitive", "Paiement rapide (5 jours)", "Pas de geo-block par defaut"],
    cons: ["Audience plus petite qu'OnlyFans", "Moins connu du grand public", "Communaute principalement anglophone"],
    onboarding: ["Creer un compte createur sur fanvue.com", "Verification d'identite (24-48h)", "Configurer le profil + tarifs d'abonnement", "Activer l'agent IA pour le chat automatique", "Uploader le contenu initial (minimum 10 posts)", "Promouvoir via les reseaux sociaux"],
    payoutInfo: "Virement bancaire, Paxum", minPayout: "10$",
    features: ["AI Chat Agent", "Mass DM", "PPV", "Tipping", "Custom requests", "Referral program"],
    tasks: ["Verifier reponses AI chat", "Poster contenu", "Analyser conversions AI", "Ajuster catalogue PPV"],
    automation: "auto",
  },
  {
    id: "onlyfans", name: "OnlyFans", logo: "OF", color: "#00AFF0",
    category: "semi", commission: "20%", automationLevel: "Manuel", automationIcon: UserCheck,
    monthlyPotential: "1.000€ – 50.000€+", audience: "Global (EN/FR)", sfw: false, aiChat: false,
    requirements: ["Piece d'identite valide", "Compte bancaire international", "Photos de verification", "18+ obligatoire", "Formulaire W-8BEN (non-US)"],
    pros: ["Plus grande audience du marche", "Notoriete mondiale — facile de convertir", "Outils PPV et mass DM puissants", "Communaute tres active", "Systeme de pourboire genereux"],
    cons: ["Pas d'agent IA — tout est manuel", "Chat tres chronophage (reponses personnelles)", "Concurrence enorme", "Risque de leak de contenu"],
    onboarding: ["Creer un compte sur onlyfans.com", "Verification d'identite (48-72h)", "Configurer prix d'abonnement (recommande: 9.99-19.99$)", "Preparer 20-30 posts de contenu initial", "Configurer les messages de bienvenue", "Lancer la promotion sur les reseaux"],
    payoutInfo: "Virement bancaire international", minPayout: "20$",
    features: ["PPV Messages", "Mass DM", "Tipping", "Paid DMs", "Promo campaigns", "Co-streams"],
    tasks: ["Poster 3+ contenus", "Repondre DMs (<2h)", "Envoyer mass DM promo", "Verifier abonnements expirants", "Publier 1 PPV exclusif"],
    automation: "manual",
  },
  {
    id: "mym", name: "MYM", logo: "MY", color: "#FF6B6B",
    category: "semi", commission: "25%", automationLevel: "Semi-auto", automationIcon: Smartphone,
    monthlyPotential: "500€ – 10.000€+", audience: "Europe (FR principalement)", sfw: false, aiChat: false,
    requirements: ["Piece d'identite europeenne", "Compte bancaire SEPA", "Photos de verification", "18+ obligatoire"],
    pros: ["Systeme Push unique (contenu auto aux abonnes)", "Fort en France et Europe francophone", "Moins de concurrence qu'OnlyFans", "Paiement en EUR direct", "Interface en francais"],
    cons: ["Commission plus elevee (25%)", "Audience limitee a l'Europe principalement", "Pas d'IA pour le chat", "Croissance plus lente"],
    onboarding: ["Creer un compte createur sur mym.fans", "Verification d'identite (24-48h)", "Configurer le profil et les tarifs", "Activer le systeme Push pour l'envoi automatique", "Uploader le contenu initial", "Promouvoir via les reseaux sociaux FR"],
    payoutInfo: "Virement SEPA (EUR)", minPayout: "50€",
    features: ["Push system", "PPV", "Tipping", "Custom media", "Paid DMs", "Referral"],
    tasks: ["Activer push contenu", "Poster exclusif", "Repondre DMs", "Verifier revenus"],
    automation: "semi",
  },
  {
    id: "stripchat", name: "Stripchat", logo: "SC", color: "#FF3366",
    category: "camming", commission: "40-50%", automationLevel: "Manuel", automationIcon: Monitor,
    monthlyPotential: "1.000€ – 20.000€+", audience: "Global", sfw: false, aiChat: false,
    requirements: ["Piece d'identite valide", "Webcam HD minimum 720p", "Connexion internet stable (upload 10Mbps+)", "Eclairage professionnel", "18+ obligatoire"],
    pros: ["Revenus immediats via tokens en live", "Grande audience internationale", "Support VR disponible", "Programmes de bonus pour top performers", "Trafic organique gratuit"],
    cons: ["Commission tres elevee (40-50%)", "Necessite des heures de presence regulieres", "Pression physique et mentale du live", "Materiel technique requis"],
    onboarding: ["Creer un compte studio/model sur stripchat.com", "Verification d'identite stricte (48h)", "Configurer le materiel (cam, eclairage, son)", "Test de connexion et qualite video", "Choisir les categories et tags", "Planifier un horaire de diffusion regulier"],
    payoutInfo: "Virement, Paxum, Cosmo Payment", minPayout: "50$",
    features: ["Live streaming", "Tokens", "Private shows", "VR shows", "Fan clubs", "Lovense integration"],
    tasks: ["Planifier session live", "Definir objectifs tips", "Promouvoir schedule", "Analyser revenus session"],
    automation: "manual",
  },
  {
    id: "snapchat", name: "Snapchat", logo: "SN", color: "#FFFC00",
    category: "social", commission: "0%", automationLevel: "Manuel", automationIcon: Smartphone,
    monthlyPotential: "500€ – 15.000€+", audience: "18-35 ans, Global", sfw: false, aiChat: false,
    requirements: ["Compte Snapchat premium/prive", "Smartphone avec bonne camera", "Systeme de paiement externe (CashApp, PayPal)", "Gestion manuelle des abonnements"],
    pros: ["Pas de commission plateforme", "Contenu ephemere — moins de risque de leak", "Relation intime et directe avec les fans", "Revenus 100% pour le createur"],
    cons: ["Gestion 100% manuelle des abonnements", "Pas de systeme de paiement integre", "Risque de ban si signalement", "Suivi des expirations tres chronophage"],
    onboarding: ["Creer un compte Snapchat dedie (pas perso)", "Definir les packs et tarifs (Story privee)", "Configurer un lien de paiement externe", "Publier du contenu teaser sur les autres reseaux", "Gerer manuellement les ajouts/suppressions"],
    payoutInfo: "Direct (CashApp, PayPal, Wise)", minPayout: "0€ (pas de plateforme)",
    features: ["Stories privees", "DMs directs", "Contenu ephemere", "Screenshots alertes"],
    tasks: ["Envoyer snaps prives VIP+", "Verifier codes expirants", "Repondre aux messages", "Poster story publique"],
    automation: "manual",
  },
  {
    id: "instagram", name: "Instagram", logo: "IG", color: "#E1306C",
    category: "social", commission: "0%", automationLevel: "Semi-auto", automationIcon: Smartphone,
    monthlyPotential: "200€ – 5.000€+ (conversion)", audience: "Global, tous ages", sfw: true, aiChat: false,
    requirements: ["Compte Instagram business/createur", "Contenu SFW uniquement", "Bio optimisee avec Linktree/lien", "ManyChat ou outil d'automatisation DM"],
    pros: ["Enorme base d'utilisateurs (2B+)", "Excellent pour le funnel de conversion", "Reels viraux = visibilite gratuite", "ManyChat automatise les DMs de conversion", "Renforce la marque personnelle"],
    cons: ["Pas de monetisation directe adulte", "Risque de shadowban si contenu limite", "Algorithme impredictible", "Necessite de la regularite"],
    onboarding: ["Creer un compte business dedie", "Optimiser la bio + lien Linktree", "Configurer ManyChat pour DM automation", "Planifier 3-5 posts/semaine (Reels prioritaires)", "Connecter avec les autres plateformes payantes"],
    payoutInfo: "Aucun (canal de conversion uniquement)", minPayout: "N/A",
    features: ["Reels", "Stories", "DMs", "Live", "Shopping", "Collab posts"],
    tasks: ["Publier 3+ stories", "Poster 1 reel", "Repondre DMs", "Interagir avec followers", "Bio link a jour"],
    automation: "semi",
  },
];

// ═══════════════════════════════════════════
// ONBOARDING DATA
// ═══════════════════════════════════════════

const ONBOARDING_CATEGORIES = {
  legal: { label: "Legal & Identite", color: "#EF4444", icon: Shield },
  finance: { label: "Finance & Paiements", color: "#10B981", icon: DollarSign },
  materiel: { label: "Materiel technique", color: "#E84393", icon: Camera },
  contenu: { label: "Contenu initial", color: "#E040FB", icon: Star },
  promo: { label: "Promotion & Reseaux", color: "#00AFF0", icon: Globe },
} as const;

const GLOBAL_CHECKLIST = [
  { label: "Piece d'identite valide (recto/verso)", category: "legal" as const },
  { label: "Confirmation 18+ signee", category: "legal" as const },
  { label: "Contrat de collaboration agence", category: "legal" as const },
  { label: "Compte bancaire SEPA ou international", category: "finance" as const },
  { label: "Compte PayPal / Wise / Paxum", category: "finance" as const },
  { label: "Smartphone avec bonne camera", category: "materiel" as const },
  { label: "Webcam HD 1080p (si camming)", category: "materiel" as const },
  { label: "Eclairage professionnel (ring light minimum)", category: "materiel" as const },
  { label: "Connexion internet stable (10Mbps+ upload)", category: "materiel" as const },
  { label: "Photos de profil professionnelles", category: "contenu" as const },
  { label: "Bio et description optimisees", category: "contenu" as const },
  { label: "Minimum 10-20 posts de contenu initial", category: "contenu" as const },
  { label: "Planning de publication defini", category: "contenu" as const },
  { label: "Comptes reseaux sociaux configures (Snap, IG)", category: "promo" as const },
  { label: "Liens de redirection (Linktree ou bio)", category: "promo" as const },
];

// ═══════════════════════════════════════════
// REVENUE COMPARISON TABLE
// ═══════════════════════════════════════════

const REVENUE_MODELS = [
  { platform: "Fanvue", sub: true, ppv: true, tips: true, live: false, gifts: false, custom: true, ai: true },
  { platform: "OnlyFans", sub: true, ppv: true, tips: true, live: false, gifts: false, custom: true, ai: false },
  { platform: "MYM", sub: true, ppv: true, tips: true, live: false, gifts: false, custom: true, ai: false },
  { platform: "Stripchat", sub: false, ppv: false, tips: true, live: true, gifts: true, custom: true, ai: false },
  { platform: "Snapchat", sub: true, ppv: true, tips: true, live: false, gifts: false, custom: true, ai: false },
  { platform: "Instagram", sub: false, ppv: false, tips: false, live: false, gifts: false, custom: false, ai: false },
];

const checkIcon = (v: boolean) => v
  ? <CheckCircle className="w-3.5 h-3.5 mx-auto" style={{ color: "#10B981" }} />
  : <Circle className="w-3.5 h-3.5 mx-auto" style={{ color: "var(--border3, #333)" }} />;

// ═══════════════════════════════════════════
// SIMULATOR DATA (from simulateur)
// ═══════════════════════════════════════════

type ExperienceLevel = "debutante" | "moyenne" | "pro" | "experte";

const EXPERIENCE_LEVELS: { id: ExperienceLevel; label: string; icon: typeof Star; color: string; subsRange: string; desc: string }[] = [
  { id: "debutante", label: "Debutante", icon: Star, color: "#60A5FA", subsRange: "0-100", desc: "Premier mois, construction d'audience" },
  { id: "moyenne", label: "Moyenne", icon: Flame, color: "#F59E0B", subsRange: "100-500", desc: "Audience etablie, revenus reguliers" },
  { id: "pro", label: "Pro", icon: Crown, color: "#7C3AED", subsRange: "500-2000", desc: "Grande audience, multi-plateformes" },
  { id: "experte", label: "Experte", icon: Sparkles, color: "#F43F5E", subsRange: "2000+", desc: "Top creatrices, revenus massifs" },
];

interface ContentLevel {
  id: number;
  label: string;
  desc: string;
  color: string;
  tierLabel: string;
  icon: typeof Eye;
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

type SalesChannel = "ppv" | "abo" | "story" | "caming";
const CHANNELS: { id: SalesChannel; label: string; desc: string; icon: typeof Play; color: string }[] = [
  { id: "ppv", label: "PPV (Pay Per View)", desc: "Contenu vendu a l'unite via messages", icon: Play, color: "#E040FB" },
  { id: "abo", label: "Abonnement", desc: "Acces mensuel recurrent", icon: Users, color: "#10B981" },
  { id: "story", label: "Story privee", desc: "Contenu ephemere exclusif", icon: MessageSquare, color: "#F59E0B" },
  { id: "caming", label: "Caming / Live", desc: "Sessions live avec pourboires", icon: Video, color: "#F43F5E" },
];

// Pipeline steps
interface PipelineStep {
  id: string;
  label: string;
  desc: string;
  category: "setup" | "content" | "sales" | "growth";
  requiresLevel?: number;
  requiresChannel?: SalesChannel;
}

const PIPELINE_STEPS: PipelineStep[] = [
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

const CATEGORY_META: Record<string, { label: string; color: string; icon: typeof Target }> = {
  setup: { label: "Mise en place", color: "#60A5FA", icon: Shield },
  content: { label: "Contenu", color: "#F59E0B", icon: Camera },
  sales: { label: "Ventes", color: "#10B981", icon: DollarSign },
  growth: { label: "Croissance", color: "#E040FB", icon: TrendingUp },
};

// ═══════════════════════════════════════════
// SIMULATOR STATE PERSISTENCE
// ═══════════════════════════════════════════

const SIM_STORAGE_KEY = "heaven_strategy_v2";

interface SimState {
  experience: ExperienceLevel;
  monthlyGoal: number;
  activeLevels: number[];
  activeChannels: SalesChannel[];
  completedSteps: string[];
  contentVolume: Record<number, number>;
  updatedAt: string;
}

function defaultSimState(): SimState {
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

function loadSimState(): SimState {
  if (typeof window === "undefined") return defaultSimState();
  try {
    const raw = localStorage.getItem(SIM_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultSimState();
}

function saveSimState(s: SimState) {
  localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify({ ...s, updatedAt: new Date().toISOString() }));
}

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════

type ActiveTab = "plateformes" | "simulateur" | "onboarding" | "tactique";

export default function StrategiePage() {
  const { currentModel } = useModel();
  const modelSlug = currentModel || "yumi";

  const [activeTab, setActiveTab] = useState<ActiveTab>("plateformes");
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  // Onboarding state
  const [onboardingChecked, setOnboardingChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(`heaven_onboarding_${modelSlug}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Tactique state (daily tasks)
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set(["onlyfans", "instagram", "snapchat"]);
    try {
      const saved = localStorage.getItem(`heaven_strategy_${modelSlug}`);
      if (saved) return new Set(JSON.parse(saved).platforms || []);
    } catch {}
    return new Set(["onlyfans", "instagram", "snapchat"]);
  });

  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(`heaven_checklist_${modelSlug}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Simulator state
  const [simState, setSimState] = useState<SimState>(loadSimState);
  const [simTab, setSimTab] = useState<"objectif" | "contenu" | "pipeline" | "projections">("objectif");

  // Persist tactique
  useEffect(() => {
    localStorage.setItem(`heaven_strategy_${modelSlug}`, JSON.stringify({ platforms: [...activePlatforms] }));
  }, [activePlatforms, modelSlug]);

  useEffect(() => {
    localStorage.setItem(`heaven_checklist_${modelSlug}`, JSON.stringify(checklist));
  }, [checklist, modelSlug]);

  // Persist onboarding
  useEffect(() => {
    localStorage.setItem(`heaven_onboarding_${modelSlug}`, JSON.stringify(onboardingChecked));
  }, [onboardingChecked, modelSlug]);

  // Persist simulator
  useEffect(() => { saveSimState(simState); }, [simState]);

  // Tactique callbacks
  const togglePlatform = useCallback((id: string) => {
    setActivePlatforms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleTask = useCallback((taskKey: string) => {
    setChecklist(prev => ({ ...prev, [taskKey]: !prev[taskKey] }));
  }, []);

  const toggleOnboarding = useCallback((label: string) => {
    setOnboardingChecked(prev => ({ ...prev, [label]: !prev[label] }));
  }, []);

  // Simulator callbacks
  const setSim = useCallback(<K extends keyof SimState>(key: K, val: SimState[K]) => {
    setSimState(prev => ({ ...prev, [key]: val }));
  }, []);

  const toggleLevel = useCallback((lvl: number) => {
    setSimState(prev => {
      const has = prev.activeLevels.includes(lvl);
      if (!has) {
        const newLevels = [...new Set([...prev.activeLevels, ...Array.from({ length: lvl + 1 }, (_, i) => i)])];
        const newVolume = { ...prev.contentVolume };
        for (const l of newLevels) { if (!newVolume[l]) newVolume[l] = l === 0 ? 20 : 8; }
        return { ...prev, activeLevels: newLevels.sort(), contentVolume: newVolume };
      }
      const newLevels = prev.activeLevels.filter(l => l < lvl);
      return { ...prev, activeLevels: newLevels };
    });
  }, []);

  const toggleChannel = useCallback((ch: SalesChannel) => {
    setSimState(prev => ({
      ...prev,
      activeChannels: prev.activeChannels.includes(ch)
        ? prev.activeChannels.filter(c => c !== ch)
        : [...prev.activeChannels, ch],
    }));
  }, []);

  const toggleStep = useCallback((stepId: string) => {
    setSimState(prev => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(stepId)
        ? prev.completedSteps.filter(s => s !== stepId)
        : [...prev.completedSteps, stepId],
    }));
  }, []);

  const setVolume = useCallback((lvl: number, vol: number) => {
    setSimState(prev => ({ ...prev, contentVolume: { ...prev.contentVolume, [lvl]: vol } }));
  }, []);

  // Tactique computed
  const active = PLATFORMS.filter(p => activePlatforms.has(p.id));
  const totalTasks = active.reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = active.reduce((sum, p) => sum + p.tasks.filter((_, i) => checklist[`${p.id}-${i}`]).length, 0);
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const onboardingDone = GLOBAL_CHECKLIST.filter(i => onboardingChecked[i.label]).length;

  // Simulator computed
  const maxActiveLevel = useMemo(() => Math.max(...simState.activeLevels, 0), [simState.activeLevels]);

  const revenueByLevel = useMemo(() => {
    return simState.activeLevels.filter(l => l > 0).map(lvl => {
      const level = CONTENT_LEVELS[lvl];
      const prices = level.marketPrices[simState.experience];
      const volume = simState.contentVolume[lvl] || 0;
      const channelRevenue = simState.activeChannels.reduce((sum, ch) => sum + prices[ch] * volume, 0);
      return { level: lvl, label: level.label, color: level.color, volume, channelRevenue };
    });
  }, [simState.activeLevels, simState.activeChannels, simState.experience, simState.contentVolume]);

  const totalProjectedRevenue = useMemo(() => revenueByLevel.reduce((s, r) => s + r.channelRevenue, 0), [revenueByLevel]);
  const goalProgress = useMemo(() => Math.min((totalProjectedRevenue / Math.max(simState.monthlyGoal, 1)) * 100, 100), [totalProjectedRevenue, simState.monthlyGoal]);
  const goalReached = totalProjectedRevenue >= simState.monthlyGoal;

  const visibleSteps = useMemo(() => {
    return PIPELINE_STEPS.filter(step => {
      if (step.requiresLevel !== undefined && !simState.activeLevels.includes(step.requiresLevel)) return false;
      if (step.requiresChannel && !simState.activeChannels.includes(step.requiresChannel)) return false;
      return true;
    });
  }, [simState.activeLevels, simState.activeChannels]);

  const pipelineProgress = useMemo(() => {
    if (visibleSteps.length === 0) return 0;
    return Math.round((simState.completedSteps.filter(s => visibleSteps.some(vs => vs.id === s)).length / visibleSteps.length) * 100);
  }, [visibleSteps, simState.completedSteps]);

  const recommendedPrices = useMemo(() => {
    return CONTENT_LEVELS.filter(l => simState.activeLevels.includes(l.id) && l.id > 0).map(level => {
      const prices = level.marketPrices[simState.experience];
      const bestChannel = simState.activeChannels.reduce<{ ch: SalesChannel; price: number } | null>((best, ch) => {
        const p = prices[ch];
        if (!best || p > best.price) return { ch, price: p };
        return best;
      }, null);
      return { level, bestChannel };
    });
  }, [simState.activeLevels, simState.activeChannels, simState.experience]);

  const expMeta = EXPERIENCE_LEVELS.find(e => e.id === simState.experience)!;

  const badge = (level: "auto" | "semi" | "manual") => ({
    auto: { label: "Auto", bg: "rgba(16,185,129,0.12)", color: "#10B981" },
    semi: { label: "Semi", bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
    manual: { label: "Manuel", bg: "rgba(100,116,139,0.12)", color: "#64748B" },
  }[level]);

  const TABS: { id: ActiveTab; label: string; icon: LucideIcon }[] = [
    { id: "plateformes", label: "Plateformes", icon: Globe },
    { id: "simulateur", label: "Simulateur", icon: BarChart3 },
    { id: "onboarding", label: "Onboarding", icon: Shield },
    { id: "tactique", label: "Tactique", icon: Zap },
  ];

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen pb-24">

        {/* Header */}
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", boxShadow: "0 0 20px rgba(224,64,251,0.15)" }}>
              <Target className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Strategie & Simulateur</h1>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Plateformes, simulateur de revenus, onboarding et planification.
              </p>
            </div>
            {/* Goal badge from simulator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{
                background: goalReached ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                border: `1px solid ${goalReached ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
              }}>
              <DollarSign className="w-3.5 h-3.5" style={{ color: goalReached ? "#10B981" : "#F59E0B" }} />
              <span className="text-[11px] font-bold" style={{ color: goalReached ? "#10B981" : "#F59E0B" }}>
                {totalProjectedRevenue.toLocaleString()}€ / {simState.monthlyGoal.toLocaleString()}€
              </span>
            </div>
          </div>
        </div>

        {/* Sticky Tab bar */}
        <div className="sticky top-0 z-30" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap cursor-pointer transition-all shrink-0"
                    style={{
                      color: isActive ? "var(--accent)" : "var(--text-muted)",
                      borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                    }}>
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 max-w-5xl mx-auto">

          {/* ══════════════════════════════════
              TAB: PLATEFORMES
              ══════════════════════════════════ */}
          {activeTab === "plateformes" && (
            <div className="space-y-3">
              {/* Revenue model comparison table */}
              <div className="rounded-xl overflow-hidden mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Comparatif sources de revenus
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]" style={{ minWidth: 500 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["Plateforme", "Sub", "PPV", "Tips", "Live", "Cadeaux", "Custom", "IA"].map(h => (
                          <th key={h} className="px-3 py-2 text-center font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {REVENUE_MODELS.map((r, i) => (
                        <tr key={r.platform} style={{ borderBottom: i < REVENUE_MODELS.length - 1 ? "1px solid var(--border)" : undefined }}>
                          <td className="px-3 py-2 font-bold text-left" style={{ color: "var(--text)" }}>{r.platform}</td>
                          <td className="px-3 py-2">{checkIcon(r.sub)}</td>
                          <td className="px-3 py-2">{checkIcon(r.ppv)}</td>
                          <td className="px-3 py-2">{checkIcon(r.tips)}</td>
                          <td className="px-3 py-2">{checkIcon(r.live)}</td>
                          <td className="px-3 py-2">{checkIcon(r.gifts)}</td>
                          <td className="px-3 py-2">{checkIcon(r.custom)}</td>
                          <td className="px-3 py-2">{checkIcon(r.ai)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Platform cards */}
              {PLATFORMS.map(p => {
                const isExpanded = expandedPlatform === p.id;
                return (
                  <div key={p.id} className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: `1px solid ${p.color}20` }}>
                    <button onClick={() => setExpandedPlatform(isExpanded ? null : p.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02]">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: `${p.color}20`, color: p.color }}>
                        {p.logo}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{p.name}</span>
                          {p.aiChat && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: "#10B98115", color: "#10B981" }}>IA</span>
                          )}
                          {p.sfw && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: "var(--bg2, #1a1a1a)", color: "var(--text-muted)" }}>SFW</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                          <span>Commission: {p.commission}</span>
                          <span>{p.automationLevel}</span>
                          <span style={{ color: "#10B981" }}>{p.monthlyPotential}/mois</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4" style={{ borderTop: `1px solid ${p.color}10` }}>
                        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: p.color }}>Fonctionnalites</p>
                              <div className="flex flex-wrap gap-1">
                                {p.features.map(f => (
                                  <span key={f} className="text-[9px] px-1.5 py-0.5 rounded"
                                    style={{ background: `${p.color}12`, color: p.color }}>{f}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "#10B981" }}>Avantages</p>
                              <ul className="space-y-0.5">
                                {p.pros.map(pro => (
                                  <li key={pro} className="flex items-start gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    <CheckCircle className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: "#10B981" }} />
                                    {pro}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "#F59E0B" }}>Inconvenients</p>
                              <ul className="space-y-0.5">
                                {p.cons.map(con => (
                                  <li key={con} className="flex items-start gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
                                    {con}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-2 rounded-lg" style={{ background: "var(--bg2, #1a1a1a)" }}>
                                <p className="text-[9px] font-bold uppercase mb-0.5" style={{ color: "var(--text-muted)" }}>Audience</p>
                                <p className="text-[10px] font-medium" style={{ color: "var(--text)" }}>{p.audience}</p>
                              </div>
                              <div className="p-2 rounded-lg" style={{ background: "var(--bg2, #1a1a1a)" }}>
                                <p className="text-[9px] font-bold uppercase mb-0.5" style={{ color: "var(--text-muted)" }}>Paiement min.</p>
                                <p className="text-[10px] font-medium" style={{ color: "var(--text)" }}>{p.minPayout}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Prerequis</p>
                              <ul className="space-y-0.5">
                                {p.requirements.map(r => (
                                  <li key={r} className="flex items-start gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    <Shield className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: "#E84393" }} />
                                    {r}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: p.color }}>Etapes d'activation</p>
                              <ol className="space-y-0.5">
                                {p.onboarding.map((step, i) => (
                                  <li key={step} className="flex items-start gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    <span className="font-bold shrink-0" style={{ color: p.color }}>{i + 1}.</span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ══════════════════════════════════
              TAB: SIMULATEUR
              ══════════════════════════════════ */}
          {activeTab === "simulateur" && (
            <div className="space-y-5">

              {/* Summary KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Objectif", value: `${simState.monthlyGoal.toLocaleString()}€`, color: "#F59E0B", icon: Target },
                  { label: "Projete", value: `${totalProjectedRevenue.toLocaleString()}€`, color: goalReached ? "#10B981" : "#EF4444", icon: DollarSign },
                  { label: "Pipeline", value: `${pipelineProgress}%`, color: pipelineProgress === 100 ? "#10B981" : "#60A5FA", icon: BarChart3 },
                  { label: "Niveau max", value: `N${maxActiveLevel}`, color: CONTENT_LEVELS[maxActiveLevel].color, icon: Flame },
                ].map(card => (
                  <div key={card.label} className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <card.icon className="w-3 h-3" style={{ color: card.color }} />
                      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{card.label}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: card.color }}>{card.value}</span>
                  </div>
                ))}
              </div>

              {/* Goal progress bar */}
              <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
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
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                    Il manque {(simState.monthlyGoal - totalProjectedRevenue).toLocaleString()}€ — augmente le volume ou active un niveau superieur
                  </p>
                )}
              </div>

              {/* Simulator sub-tabs */}
              <div className="flex gap-1 p-0.5 rounded-xl" style={{ background: "var(--bg2)" }}>
                {([
                  { id: "objectif" as const, label: "Objectif", icon: Target },
                  { id: "contenu" as const, label: "Contenu & Prix", icon: Camera },
                  { id: "pipeline" as const, label: "Pipeline", icon: BarChart3 },
                  { id: "projections" as const, label: "Projections", icon: TrendingUp },
                ]).map(t => (
                  <button key={t.id} onClick={() => setSimTab(t.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all"
                    style={{
                      background: simTab === t.id ? "var(--surface)" : "transparent",
                      color: simTab === t.id ? "var(--text)" : "var(--text-muted)",
                      boxShadow: simTab === t.id ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                    }}>
                    <t.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* ── SUB: OBJECTIF ── */}
              {simTab === "objectif" && (
                <div className="space-y-4">
                  {/* Experience level */}
                  <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>Niveau d'experience</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {EXPERIENCE_LEVELS.map(exp => {
                        const isActive = simState.experience === exp.id;
                        return (
                          <button key={exp.id} onClick={() => setSim("experience", exp.id)}
                            className="p-3 rounded-xl text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                              background: isActive ? `${exp.color}12` : "rgba(255,255,255,0.03)",
                              border: `1px solid ${isActive ? `${exp.color}40` : "var(--border)"}`,
                            }}>
                            <exp.icon className="w-4 h-4 mb-1" style={{ color: isActive ? exp.color : "var(--text-muted)" }} />
                            <p className="text-[11px] font-bold" style={{ color: isActive ? exp.color : "var(--text)" }}>{exp.label}</p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{exp.subsRange} abonnes</p>
                            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{exp.desc}</p>
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
                        value={simState.monthlyGoal}
                        onChange={e => setSim("monthlyGoal", Number(e.target.value))}
                        className="flex-1" style={{ accentColor: "#F59E0B" }} />
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ background: "rgba(245,158,11,0.1)" }}>
                        <DollarSign className="w-3 h-3" style={{ color: "#F59E0B" }} />
                        <span className="text-sm font-black" style={{ color: "#F59E0B" }}>{simState.monthlyGoal.toLocaleString()}€</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
                      <span>200€</span><span>5 000€</span><span>10 000€</span><span>20 000€</span>
                    </div>
                  </div>

                  {/* Sales channels */}
                  <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>Canaux de vente</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {CHANNELS.map(ch => {
                        const isActive = simState.activeChannels.includes(ch.id);
                        return (
                          <button key={ch.id} onClick={() => toggleChannel(ch.id)}
                            className="flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                            style={{
                              background: isActive ? `${ch.color}10` : "rgba(255,255,255,0.03)",
                              border: `1px solid ${isActive ? `${ch.color}35` : "var(--border)"}`,
                            }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ background: isActive ? ch.color : "var(--bg2)", color: isActive ? "#fff" : "var(--text-muted)" }}>
                              <ch.icon className="w-4 h-4" />
                            </div>
                            <div className="text-left flex-1">
                              <p className="text-[11px] font-bold" style={{ color: isActive ? "var(--text)" : "var(--text-muted)" }}>{ch.label}</p>
                              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{ch.desc}</p>
                            </div>
                            {isActive && <Check className="w-4 h-4 shrink-0" style={{ color: ch.color }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUB: CONTENU & PRIX ── */}
              {simTab === "contenu" && (
                <div className="space-y-4">
                  <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>Niveaux de contenu</h3>
                    <p className="text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>
                      Active les niveaux que tu veux produire. Chaque niveau inferieur est inclus automatiquement.
                    </p>
                    <div className="space-y-2">
                      {CONTENT_LEVELS.map(level => {
                        const isActive = simState.activeLevels.includes(level.id);
                        const prices = level.marketPrices[simState.experience];
                        const volume = simState.contentVolume[level.id] || 0;
                        return (
                          <div key={level.id} className="rounded-xl overflow-hidden transition-all"
                            style={{
                              background: isActive ? `${level.color}06` : "rgba(255,255,255,0.02)",
                              border: `1px solid ${isActive ? `${level.color}30` : "var(--border)"}`,
                              opacity: isActive ? 1 : 0.5,
                            }}>
                            <div className="flex items-center gap-3 px-4 py-3">
                              <button onClick={() => toggleLevel(level.id)}
                                className="cursor-pointer shrink-0" style={{ background: "none", border: "none" }}>
                                {isActive
                                  ? <CheckCircle className="w-5 h-5" style={{ color: level.color }} />
                                  : <Circle className="w-5 h-5" style={{ color: "var(--border3)" }} />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: `${level.color}20`, color: level.color }}>
                                    N{level.id}
                                  </span>
                                  <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{level.label}</span>
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${level.color}15`, color: level.color }}>
                                    {level.tierLabel}
                                  </span>
                                </div>
                                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{level.desc}</p>
                              </div>
                              {isActive && level.id > 0 && (
                                <level.icon className="w-4 h-4 shrink-0" style={{ color: level.color }} />
                              )}
                            </div>

                            {isActive && level.id > 0 && (
                              <div className="px-4 pb-3 space-y-2" style={{ borderTop: `1px solid ${level.color}15` }}>
                                <div className="pt-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: level.color }}>
                                    Prix moyens du marche ({expMeta.label})
                                  </span>
                                  <div className="grid grid-cols-4 gap-2 mt-1.5">
                                    {CHANNELS.filter(ch => simState.activeChannels.includes(ch.id)).map(ch => (
                                      <div key={ch.id} className="text-center p-2 rounded-lg" style={{ background: `${ch.color}08` }}>
                                        <span className="text-[10px] font-medium block" style={{ color: "var(--text-muted)" }}>{ch.label.split(" ")[0]}</span>
                                        <span className="text-xs font-black" style={{ color: ch.color }}>{prices[ch.id]}€</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-medium shrink-0" style={{ color: "var(--text-muted)" }}>Volume/mois:</span>
                                  <input type="range" min={0} max={60} step={1} value={volume}
                                    onChange={e => setVolume(level.id, Number(e.target.value))}
                                    className="flex-1" style={{ accentColor: level.color }} />
                                  <span className="text-[11px] font-bold w-10 text-right" style={{ color: level.color }}>{volume}</span>
                                </div>
                                {volume > 0 && (
                                  <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ background: `${level.color}08` }}>
                                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Revenu estime ce niveau:</span>
                                    <span className="text-[11px] font-bold" style={{ color: "#10B981" }}>
                                      {(simState.activeChannels.reduce((sum, ch) => sum + prices[ch] * volume, 0)).toLocaleString()}€/mois
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
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ background: `${level.color}20`, color: level.color }}>
                              N{level.id}
                            </span>
                            <span className="text-[10px] font-medium flex-1" style={{ color: "var(--text)" }}>{level.label}</span>
                            {bestChannel && (
                              <div className="text-right">
                                <span className="text-[11px] font-bold" style={{ color: "#10B981" }}>{bestChannel.price}€</span>
                                <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>
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

              {/* ── SUB: PIPELINE ── */}
              {simTab === "pipeline" && (
                <div className="space-y-4">
                  <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>Progression globale</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {simState.completedSteps.filter(s => visibleSteps.some(vs => vs.id === s)).length}/{visibleSteps.length}
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

                  <div className="flex md:grid md:grid-cols-2 gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none"
                    style={{ scrollbarWidth: "none" }}>
                    {(["setup", "content", "sales", "growth"] as const).map(cat => {
                      const catMeta = CATEGORY_META[cat];
                      const catSteps = visibleSteps.filter(s => s.category === cat);
                      if (catSteps.length === 0) return null;
                      const catCompleted = catSteps.filter(s => simState.completedSteps.includes(s.id)).length;
                      const catDone = catCompleted === catSteps.length;

                      return (
                        <div key={cat} className="min-w-[260px] md:min-w-0 snap-start rounded-xl overflow-hidden flex flex-col"
                          style={{
                            background: "var(--surface)",
                            border: `1px solid ${catDone ? "rgba(16,185,129,0.2)" : "var(--border)"}`,
                          }}>
                          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: `${catMeta.color}15` }}>
                              <catMeta.icon className="w-3 h-3" style={{ color: catMeta.color }} />
                            </div>
                            <span className="text-[11px] font-bold flex-1" style={{ color: catMeta.color }}>{catMeta.label}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{
                                background: catDone ? "rgba(16,185,129,0.1)" : `${catMeta.color}10`,
                                color: catDone ? "#10B981" : catMeta.color,
                              }}>
                              {catCompleted}/{catSteps.length}
                            </span>
                          </div>
                          <div className="h-0.5" style={{ background: "var(--bg2)" }}>
                            <div className="h-full transition-all" style={{
                              width: `${(catCompleted / catSteps.length) * 100}%`,
                              background: catDone ? "#10B981" : catMeta.color,
                            }} />
                          </div>
                          <div className="flex-1 p-1.5 space-y-0.5">
                            {catSteps.map(step => {
                              const done = simState.completedSteps.includes(step.id);
                              return (
                                <button key={step.id} onClick={() => toggleStep(step.id)}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all hover:opacity-80 text-left"
                                  style={{ background: done ? "rgba(16,185,129,0.05)" : "transparent" }}>
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
                                    <span className="text-[10px] font-bold px-1 py-0.5 rounded shrink-0"
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

              {/* ── SUB: PROJECTIONS ── */}
              {simTab === "projections" && (
                <div className="space-y-4">
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
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: `${r.color}20`, color: r.color }}>
                                  N{r.level}
                                </span>
                                <span className="text-[10px] font-medium" style={{ color: "var(--text)" }}>{r.label}</span>
                                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{r.volume} posts</span>
                              </div>
                              <span className="text-[11px] font-bold" style={{ color: "#10B981" }}>{r.channelRevenue.toLocaleString()}€</span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg2)" }}>
                              <div className="h-full rounded-full transition-all" style={{
                                width: `${Math.min((r.channelRevenue / Math.max(simState.monthlyGoal, 1)) * 100, 100)}%`,
                                background: r.color,
                              }} />
                            </div>
                          </div>
                        ))}
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
                  {simState.activeChannels.length > 0 && revenueByLevel.length > 0 && (
                    <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>Revenus par canal</h3>
                      <div className="space-y-2">
                        {simState.activeChannels.map(chId => {
                          const ch = CHANNELS.find(c => c.id === chId)!;
                          const chRevenue = simState.activeLevels.filter(l => l > 0).reduce((sum, lvl) => {
                            const prices = CONTENT_LEVELS[lvl].marketPrices[simState.experience];
                            const volume = simState.contentVolume[lvl] || 0;
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
                          Avec ta config actuelle, tu depasses ton objectif de <strong>{(totalProjectedRevenue - simState.monthlyGoal).toLocaleString()}€</strong>.
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
                        {simState.activeChannels.length < CHANNELS.length && (
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

                  <p className="text-[10px] text-center" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                    Les projections sont basees sur les moyennes du marche pour ton niveau d'experience.
                    Les revenus reels dependent de ta niche, ton engagement, et ta regularite.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════
              TAB: ONBOARDING
              ══════════════════════════════════ */}
          {activeTab === "onboarding" && (
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold" style={{ color: "var(--text)" }}>
                    Checklist d'onboarding universel
                  </p>
                  <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>
                    {onboardingDone}/{GLOBAL_CHECKLIST.length}
                  </span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "var(--bg2, #1a1a1a)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${(onboardingDone / GLOBAL_CHECKLIST.length) * 100}%`, background: "var(--accent)" }} />
                </div>
              </div>

              {(Object.keys(ONBOARDING_CATEGORIES) as (keyof typeof ONBOARDING_CATEGORIES)[]).map(cat => {
                const cfg = ONBOARDING_CATEGORIES[cat];
                const items = GLOBAL_CHECKLIST.filter(i => i.category === cat);
                return (
                  <div key={cat} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <cfg.icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</p>
                    </div>
                    <div className="space-y-1.5">
                      {items.map(item => {
                        const isDone = !!onboardingChecked[item.label];
                        return (
                          <button key={item.label} onClick={() => toggleOnboarding(item.label)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left cursor-pointer transition-all"
                            style={{ background: isDone ? `${cfg.color}08` : "transparent", border: `1px solid ${isDone ? `${cfg.color}20` : "var(--border)"}` }}>
                            <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                              style={{ background: isDone ? cfg.color : "transparent", border: `1.5px solid ${isDone ? cfg.color : "var(--border)"}` }}>
                              {isDone && <CheckCircle className="w-3 h-3" style={{ color: "#fff" }} />}
                            </div>
                            <span className="text-[11px]" style={{ color: isDone ? "var(--text-muted)" : "var(--text)", textDecoration: isDone ? "line-through" : "none" }}>
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══════════════════════════════════
              TAB: TACTIQUE
              ══════════════════════════════════ */}
          {activeTab === "tactique" && (
            <div className="space-y-4">
              {/* Progress */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{doneTasks}/{totalTasks} taches</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: progress === 100 ? "var(--success, #10B981)" : "var(--accent)" }}>{progress}%</span>
                    <button onClick={() => setChecklist({})} className="text-[10px] px-2 py-0.5 rounded cursor-pointer hover:opacity-70" style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>Reset</button>
                  </div>
                </div>
                <div className="h-2 rounded-full" style={{ background: "var(--bg2, #1a1a1a)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: progress === 100 ? "var(--success, #10B981)" : "var(--accent)" }} />
                </div>
              </div>

              {/* Platform toggles */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Plateformes actives cette semaine</h2>
                <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                  {PLATFORMS.map(p => {
                    const isActive = activePlatforms.has(p.id);
                    const b = badge(p.automation);
                    return (
                      <button key={p.id} onClick={() => togglePlatform(p.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap cursor-pointer transition-all shrink-0"
                        style={{
                          background: isActive ? `${p.color}12` : "var(--surface)",
                          border: `1px solid ${isActive ? `${p.color}30` : "var(--border)"}`,
                          color: isActive ? p.color : "var(--text-muted)",
                          opacity: isActive ? 1 : 0.5,
                        }}>
                        <Power className="w-3 h-3" /> {p.name}
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: b.bg, color: b.color }}>{b.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Checklists per active platform */}
              {active.length === 0 ? (
                <div className="text-center py-16 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <Globe className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Active au moins une plateforme</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {active.map(platform => {
                    const b = badge(platform.automation);
                    const done = platform.tasks.filter((_, i) => checklist[`${platform.id}-${i}`]).length;
                    const pct = Math.round((done / platform.tasks.length) * 100);
                    const isOpen = expandedPlatform === platform.id;
                    return (
                      <div key={platform.id} className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: `1px solid ${platform.color}20` }}>
                        <button onClick={() => setExpandedPlatform(isOpen ? null : platform.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02]">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: platform.color }} />
                          <span className="text-sm font-bold flex-1 text-left" style={{ color: "var(--text)" }}>{platform.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: b.bg, color: b.color }}>{b.label}</span>
                          <span className="text-[10px] font-mono" style={{ color: platform.color }}>{done}/{platform.tasks.length}</span>
                          <div className="w-16 h-1.5 rounded-full" style={{ background: "var(--bg2, #1a1a1a)" }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: platform.color }} />
                          </div>
                          {isOpen ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3 space-y-1" style={{ borderTop: `1px solid ${platform.color}10` }}>
                            <p className="text-[10px] py-1" style={{ color: "var(--text-muted)" }}>Commission: {platform.commission}</p>
                            {platform.tasks.map((task, i) => {
                              const key = `${platform.id}-${i}`;
                              const isDone = !!checklist[key];
                              return (
                                <button key={key} onClick={() => toggleTask(key)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left cursor-pointer transition-all"
                                  style={{ background: isDone ? `${platform.color}06` : "transparent", border: `1px solid ${isDone ? `${platform.color}15` : "var(--border)"}` }}>
                                  {isDone ? <CheckCircle className="w-4 h-4 shrink-0" style={{ color: platform.color }} /> : <Circle className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />}
                                  <span className="text-xs flex-1" style={{ color: isDone ? platform.color : "var(--text-muted)", textDecoration: isDone ? "line-through" : "none", opacity: isDone ? 0.7 : 1 }}>{task}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Summary */}
              {active.length > 0 && (
                <div className="rounded-xl p-4 grid grid-cols-3 gap-3 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "var(--text)" }}>{active.length}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Plateformes</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>{totalTasks}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Taches/semaine</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "var(--success, #10B981)" }}>{active.filter(p => p.automation !== "manual").length}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Automatisees</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </OsLayout>
  );
}
