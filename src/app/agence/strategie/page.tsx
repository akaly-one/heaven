"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Globe,
  Users,
  DollarSign,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bot,
  UserCheck,
  Smartphone,
  Monitor,
  Video,
  Camera,
  MessageSquare,
  TrendingUp,
  Star,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  Target,
  RotateCcw,
  Save,
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";

// ── Platform data ──

interface Platform {
  id: string;
  name: string;
  category: "auto" | "semi" | "manual" | "camming" | "social";
  logo: string;
  color: string;
  commission: string;
  automationLevel: "Automatique" | "Semi-auto" | "Manuel";
  automationIcon: typeof Bot;
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
}

const PLATFORMS: Platform[] = [
  {
    id: "fanvue",
    name: "Fanvue",
    category: "auto",
    logo: "FV",
    color: "#E040FB",
    commission: "20%",
    automationLevel: "Automatique",
    automationIcon: Bot,
    monthlyPotential: "500€ – 5.000€+",
    audience: "Global (EN)",
    sfw: false,
    aiChat: true,
    requirements: [
      "Piece d'identite valide",
      "Compte bancaire ou Paxum",
      "Photos de verification",
      "18+ obligatoire",
    ],
    pros: [
      "Agent IA integre pour gerer les chats automatiquement",
      "Commission la plus basse du marche (20%)",
      "Interface moderne et intuitive",
      "Paiement rapide (5 jours)",
      "Pas de geo-block par defaut",
    ],
    cons: [
      "Audience plus petite qu'OnlyFans",
      "Moins connu du grand public",
      "Communaute principalement anglophone",
    ],
    onboarding: [
      "Creer un compte createur sur fanvue.com",
      "Verification d'identite (24-48h)",
      "Configurer le profil + tarifs d'abonnement",
      "Activer l'agent IA pour le chat automatique",
      "Uploader le contenu initial (minimum 10 posts)",
      "Promouvoir via les reseaux sociaux",
    ],
    payoutInfo: "Virement bancaire, Paxum",
    minPayout: "10$",
    features: ["AI Chat Agent", "Mass DM", "PPV", "Tipping", "Custom requests", "Referral program"],
  },
  {
    id: "onlyfans",
    name: "OnlyFans",
    category: "semi",
    logo: "OF",
    color: "#00AFF0",
    commission: "20%",
    automationLevel: "Manuel",
    automationIcon: UserCheck,
    monthlyPotential: "1.000€ – 50.000€+",
    audience: "Global (EN/FR)",
    sfw: false,
    aiChat: false,
    requirements: [
      "Piece d'identite valide",
      "Compte bancaire international",
      "Photos de verification",
      "18+ obligatoire",
      "Formulaire W-8BEN (non-US)",
    ],
    pros: [
      "Plus grande audience du marche",
      "Notoriete mondiale — facile de convertir",
      "Outils PPV et mass DM puissants",
      "Communaute tres active",
      "Systeme de pourboire genereux",
    ],
    cons: [
      "Pas d'agent IA — tout est manuel",
      "Chat tres chronophage (reponses personnelles)",
      "Concurrence enorme",
      "Risque de leak de contenu",
    ],
    onboarding: [
      "Creer un compte sur onlyfans.com",
      "Verification d'identite (48-72h)",
      "Configurer prix d'abonnement (recommande: 9.99-19.99$)",
      "Preparer 20-30 posts de contenu initial",
      "Configurer les messages de bienvenue",
      "Lancer la promotion sur les reseaux",
    ],
    payoutInfo: "Virement bancaire international",
    minPayout: "20$",
    features: ["PPV Messages", "Mass DM", "Tipping", "Paid DMs", "Promo campaigns", "Co-streams"],
  },
  {
    id: "mym",
    name: "MYM",
    category: "semi",
    logo: "MY",
    color: "#FF6B6B",
    commission: "25%",
    automationLevel: "Semi-auto",
    automationIcon: Smartphone,
    monthlyPotential: "500€ – 10.000€+",
    audience: "Europe (FR principalement)",
    sfw: false,
    aiChat: false,
    requirements: [
      "Piece d'identite europeenne",
      "Compte bancaire SEPA",
      "Photos de verification",
      "18+ obligatoire",
    ],
    pros: [
      "Systeme Push unique (contenu auto aux abonnes)",
      "Fort en France et Europe francophone",
      "Moins de concurrence qu'OnlyFans",
      "Paiement en EUR direct",
      "Interface en francais",
    ],
    cons: [
      "Commission plus elevee (25%)",
      "Audience limitee a l'Europe principalement",
      "Pas d'IA pour le chat",
      "Croissance plus lente",
    ],
    onboarding: [
      "Creer un compte createur sur mym.fans",
      "Verification d'identite (24-48h)",
      "Configurer le profil et les tarifs",
      "Activer le systeme Push pour l'envoi automatique",
      "Uploader le contenu initial",
      "Promouvoir via les reseaux sociaux FR",
    ],
    payoutInfo: "Virement SEPA (EUR)",
    minPayout: "50€",
    features: ["Push system", "PPV", "Tipping", "Custom media", "Paid DMs", "Referral"],
  },
  {
    id: "stripchat",
    name: "Stripchat",
    category: "camming",
    logo: "SC",
    color: "#FF3366",
    commission: "40-50%",
    automationLevel: "Manuel",
    automationIcon: Monitor,
    monthlyPotential: "1.000€ – 20.000€+",
    audience: "Global",
    sfw: false,
    aiChat: false,
    requirements: [
      "Piece d'identite valide",
      "Webcam HD minimum 720p",
      "Connexion internet stable (upload 10Mbps+)",
      "Eclairage professionnel",
      "18+ obligatoire",
    ],
    pros: [
      "Revenus immediats via tokens en live",
      "Grande audience internationale",
      "Support VR disponible",
      "Programmes de bonus pour top performers",
      "Trafic organique gratuit",
    ],
    cons: [
      "Commission tres elevee (40-50%)",
      "Necessite des heures de presence regulieres",
      "Pression physique et mentale du live",
      "Materiel technique requis",
    ],
    onboarding: [
      "Creer un compte studio/model sur stripchat.com",
      "Verification d'identite stricte (48h)",
      "Configurer le materiel (cam, eclairage, son)",
      "Test de connexion et qualite video",
      "Choisir les categories et tags",
      "Planifier un horaire de diffusion regulier",
    ],
    payoutInfo: "Virement, Paxum, Cosmo Payment",
    minPayout: "50$",
    features: ["Live streaming", "Tokens", "Private shows", "VR shows", "Fan clubs", "Lovense integration"],
  },
  {
    id: "eurolive",
    name: "EuroLive",
    category: "camming",
    logo: "EL",
    color: "#FFB800",
    commission: "30-70%",
    automationLevel: "Manuel",
    automationIcon: Monitor,
    monthlyPotential: "500€ – 8.000€+",
    audience: "Europe",
    sfw: false,
    aiChat: false,
    requirements: [
      "Piece d'identite europeenne",
      "Webcam HD",
      "Connexion internet stable",
      "18+ obligatoire",
    ],
    pros: [
      "Audience europeenne ciblee",
      "Moins de concurrence que Stripchat",
      "Support en francais",
      "Paiement en EUR",
    ],
    cons: [
      "Commission variable tres elevee (30-70%)",
      "Audience plus restreinte",
      "Plateforme moins moderne",
      "Moins de fonctionnalites que Stripchat",
    ],
    onboarding: [
      "Creer un compte sur la plateforme",
      "Verification d'identite",
      "Configurer le materiel technique",
      "Commencer les sessions en heures de pointe EU",
    ],
    payoutInfo: "Virement SEPA",
    minPayout: "100€",
    features: ["Live streaming", "Private shows", "Tipping", "Paid chat"],
  },
  {
    id: "bigo",
    name: "Bigo Live",
    category: "camming",
    logo: "BG",
    color: "#00D4AA",
    commission: "50-70%",
    automationLevel: "Manuel",
    automationIcon: Monitor,
    monthlyPotential: "200€ – 5.000€+",
    audience: "Asie, Global",
    sfw: true,
    aiChat: false,
    requirements: [
      "Piece d'identite valide",
      "Smartphone avec bonne camera",
      "18+ obligatoire",
      "Contenu SFW uniquement",
    ],
    pros: [
      "Enorme audience (400M+ utilisateurs)",
      "Contenu SFW — pas de nudite requise",
      "Cadeaux virtuels lucratifs",
      "Ideal pour diversifier",
      "Application mobile native",
    ],
    cons: [
      "Commission la plus elevee (50-70%)",
      "Revenus via cadeaux virtuels uniquement",
      "Audience principalement asiatique",
      "Necessite du live regulier",
    ],
    onboarding: [
      "Telecharger l'app Bigo Live",
      "Creer un compte et verifier l'identite",
      "Rejoindre une agence officielle (recommande pour meilleur rev share)",
      "Definir un horaire de stream regulier",
      "Engager l'audience via interactions et jeux",
    ],
    payoutInfo: "Via agence ou beans → cash",
    minPayout: "Variable (via agence)",
    features: ["Live streaming", "Virtual gifts", "Multi-guest rooms", "PK battles", "Fan clubs"],
  },
  {
    id: "snapchat",
    name: "Snapchat",
    category: "social",
    logo: "SN",
    color: "#FFFC00",
    commission: "0%",
    automationLevel: "Manuel",
    automationIcon: Smartphone,
    monthlyPotential: "500€ – 15.000€+",
    audience: "18-35 ans, Global",
    sfw: false,
    aiChat: false,
    requirements: [
      "Compte Snapchat premium/prive",
      "Smartphone avec bonne camera",
      "Systeme de paiement externe (CashApp, PayPal)",
      "Gestion manuelle des abonnements",
    ],
    pros: [
      "Pas de commission plateforme",
      "Contenu ephemere — moins de risque de leak",
      "Relation intime et directe avec les fans",
      "Revenus 100% pour le createur",
    ],
    cons: [
      "Gestion 100% manuelle des abonnements",
      "Pas de systeme de paiement integre",
      "Risque de ban si signalement",
      "Suivi des expirations tres chronophage",
    ],
    onboarding: [
      "Creer un compte Snapchat dedie (pas perso)",
      "Definir les packs et tarifs (Story privee)",
      "Configurer un lien de paiement externe",
      "Publier du contenu teaser sur les autres reseaux",
      "Gerer manuellement les ajouts/suppressions",
    ],
    payoutInfo: "Direct (CashApp, PayPal, Wise)",
    minPayout: "0€ (pas de plateforme)",
    features: ["Stories privees", "DMs directs", "Contenu ephemere", "Screenshots alertes"],
  },
  {
    id: "instagram",
    name: "Instagram",
    category: "social",
    logo: "IG",
    color: "#E1306C",
    commission: "0%",
    automationLevel: "Semi-auto",
    automationIcon: Smartphone,
    monthlyPotential: "200€ – 5.000€+ (conversion)",
    audience: "Global, tous ages",
    sfw: true,
    aiChat: false,
    requirements: [
      "Compte Instagram business/createur",
      "Contenu SFW uniquement",
      "Bio optimisee avec Linktree/lien",
      "ManyChat ou outil d'automatisation DM",
    ],
    pros: [
      "Enorme base d'utilisateurs (2B+)",
      "Excellent pour le funnel de conversion",
      "Reels viraux = visibilite gratuite",
      "ManyChat automatise les DMs de conversion",
      "Renforce la marque personnelle",
    ],
    cons: [
      "Pas de monetisation directe pour contenu adulte",
      "Risque de ban si contenu trop explicite",
      "Algorithme impredictible",
      "Sert de vitrine, pas de revenu direct",
    ],
    onboarding: [
      "Creer un compte createur optimise",
      "Bio avec lien vers Fanvue/OnlyFans",
      "Configurer ManyChat pour les DMs automatiques",
      "Publier 3-5 reels/semaine pour la visibilite",
      "Utiliser les stories pour teaser le contenu premium",
    ],
    payoutInfo: "N/A (plateforme de conversion)",
    minPayout: "N/A",
    features: ["Reels", "Stories", "DMs", "Live", "ManyChat integration", "Link in bio"],
  },
];

// ── Category config ──

const CATEGORIES = [
  { id: "all", label: "Toutes", color: "var(--accent)" },
  { id: "auto", label: "Automatique", color: "#E040FB", icon: Bot },
  { id: "semi", label: "Semi-auto", color: "#00AFF0", icon: Smartphone },
  { id: "manual", label: "Manuel", color: "#F59E0B", icon: UserCheck },
  { id: "camming", label: "Camming", color: "#FF3366", icon: Video },
  { id: "social", label: "Reseaux", color: "#E1306C", icon: Globe },
] as const;

// ── Onboarding checklist global ──

const GLOBAL_CHECKLIST = [
  { label: "Piece d'identite valide (recto/verso)", category: "legal" },
  { label: "Confirmation 18+ signee", category: "legal" },
  { label: "Contrat de collaboration agence", category: "legal" },
  { label: "Compte bancaire SEPA ou international", category: "finance" },
  { label: "Compte PayPal / Wise / Paxum", category: "finance" },
  { label: "Smartphone avec bonne camera", category: "materiel" },
  { label: "Webcam HD 1080p (si camming)", category: "materiel" },
  { label: "Eclairage professionnel (ring light minimum)", category: "materiel" },
  { label: "Connexion internet stable (10Mbps+ upload)", category: "materiel" },
  { label: "Photos de profil professionnelles", category: "contenu" },
  { label: "Bio et description optimisees", category: "contenu" },
  { label: "Minimum 10-20 posts de contenu initial", category: "contenu" },
  { label: "Planning de publication defini", category: "contenu" },
  { label: "Comptes reseaux sociaux configures (Snap, IG)", category: "promo" },
  { label: "Liens de redirection (Linktree ou bio)", category: "promo" },
];

// ── Revenue model comparison ──

const REVENUE_MODELS = [
  { platform: "Fanvue", sub: true, ppv: true, tips: true, live: false, gifts: false, custom: true, ai: true },
  { platform: "OnlyFans", sub: true, ppv: true, tips: true, live: false, gifts: false, custom: true, ai: false },
  { platform: "MYM", sub: true, ppv: true, tips: true, live: false, gifts: false, custom: true, ai: false },
  { platform: "Stripchat", sub: false, ppv: false, tips: true, live: true, gifts: true, custom: true, ai: false },
  { platform: "EuroLive", sub: false, ppv: false, tips: true, live: true, gifts: true, custom: false, ai: false },
  { platform: "Bigo Live", sub: false, ppv: false, tips: false, live: true, gifts: true, custom: false, ai: false },
  { platform: "Snapchat", sub: true, ppv: true, tips: true, live: false, gifts: false, custom: true, ai: false },
  { platform: "Instagram", sub: false, ppv: false, tips: false, live: false, gifts: false, custom: false, ai: false },
];

// ── Strategy Planner types ──

interface ModelStrategy {
  modelSlug: string;
  activePlatforms: string[];
  weeklyChecklist: { id: string; label: string; category: string; done: boolean }[];
  revenueTargets: { platform: string; target: number }[];
  notes: string;
  updatedAt: string;
}

const STRATEGY_CHECKLIST_TEMPLATES: { id: string; label: string; category: string }[] = [
  { id: "ig-reels", label: "Publier 3+ Reels Instagram (funnel)", category: "contenu" },
  { id: "ig-stories", label: "Stories quotidiennes Instagram", category: "contenu" },
  { id: "fv-posts", label: "Publier 5+ posts Fanvue", category: "contenu" },
  { id: "of-posts", label: "Publier 5+ posts OnlyFans", category: "contenu" },
  { id: "snap-stories", label: "Stories Snapchat premium (3+/jour)", category: "contenu" },
  { id: "mym-push", label: "Envoyer Push MYM (2+/semaine)", category: "contenu" },
  { id: "fv-chat", label: "Verifier reponses IA Fanvue", category: "engagement" },
  { id: "of-dms", label: "Repondre DMs OnlyFans (< 2h)", category: "engagement" },
  { id: "snap-dms", label: "Repondre DMs Snap clients (< 2h)", category: "engagement" },
  { id: "community", label: "Interagir commentaires IG/TikTok", category: "engagement" },
  { id: "ppv-send", label: "Envoyer PPV cible (Fanvue + OF)", category: "monetisation" },
  { id: "custom-req", label: "Traiter demandes custom en attente", category: "monetisation" },
  { id: "live-session", label: "Session live (Stripchat/Bigo)", category: "monetisation" },
  { id: "check-codes", label: "Verifier codes expirants Heaven OS", category: "gestion" },
  { id: "check-revenue", label: "Verifier revenus plateformes", category: "gestion" },
  { id: "content-plan", label: "Planifier contenu semaine suivante", category: "gestion" },
  { id: "watermark", label: "Verifier watermarks sur livrables", category: "securite" },
  { id: "leak-check", label: "Scan anti-leak (nom + contenu)", category: "securite" },
];

const STRATEGY_CATEGORIES = [
  { id: "contenu", label: "Contenu", color: "#A78BFA" },
  { id: "engagement", label: "Engagement", color: "#00AFF0" },
  { id: "monetisation", label: "Monetisation", color: "#C9A84C" },
  { id: "gestion", label: "Gestion", color: "#10B981" },
  { id: "securite", label: "Securite", color: "#EF4444" },
];

function loadModelStrategy(slug: string): ModelStrategy {
  try {
    const raw = localStorage.getItem(`heaven_strategy_${slug}`);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return {
    modelSlug: slug,
    activePlatforms: ["fanvue", "snapchat"],
    weeklyChecklist: STRATEGY_CHECKLIST_TEMPLATES.map(t => ({ ...t, done: false })),
    revenueTargets: [
      { platform: "fanvue", target: 2000 },
      { platform: "onlyfans", target: 1500 },
      { platform: "snapchat", target: 1000 },
      { platform: "mym", target: 500 },
    ],
    notes: "",
    updatedAt: new Date().toISOString(),
  };
}

function saveModelStrategy(strategy: ModelStrategy) {
  localStorage.setItem(`heaven_strategy_${strategy.modelSlug}`, JSON.stringify({ ...strategy, updatedAt: new Date().toISOString() }));
}

// ── Component ──

export default function StrategiePage() {
  const { currentModel, auth } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "yumi";

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"platforms" | "comparison" | "checklist" | "strategy">("platforms");

  // Strategy planner state
  const [strategy, setStrategy] = useState<ModelStrategy>(() => loadModelStrategy(modelSlug));
  const [strategyDirty, setStrategyDirty] = useState(false);

  // Reload strategy when model changes
  useEffect(() => {
    setStrategy(loadModelStrategy(modelSlug));
    setStrategyDirty(false);
  }, [modelSlug]);

  const togglePlatform = useCallback((platformId: string) => {
    setStrategy(prev => {
      const active = prev.activePlatforms.includes(platformId)
        ? prev.activePlatforms.filter(p => p !== platformId)
        : [...prev.activePlatforms, platformId];
      return { ...prev, activePlatforms: active };
    });
    setStrategyDirty(true);
  }, []);

  const toggleCheckItem = useCallback((itemId: string) => {
    setStrategy(prev => ({
      ...prev,
      weeklyChecklist: prev.weeklyChecklist.map(c => c.id === itemId ? { ...c, done: !c.done } : c),
    }));
    setStrategyDirty(true);
  }, []);

  const updateTarget = useCallback((platform: string, target: number) => {
    setStrategy(prev => ({
      ...prev,
      revenueTargets: prev.revenueTargets.map(r => r.platform === platform ? { ...r, target } : r),
    }));
    setStrategyDirty(true);
  }, []);

  const saveStrategy = useCallback(() => {
    saveModelStrategy(strategy);
    setStrategyDirty(false);
  }, [strategy]);

  const resetChecklist = useCallback(() => {
    setStrategy(prev => ({
      ...prev,
      weeklyChecklist: prev.weeklyChecklist.map(c => ({ ...c, done: false })),
    }));
    setStrategyDirty(true);
  }, []);

  const filtered = activeCategory === "all"
    ? PLATFORMS
    : PLATFORMS.filter((p) => p.category === activeCategory);

  return (
    <OsLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 fade-up">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))" }}
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
                Strategie & Plateformes
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Analyse complete du marche — revenus, automatisation, onboarding
              </p>
            </div>
          </div>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 fade-up-1">
          {[
            { label: "Plateformes", value: PLATFORMS.length.toString(), icon: Globe, color: "var(--accent)" },
            { label: "Automatiques", value: PLATFORMS.filter(p => p.aiChat).length.toString(), icon: Bot, color: "#E040FB" },
            { label: "SFW Only", value: PLATFORMS.filter(p => p.sfw).length.toString(), icon: Shield, color: "var(--success)" },
            { label: "Camming", value: PLATFORMS.filter(p => p.category === "camming").length.toString(), icon: Video, color: "#FF3366" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="card-premium p-4 stat-glow"
              style={{ "--glow-color": `${kpi.color}15` } as React.CSSProperties}
            >
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="segmented-control mb-6 fade-up-2">
          {(["platforms", "comparison", "checklist", "strategy"] as const).map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "platforms" && "Plateformes"}
              {tab === "comparison" && "Comparatif"}
              {tab === "checklist" && "Onboarding"}
              {tab === "strategy" && "Strategie"}
            </button>
          ))}
        </div>

        {/* ═══ TAB: Platforms ═══ */}
        {activeTab === "platforms" && (
          <div className="fade-up">
            {/* Category filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  style={{
                    background: activeCategory === cat.id ? `${cat.color}20` : "var(--surface)",
                    color: activeCategory === cat.id ? cat.color : "var(--text-muted)",
                    border: `1px solid ${activeCategory === cat.id ? `${cat.color}40` : "var(--border2)"}`,
                  }}
                >
                  {"icon" in cat && cat.icon && <cat.icon className="w-3 h-3" />}
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Platform cards */}
            <div className="flex flex-col gap-3">
              {filtered.map((p) => {
                const expanded = expandedPlatform === p.id;
                return (
                  <div key={p.id} className="card-premium overflow-hidden gradient-border">
                    {/* Card header */}
                    <button
                      onClick={() => setExpandedPlatform(expanded ? null : p.id)}
                      className="w-full flex items-center gap-4 p-4 cursor-pointer text-left"
                      style={{ background: "transparent", border: "none", color: "var(--text)" }}
                    >
                      {/* Logo */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: `${p.color}20`, color: p.color }}
                      >
                        {p.logo}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold">{p.name}</span>
                          {p.aiChat && (
                            <span className="badge badge-success" style={{ fontSize: 9 }}>
                              <Bot className="w-2.5 h-2.5" /> IA
                            </span>
                          )}
                          {p.sfw && (
                            <span className="badge badge-muted" style={{ fontSize: 9 }}>SFW</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Commission: {p.commission}
                          </span>
                          <span className="flex items-center gap-1">
                            <p.automationIcon className="w-3 h-3" />
                            {p.automationLevel}
                          </span>
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className="hidden sm:block text-right shrink-0">
                        <p className="text-xs font-semibold" style={{ color: "var(--success)" }}>{p.monthlyPotential}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>/ mois</p>
                      </div>

                      {/* Chevron */}
                      <div className="shrink-0" style={{ color: "var(--text-muted)" }}>
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {expanded && (
                      <div className="px-4 pb-4 animate-fade-in" style={{ borderTop: "1px solid var(--border2)" }}>
                        <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">

                          {/* Left: Info */}
                          <div className="flex flex-col gap-4">
                            {/* Audience + payout */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 rounded-lg" style={{ background: "var(--bg3)" }}>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Audience</p>
                                <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{p.audience}</p>
                              </div>
                              <div className="p-3 rounded-lg" style={{ background: "var(--bg3)" }}>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Paiement min.</p>
                                <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{p.minPayout}</p>
                              </div>
                            </div>

                            {/* Features */}
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Fonctionnalites</p>
                              <div className="flex flex-wrap gap-1.5">
                                {p.features.map((f) => (
                                  <span
                                    key={f}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                                    style={{ background: `${p.color}15`, color: p.color }}
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Pros */}
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--success)" }}>
                                <CheckCircle2 className="w-3 h-3 inline mr-1" />Avantages
                              </p>
                              <ul className="flex flex-col gap-1">
                                {p.pros.map((pro) => (
                                  <li key={pro} className="text-xs flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
                                    <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                                    {pro}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Cons */}
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--warning)" }}>
                                <AlertTriangle className="w-3 h-3 inline mr-1" />Inconvenients
                              </p>
                              <ul className="flex flex-col gap-1">
                                {p.cons.map((con) => (
                                  <li key={con} className="text-xs flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
                                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "var(--warning)" }} />
                                    {con}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Right: Onboarding */}
                          <div className="flex flex-col gap-4">
                            {/* Requirements */}
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                                <Shield className="w-3 h-3 inline mr-1" />Prerequis
                              </p>
                              <ul className="flex flex-col gap-1">
                                {p.requirements.map((r) => (
                                  <li key={r} className="text-xs flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
                                    <Shield className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                                    {r}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Onboarding steps */}
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: p.color }}>
                                <Zap className="w-3 h-3 inline mr-1" />Etapes d&apos;activation
                              </p>
                              <ol className="flex flex-col gap-1.5">
                                {p.onboarding.map((step, i) => (
                                  <li key={step} className="text-xs flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
                                    <span
                                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                                      style={{ background: `${p.color}20`, color: p.color }}
                                    >
                                      {i + 1}
                                    </span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* Payout */}
                            <div className="p-3 rounded-lg" style={{ background: "var(--bg3)" }}>
                              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Methode de paiement</p>
                              <p className="text-xs" style={{ color: "var(--text)" }}>{p.payoutInfo}</p>
                            </div>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ TAB: Comparison ═══ */}
        {activeTab === "comparison" && (
          <div className="fade-up">
            {/* Revenue model matrix */}
            <div className="card-premium p-4 mb-6 gradient-border">
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>Modeles de revenus par plateforme</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ minWidth: 700 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border2)" }}>
                      <th className="text-left py-2 pr-4 font-semibold" style={{ color: "var(--text-muted)" }}>Plateforme</th>
                      <th className="text-center py-2 px-2 font-semibold" style={{ color: "var(--text-muted)" }}>Abo</th>
                      <th className="text-center py-2 px-2 font-semibold" style={{ color: "var(--text-muted)" }}>PPV</th>
                      <th className="text-center py-2 px-2 font-semibold" style={{ color: "var(--text-muted)" }}>Tips</th>
                      <th className="text-center py-2 px-2 font-semibold" style={{ color: "var(--text-muted)" }}>Live</th>
                      <th className="text-center py-2 px-2 font-semibold" style={{ color: "var(--text-muted)" }}>Gifts</th>
                      <th className="text-center py-2 px-2 font-semibold" style={{ color: "var(--text-muted)" }}>Custom</th>
                      <th className="text-center py-2 px-2 font-semibold" style={{ color: "var(--text-muted)" }}>IA Chat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REVENUE_MODELS.map((row) => {
                      const plat = PLATFORMS.find((p) => p.name === row.platform);
                      return (
                        <tr key={row.platform} style={{ borderBottom: "1px solid var(--border2)" }}>
                          <td className="py-2.5 pr-4">
                            <span className="font-semibold" style={{ color: plat?.color }}>{row.platform}</span>
                          </td>
                          {(["sub", "ppv", "tips", "live", "gifts", "custom", "ai"] as const).map((key) => (
                            <td key={key} className="text-center py-2.5 px-2">
                              {row[key]
                                ? <CheckCircle2 className="w-4 h-4 mx-auto" style={{ color: "var(--success)" }} />
                                : <span className="w-4 h-4 mx-auto block rounded-full" style={{ background: "var(--bg3)" }} />
                              }
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Commission comparison */}
            <div className="card-premium p-4 gradient-border">
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>Comparatif des commissions</h3>
              <div className="flex flex-col gap-3">
                {[...PLATFORMS].sort((a, b) => {
                  const getMin = (s: string) => parseInt(s.replace(/[^0-9]/g, "")) || 0;
                  return getMin(a.commission) - getMin(b.commission);
                }).map((p) => {
                  const pct = parseInt(p.commission.replace(/[^0-9]/g, "")) || 0;
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: `${p.color}20`, color: p.color }}
                      >
                        {p.logo}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{p.name}</span>
                          <span className="text-xs font-bold tabular-nums" style={{ color: pct <= 20 ? "var(--success)" : pct <= 30 ? "var(--warning)" : "var(--danger)" }}>
                            {p.commission}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg3)" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background: pct <= 20 ? "var(--success)" : pct <= 30 ? "var(--warning)" : "var(--danger)",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.06)" }}>
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  <strong>Snapchat et Instagram</strong> n&apos;ont pas de commission car il n&apos;y a pas de systeme de paiement integre.
                  Les revenus sont collectes via des outils externes (PayPal, CashApp, Wise).
                  Ces plateformes servent principalement de <strong>canal de conversion</strong> vers les plateformes payantes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: Checklist ═══ */}
        {activeTab === "checklist" && (
          <div className="fade-up">
            <div className="card-premium p-4 gradient-border mb-6">
              <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>Checklist d&apos;onboarding universel</h3>
              <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
                Etapes communes pour activer un nouveau model sur l&apos;ensemble des plateformes.
              </p>

              {["legal", "finance", "materiel", "contenu", "promo"].map((cat) => {
                const items = GLOBAL_CHECKLIST.filter((c) => c.category === cat);
                const catLabels: Record<string, { label: string; color: string; icon: typeof Shield }> = {
                  legal: { label: "Legal & Identite", color: "var(--danger)", icon: Shield },
                  finance: { label: "Finance & Paiements", color: "var(--success)", icon: DollarSign },
                  materiel: { label: "Materiel technique", color: "var(--accent)", icon: Camera },
                  contenu: { label: "Contenu initial", color: "#E040FB", icon: Star },
                  promo: { label: "Promotion & Reseaux", color: "#00AFF0", icon: Globe },
                };
                const cfg = catLabels[cat];
                return (
                  <div key={cat} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <cfg.icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 ml-5">
                      {items.map((item) => (
                        <label key={item.label} className="flex items-center gap-2 text-xs cursor-pointer group" style={{ color: "var(--text-secondary)" }}>
                          <div
                            className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors group-hover:border-current"
                            style={{ borderColor: "var(--border)" }}
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Per-platform onboarding */}
            <div className="card-premium p-4 gradient-border">
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>Onboarding par plateforme</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLATFORMS.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                        style={{ background: `${p.color}20`, color: p.color }}
                      >
                        {p.logo}
                      </div>
                      <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{p.name}</span>
                    </div>
                    <ol className="flex flex-col gap-1 ml-1">
                      {p.onboarding.map((step, i) => (
                        <li key={i} className="text-[11px] flex items-start gap-1.5" style={{ color: "var(--text-muted)" }}>
                          <span className="font-bold shrink-0" style={{ color: p.color }}>{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: Strategy Planner (dynamic per model) ═══ */}
        {activeTab === "strategy" && (
          <div className="fade-up flex flex-col gap-5">

            {/* Header with model + save */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #C9A84C, #E8C76A)" }}>
                  <Target className="w-5 h-5" style={{ color: "#06060B" }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                    Strategie — {modelSlug.toUpperCase()}
                  </h3>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Planificateur temps reel · Derniere maj: {new Date(strategy.updatedAt).toLocaleDateString("fr-BE")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={resetChecklist} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer transition-all hover:opacity-80"
                  style={{ background: "var(--surface)", border: "1px solid var(--border2)", color: "var(--text-muted)" }}>
                  <RotateCcw className="w-3 h-3" /> Reset semaine
                </button>
                <button onClick={saveStrategy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all hover:opacity-80"
                  style={{ background: strategyDirty ? "linear-gradient(135deg, #C9A84C, #E8C76A)" : "var(--surface)", color: strategyDirty ? "#06060B" : "var(--text-muted)", border: strategyDirty ? "none" : "1px solid var(--border2)" }}>
                  <Save className="w-3 h-3" /> {strategyDirty ? "Sauvegarder" : "Sauvegarde"}
                </button>
              </div>
            </div>

            {/* Active platforms toggle */}
            <div className="card-premium p-5 gradient-border">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--accent)" }}>
                Plateformes actives — {modelSlug.toUpperCase()}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLATFORMS.map(p => {
                  const isActive = strategy.activePlatforms.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => togglePlatform(p.id)}
                      className="flex items-center gap-2 p-3 rounded-xl text-xs font-medium cursor-pointer transition-all"
                      style={{
                        background: isActive ? `${p.color}15` : "var(--bg3)",
                        border: `1px solid ${isActive ? `${p.color}40` : "var(--border2)"}`,
                        color: isActive ? p.color : "var(--text-muted)",
                        opacity: isActive ? 1 : 0.5,
                      }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: isActive ? `${p.color}25` : "var(--surface)", color: p.color }}>
                        {p.logo}
                      </div>
                      <div className="text-left">
                        <div className="font-bold">{p.name}</div>
                        <div className="text-[9px] opacity-70">{p.automationLevel}</div>
                      </div>
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Revenue targets */}
            <div className="card-premium p-5 gradient-border">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#C9A84C" }}>
                Objectifs revenus mensuels
              </h4>
              <div className="flex flex-col gap-3">
                {strategy.revenueTargets.filter(r => strategy.activePlatforms.includes(r.platform)).map(r => {
                  const pData = PLATFORMS.find(p => p.id === r.platform);
                  const color = pData?.color || "#666";
                  return (
                    <div key={r.platform} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: `${color}20`, color }}>
                        {pData?.logo || "?"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium" style={{ color: "var(--text)" }}>{pData?.name}</span>
                          <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{r.target.toLocaleString()}€</span>
                        </div>
                        <input type="range" min={0} max={10000} step={100} value={r.target}
                          onChange={e => updateTarget(r.platform, Number(e.target.value))}
                          className="w-full h-1 rounded-full appearance-none cursor-pointer"
                          style={{ background: `linear-gradient(to right, ${color} ${(r.target / 10000) * 100}%, var(--bg3) ${(r.target / 10000) * 100}%)` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="mt-1 p-3 rounded-xl flex items-center justify-between" style={{ background: "rgba(230,51,41,0.08)", border: "1px solid rgba(230,51,41,0.2)" }}>
                  <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>Objectif total</span>
                  <span className="text-lg font-bold shimmer-gold">
                    {strategy.revenueTargets.filter(r => strategy.activePlatforms.includes(r.platform)).reduce((s, r) => s + r.target, 0).toLocaleString()}€
                  </span>
                </div>
              </div>
            </div>

            {/* Weekly checklist */}
            <div className="card-premium p-5 gradient-border">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#A78BFA" }}>
                  Checklist hebdomadaire
                </h4>
                <span className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(167,139,250,0.15)", color: "#A78BFA" }}>
                  {strategy.weeklyChecklist.filter(c => c.done).length}/{strategy.weeklyChecklist.length}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden mb-5" style={{ background: "var(--bg3)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(strategy.weeklyChecklist.filter(c => c.done).length / strategy.weeklyChecklist.length) * 100}%`, background: "linear-gradient(90deg, #A78BFA, #C9A84C)" }} />
              </div>

              {/* Grouped by category */}
              {STRATEGY_CATEGORIES.map(cat => {
                const items = strategy.weeklyChecklist.filter(c => c.category === cat.id);
                if (items.length === 0) return null;
                const doneCount = items.filter(c => c.done).length;
                return (
                  <div key={cat.id} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>
                        {cat.label}
                      </span>
                      <span className="text-[9px] font-medium ml-auto" style={{ color: "var(--text-muted)" }}>
                        {doneCount}/{items.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {items.map(item => (
                        <button key={item.id} onClick={() => toggleCheckItem(item.id)}
                          className="flex items-center gap-2.5 p-2.5 rounded-lg text-left cursor-pointer transition-all hover:opacity-80 w-full"
                          style={{ background: item.done ? `${cat.color}08` : "var(--bg3)", border: `1px solid ${item.done ? `${cat.color}20` : "transparent"}` }}>
                          <div className="w-4.5 h-4.5 rounded-md flex items-center justify-center shrink-0 transition-all"
                            style={{ background: item.done ? cat.color : "var(--surface)", border: `1.5px solid ${item.done ? cat.color : "var(--border2)"}` }}>
                            {item.done && <CheckCircle2 className="w-3 h-3" style={{ color: "#fff" }} />}
                          </div>
                          <span className="text-[11px]" style={{ color: item.done ? "var(--text-muted)" : "var(--text)", textDecoration: item.done ? "line-through" : "none" }}>
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notes */}
            <div className="card-premium p-5 gradient-border">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                Notes strategie — {modelSlug.toUpperCase()}
              </h4>
              <textarea
                value={strategy.notes}
                onChange={e => { setStrategy(prev => ({ ...prev, notes: e.target.value })); setStrategyDirty(true); }}
                placeholder="Notes libres sur la strategie de ce model..."
                className="w-full min-h-[100px] p-3 rounded-lg text-xs outline-none resize-y"
                style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
              />
            </div>

          </div>
        )}
      </div>
    </OsLayout>
  );
}
