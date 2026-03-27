"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Calculator, ChevronDown, ChevronUp, Check, X, Clock, DollarSign,
  Bot, Users, Zap, Shield, TrendingUp, AlertTriangle, Star,
  MessageSquare, Camera, Globe, Smartphone, Monitor, Target,
  BarChart3, Megaphone, CreditCard, Lock, Unlock, Eye,
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";

// ══════════════════════════════════════════════
//  PLATFORM DATABASE — Complete comparison data
// ══════════════════════════════════════════════

interface PlatformData {
  id: string;
  name: string;
  logo: string;
  color: string;
  group: "subscription" | "livecam" | "social";
  groupLabel: string;
  commission: number;
  commissionLabel: string;
  // Revenue model
  hasSubscription: boolean;
  hasPPV: boolean;
  hasTips: boolean;
  hasLive: boolean;
  hasCustom: boolean;
  // Access model
  freeProfile: boolean;
  requiresCreditCard: boolean;
  accessFriction: "low" | "medium" | "high";
  accessFrictionLabel: string;
  // Automation
  aiChat: boolean;
  aiChatDetails: string;
  manyChatIntegration: boolean;
  automationLevel: "full" | "semi" | "manual";
  automationLabel: string;
  chatTimePerDay: string;
  // Time investment
  minHoursPerDay: number;
  maxHoursPerDay: number;
  shootPerWeek: number;
  // Potential
  monthlyMin: number;
  monthlyMax: number;
  // Comparison data
  advantages: string[];
  disadvantages: string[];
  bestFor: string;
  // Ads & promotion
  adsRecommended: boolean;
  adsPlatforms: string[];
  adsMonthlyBudget: string;
  // Unique features
  uniqueFeatures: string[];
}

const PLATFORMS: PlatformData[] = [
  {
    id: "fanvue", name: "Fanvue", logo: "FV", color: "#E040FB",
    group: "subscription", groupLabel: "Abonnements",
    commission: 20, commissionLabel: "20%",
    hasSubscription: true, hasPPV: true, hasTips: true, hasLive: false, hasCustom: true,
    freeProfile: true, requiresCreditCard: false,
    accessFriction: "low", accessFrictionLabel: "Acces libre — pas de CB requise pour s'abonner gratuitement",
    aiChat: true, aiChatDetails: "Agent IA integre — repond automatiquement aux DMs 24/7, vend du PPV, engage les fans",
    manyChatIntegration: false, automationLevel: "full", automationLabel: "Automatique",
    chatTimePerDay: "15-30min (verification IA)",
    minHoursPerDay: 1, maxHoursPerDay: 2, shootPerWeek: 1,
    monthlyMin: 500, monthlyMax: 5000,
    advantages: [
      "Agent IA gere le chat automatiquement — gain de 3-5h/jour",
      "Pas de friction d'acces (pas de CB pour profil gratuit)",
      "Pages abonnes + followers gratuits qui convertissent naturellement",
      "PPV automatise via l'IA — vente passive 24/7",
      "Commission la plus basse (20%)",
      "Interface moderne, analytics detailles",
      "Referral program pour recruter d'autres creatrices",
    ],
    disadvantages: [
      "Audience plus petite qu'OnlyFans",
      "Moins connu — besoin de promo externe",
      "Principalement anglophone",
    ],
    bestFor: "Modeles qui veulent maximiser l'automatisation et minimiser le temps chat",
    adsRecommended: true, adsPlatforms: ["Instagram Ads", "Google Ads"],
    adsMonthlyBudget: "100-500€",
    uniqueFeatures: ["AI Chat Agent 24/7", "Auto-PPV selling", "Free subscriber tier", "Smart analytics", "Mass DM auto"],
  },
  {
    id: "onlyfans", name: "OnlyFans", logo: "OF", color: "#00AFF0",
    group: "subscription", groupLabel: "Abonnements",
    commission: 20, commissionLabel: "20%",
    hasSubscription: true, hasPPV: true, hasTips: true, hasLive: true, hasCustom: true,
    freeProfile: true, requiresCreditCard: false,
    accessFriction: "medium", accessFrictionLabel: "Profil gratuit possible mais tout doit passer par PPV/message",
    aiChat: false, aiChatDetails: "Aucune IA — tout le chat est 100% manuel, tres chronophage",
    manyChatIntegration: false, automationLevel: "manual", automationLabel: "Manuel",
    chatTimePerDay: "3-6h (obligatoire pour convertir)",
    minHoursPerDay: 3, maxHoursPerDay: 6, shootPerWeek: 2,
    monthlyMin: 1000, monthlyMax: 50000,
    advantages: [
      "Plus grande audience du marche — notoriete mondiale",
      "Conversion facile grace a la reputation",
      "Outils PPV et Mass DM puissants",
      "Potentiel de revenus le plus eleve",
      "Communaute tres active et fidele",
    ],
    disadvantages: [
      "ZERO IA — chat 100% manuel = 3-6h/jour minimum",
      "Concurrence enorme — difficile de sortir du lot",
      "Risque eleve de leak de contenu",
      "Burnout frequent a cause du chat constant",
      "Sans chat actif = revenus proches de zero",
    ],
    bestFor: "Modeles avec une large audience existante et du temps pour le chat",
    adsRecommended: true, adsPlatforms: ["Instagram Ads", "Twitter/X Ads"],
    adsMonthlyBudget: "200-1000€",
    uniqueFeatures: ["Massive audience", "PPV Messages", "Mass DM", "Co-streams", "Promo campaigns"],
  },
  {
    id: "mym", name: "MYM", logo: "MY", color: "#FF6B6B",
    group: "subscription", groupLabel: "Abonnements",
    commission: 25, commissionLabel: "25%",
    hasSubscription: true, hasPPV: true, hasTips: true, hasLive: false, hasCustom: true,
    freeProfile: false, requiresCreditCard: true,
    accessFriction: "high", accessFrictionLabel: "CB obligatoire meme pour s'inscrire — frein majeur pour les prospects",
    aiChat: false, aiChatDetails: "Pas d'IA — systeme Push semi-auto envoie le contenu, mais chat reste manuel",
    manyChatIntegration: false, automationLevel: "semi", automationLabel: "Semi-auto (Push)",
    chatTimePerDay: "1-3h",
    minHoursPerDay: 1.5, maxHoursPerDay: 3, shootPerWeek: 2,
    monthlyMin: 500, monthlyMax: 10000,
    advantages: [
      "Systeme Push unique — envoie auto le contenu aux abonnes",
      "Fort en France et Europe francophone",
      "Moins de concurrence",
      "Paiement en EUR direct (pas de conversion)",
    ],
    disadvantages: [
      "CB requise a l'inscription = perd 40-60% des prospects",
      "Commission plus elevee (25%)",
      "Pas d'IA pour le chat",
      "Audience limitee a l'Europe",
      "Croissance plus lente",
    ],
    bestFor: "Modeles avec audience francophone qui veulent le Push automatique",
    adsRecommended: true, adsPlatforms: ["Instagram Ads", "Facebook Ads"],
    adsMonthlyBudget: "100-300€",
    uniqueFeatures: ["Push auto-send", "EUR native", "French community", "Custom media requests"],
  },
  {
    id: "stripchat", name: "Stripchat", logo: "SC", color: "#FF3366",
    group: "livecam", groupLabel: "Livecams",
    commission: 45, commissionLabel: "40-50%",
    hasSubscription: false, hasPPV: false, hasTips: true, hasLive: true, hasCustom: false,
    freeProfile: true, requiresCreditCard: false,
    accessFriction: "low", accessFrictionLabel: "Acces libre — viewers peuvent regarder gratuitement",
    aiChat: false, aiChatDetails: "Pas d'IA — interactions en direct uniquement",
    manyChatIntegration: false, automationLevel: "manual", automationLabel: "Manuel (Live)",
    chatTimePerDay: "En live uniquement",
    minHoursPerDay: 3, maxHoursPerDay: 8, shootPerWeek: 0,
    monthlyMin: 1000, monthlyMax: 20000,
    advantages: [
      "Revenus immediats via tokens en live",
      "Grande audience internationale",
      "Pas besoin de contenu pre-produit",
      "Trafic organique gratuit",
      "Programmes de bonus pour top performers",
    ],
    disadvantages: [
      "Commission TRES elevee (40-50%)",
      "Horaires reguliers obligatoires (3-8h/jour live)",
      "Fatigue physique et mentale du live",
      "Pas de revenus passifs — tu gagnes que quand t'es en live",
      "Materiel technique requis (cam HD, eclairage, internet)",
    ],
    bestFor: "Modeles qui preferent le live a la creation de contenu",
    adsRecommended: false, adsPlatforms: [],
    adsMonthlyBudget: "0€ (trafic organique)",
    uniqueFeatures: ["Live tokens", "Private shows", "VR shows", "Lovense integration", "Fan clubs"],
  },
  {
    id: "eurolive", name: "EuroLive", logo: "EL", color: "#FFB800",
    group: "livecam", groupLabel: "Livecams",
    commission: 50, commissionLabel: "30-70%",
    hasSubscription: false, hasPPV: false, hasTips: true, hasLive: true, hasCustom: false,
    freeProfile: true, requiresCreditCard: false,
    accessFriction: "low", accessFrictionLabel: "Acces libre",
    aiChat: false, aiChatDetails: "Aucune automatisation",
    manyChatIntegration: false, automationLevel: "manual", automationLabel: "Manuel (Live)",
    chatTimePerDay: "En live uniquement",
    minHoursPerDay: 3, maxHoursPerDay: 6, shootPerWeek: 0,
    monthlyMin: 500, monthlyMax: 8000,
    advantages: [
      "Audience europeenne ciblee",
      "Moins de concurrence que Stripchat",
      "Paiement en EUR",
    ],
    disadvantages: [
      "Commission variable (30-70%) — la plus haute du marche",
      "Audience restreinte",
      "Plateforme datee, moins de fonctionnalites",
    ],
    bestFor: "Complement pour modeles deja sur Stripchat, audience EU",
    adsRecommended: false, adsPlatforms: [],
    adsMonthlyBudget: "0€",
    uniqueFeatures: ["EU focus", "Private shows", "Tipping"],
  },
  {
    id: "snapchat", name: "Snapchat", logo: "SN", color: "#FFFC00",
    group: "social", groupLabel: "Reseaux sociaux",
    commission: 0, commissionLabel: "0%",
    hasSubscription: true, hasPPV: true, hasTips: false, hasLive: false, hasCustom: true,
    freeProfile: true, requiresCreditCard: false,
    accessFriction: "low", accessFrictionLabel: "Tout le monde a Snapchat — zero friction",
    aiChat: false, aiChatDetails: "Pas d'IA native. ManyChat peut automatiser les reponses via API",
    manyChatIntegration: true, automationLevel: "semi", automationLabel: "Semi-auto (ManyChat)",
    chatTimePerDay: "2-4h (DMs + stories)",
    minHoursPerDay: 2, maxHoursPerDay: 4, shootPerWeek: 2,
    monthlyMin: 500, monthlyMax: 15000,
    advantages: [
      "0% commission — 100% des revenus pour toi",
      "Contact direct et intime avec les fans",
      "Stories = engagement constant sans effort",
      "ManyChat peut automatiser les reponses",
      "Conversion tres forte (format DM prive)",
    ],
    disadvantages: [
      "Paiement externe necessaire (Wise, PayPal, etc.)",
      "Pas de systeme de paiement integre",
      "Risque de screenshots",
      "Chat manuel chronophage sans ManyChat",
      "Pas de discovery — besoin de promo externe",
    ],
    bestFor: "Funnel de conversion + contact direct. Ideal couple avec Fanvue/OF",
    adsRecommended: true, adsPlatforms: ["Snapchat Ads", "Instagram Ads (cross-promo)"],
    adsMonthlyBudget: "50-300€",
    uniqueFeatures: ["0% commission", "ManyChat automation", "Direct DM conversion", "Stories engagement"],
  },
  {
    id: "instagram", name: "Instagram", logo: "IG", color: "#E1306C",
    group: "social", groupLabel: "Reseaux sociaux",
    commission: 0, commissionLabel: "0%",
    hasSubscription: false, hasPPV: false, hasTips: false, hasLive: true, hasCustom: false,
    freeProfile: true, requiresCreditCard: false,
    accessFriction: "low", accessFrictionLabel: "Tout le monde a Instagram — zero friction",
    aiChat: false, aiChatDetails: "Pas d'IA native. ManyChat automatise les DMs + commentaires + stories",
    manyChatIntegration: true, automationLevel: "semi", automationLabel: "Semi-auto (ManyChat)",
    chatTimePerDay: "1-3h (DMs + reels + stories)",
    minHoursPerDay: 1, maxHoursPerDay: 3, shootPerWeek: 1,
    monthlyMin: 200, monthlyMax: 5000,
    advantages: [
      "Enorme audience de decouverte (Reels, Explore)",
      "ManyChat automatise DMs, commentaires, stories",
      "Funnel de conversion vers Fanvue/OF/Snap",
      "Reels = visibilite virale gratuite",
      "Credibilite et image de marque",
    ],
    disadvantages: [
      "Pas de monetisation directe",
      "Risque de ban pour contenu suggestif",
      "Algorithme imprevisible",
      "Revenus indirects uniquement (redirection)",
    ],
    bestFor: "Funnel de decouverte + branding. Obligatoire pour attirer de nouveaux fans",
    adsRecommended: true, adsPlatforms: ["Instagram Ads", "Facebook Ads (Meta)"],
    adsMonthlyBudget: "100-500€",
    uniqueFeatures: ["ManyChat automation", "Reels viral", "Explore discovery", "Cross-promo", "Brand building"],
  },
];

// ── Group rules & common tasks ──
const GROUP_RULES: Record<string, { tasks: string[]; advantages: string[]; limits: string[]; automations: string[] }> = {
  subscription: {
    tasks: [
      "Publier 3-5 posts/semaine minimum",
      "Repondre aux DMs (IA ou manuel selon plateforme)",
      "Envoyer PPV cible aux abonnes",
      "Shooting photo/video hebdomadaire",
      "Analyser les metriques d'engagement",
    ],
    advantages: [
      "Revenus recurrents (abonnements mensuels)",
      "Ventes passives via PPV",
      "Possibilite d'automatisation (Fanvue IA)",
      "Contenu reutilisable entre plateformes",
    ],
    limits: [
      "Contenu frais requis regulierement",
      "Chat chronophage (sauf Fanvue avec IA)",
      "Competition forte sur OF",
    ],
    automations: [
      "Fanvue: Agent IA chat + PPV auto + Mass DM",
      "OnlyFans: Mass DM seulement (pas d'IA)",
      "MYM: Systeme Push (envoi auto contenu)",
      "Tous: Scheduling posts via outils tiers",
    ],
  },
  livecam: {
    tasks: [
      "Sessions live regulieres (3-8h/jour)",
      "Maintenir un horaire fixe visible",
      "Interagir en direct avec les viewers",
      "Proposer des shows prives",
      "Entretenir le materiel technique",
    ],
    advantages: [
      "Revenus immediats (pas d'attente)",
      "Pas de contenu pre-produit necessaire",
      "Trafic organique gratuit",
      "Pourboires et cadeaux instantanes",
    ],
    limits: [
      "Commission tres elevee (40-70%)",
      "Revenus = 0 quand t'es pas en live",
      "Fatigue physique et mentale",
      "Materiel HD + internet stable obligatoire",
    ],
    automations: [
      "Lovense integration (interaction a distance)",
      "Bots de bienvenue simples",
      "Pas d'automatisation IA significative",
    ],
  },
  social: {
    tasks: [
      "Publier Reels/Stories quotidiennement",
      "Repondre aux DMs (ManyChat ou manuel)",
      "Rediriger vers les plateformes payantes",
      "Creer du contenu teasing SFW",
      "Collaborer et cross-promo avec d'autres creatrices",
    ],
    advantages: [
      "0% commission — 100% des revenus",
      "Enorme audience de decouverte",
      "ManyChat automatise les DMs",
      "Visibilite virale via Reels/Stories",
    ],
    limits: [
      "Pas de monetisation directe",
      "Risque de ban pour contenu suggestif",
      "Paiement externe necessaire",
      "Algorithmes imprevisibles",
    ],
    automations: [
      "ManyChat: Auto-reply DMs, commentaires, stories",
      "ManyChat: Funnel de conversion automatise",
      "ManyChat: Envoi de liens automatique",
      "Chatbot IA via API (custom, avance)",
    ],
  },
};

// ── Ads data ──
const ADS_OPTIONS = [
  { id: "instagram", label: "Instagram Ads (Meta)", color: "#E1306C", minBudget: 100, maxBudget: 500, cpc: "0.20-0.80€", reach: "1K-10K clics/mois", bestFor: "Visibilite, followers, redirect vers profil" },
  { id: "facebook", label: "Facebook Ads (Meta)", color: "#1877F2", minBudget: 100, maxBudget: 500, cpc: "0.15-0.60€", reach: "2K-15K clics/mois", bestFor: "Retargeting, lookalike audiences, conversion" },
  { id: "google", label: "Google Ads", color: "#4285F4", minBudget: 150, maxBudget: 800, cpc: "0.30-1.50€", reach: "500-5K clics/mois", bestFor: "Recherche intentionnelle, brand protection" },
  { id: "snapchat", label: "Snapchat Ads", color: "#FFFC00", minBudget: 50, maxBudget: 300, cpc: "0.10-0.40€", reach: "3K-20K impressions/mois", bestFor: "Audience jeune, story ads, swipe-up" },
  { id: "tiktok", label: "TikTok Ads", color: "#00F2EA", minBudget: 100, maxBudget: 500, cpc: "0.10-0.50€", reach: "5K-50K vues/mois", bestFor: "Viralite, audience Gen Z, brand awareness" },
];

// ── Strategy state types ──
type PlatformStatus = "active" | "planned" | "off";

interface StrategyState {
  platforms: Record<string, PlatformStatus>;
  ads: string[];
  adsBudgets: Record<string, number>;
  hoursPerDay: number;
  updatedAt: string;
}

const STORAGE_KEY = "heaven_strategy";

function loadStrategy(): StrategyState {
  if (typeof window === "undefined") return defaultStrategy();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return defaultStrategy();
}

function defaultStrategy(): StrategyState {
  return {
    platforms: { fanvue: "active", snapchat: "active" },
    ads: [],
    adsBudgets: {},
    hoursPerDay: 4,
    updatedAt: new Date().toISOString(),
  };
}

function saveStrategy(state: StrategyState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
}

// ══════════ COMPONENT ══════════

export default function SimulateurPage() {
  const [strategy, setStrategy] = useState<StrategyState>(loadStrategy);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<StrategyState>(strategy);

  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "platforms" | "compare" | "time" | "ads">("overview");

  // Current view: use strategy; edit view: use draft
  const current = editMode ? draft : strategy;

  const getStatus = useCallback((id: string): PlatformStatus => current.platforms[id] || "off", [current]);

  const cyclePlatformStatus = useCallback((id: string) => {
    if (!editMode) return;
    setDraft(prev => {
      const cur = prev.platforms[id] || "off";
      const next: PlatformStatus = cur === "off" ? "planned" : cur === "planned" ? "active" : "off";
      return { ...prev, platforms: { ...prev.platforms, [id]: next } };
    });
  }, [editMode]);

  const setDraftPlatformStatus = useCallback((id: string, status: PlatformStatus) => {
    setDraft(prev => ({ ...prev, platforms: { ...prev.platforms, [id]: status } }));
  }, []);

  const toggleDraftAd = useCallback((id: string) => {
    setDraft(prev => ({
      ...prev,
      ads: prev.ads.includes(id) ? prev.ads.filter(a => a !== id) : [...prev.ads, id],
    }));
  }, []);

  const setDraftAdBudget = useCallback((id: string, val: number) => {
    setDraft(prev => ({ ...prev, adsBudgets: { ...prev.adsBudgets, [id]: val } }));
  }, []);

  const setDraftHours = useCallback((h: number) => {
    setDraft(prev => ({ ...prev, hoursPerDay: h }));
  }, []);

  const handleSave = useCallback(() => {
    saveStrategy(draft);
    setStrategy(draft);
    setEditMode(false);
  }, [draft]);

  const handleCancel = useCallback(() => {
    setDraft(strategy);
    setEditMode(false);
  }, [strategy]);

  const handleStartEdit = useCallback(() => {
    setDraft(strategy);
    setEditMode(true);
    setTab("platforms");
  }, [strategy]);

  // Computed — based on "current" (either saved strategy or draft)
  const activePlatforms = useMemo(() =>
    PLATFORMS.filter(p => (current.platforms[p.id] === "active" || current.platforms[p.id] === "planned")),
    [current]
  );
  const activeOnly = useMemo(() => PLATFORMS.filter(p => current.platforms[p.id] === "active"), [current]);
  const plannedOnly = useMemo(() => PLATFORMS.filter(p => current.platforms[p.id] === "planned"), [current]);

  const totalMinRevenue = useMemo(() => activeOnly.reduce((s, p) => s + p.monthlyMin, 0), [activeOnly]);
  const totalMaxRevenue = useMemo(() => activeOnly.reduce((s, p) => s + p.monthlyMax, 0), [activeOnly]);
  const projectedMinRevenue = useMemo(() => activePlatforms.reduce((s, p) => s + p.monthlyMin, 0), [activePlatforms]);
  const projectedMaxRevenue = useMemo(() => activePlatforms.reduce((s, p) => s + p.monthlyMax, 0), [activePlatforms]);
  const totalMinHours = useMemo(() => activePlatforms.reduce((s, p) => s + p.minHoursPerDay, 0), [activePlatforms]);
  const totalMaxHours = useMemo(() => activePlatforms.reduce((s, p) => s + p.maxHoursPerDay, 0), [activePlatforms]);
  const totalShoots = useMemo(() => activePlatforms.reduce((s, p) => s + p.shootPerWeek, 0), [activePlatforms]);
  const avgCommission = useMemo(() => {
    if (activePlatforms.length === 0) return 0;
    return Math.round(activePlatforms.reduce((s, p) => s + p.commission, 0) / activePlatforms.length);
  }, [activePlatforms]);
  const totalAdsBudget = useMemo(() => Object.values(current.adsBudgets).reduce((s, v) => s + v, 0), [current]);

  const hasFullAI = activePlatforms.some(p => p.automationLevel === "full");
  const hasManyChat = activePlatforms.some(p => p.manyChatIntegration);

  // Status colors/labels
  const STATUS_META: Record<PlatformStatus, { color: string; label: string; bg: string }> = {
    active: { color: "#10B981", label: "Actif", bg: "rgba(16,185,129,0.1)" },
    planned: { color: "#F59E0B", label: "A activer", bg: "rgba(245,158,11,0.1)" },
    off: { color: "var(--text-muted)", label: "Inactif", bg: "rgba(255,255,255,0.03)" },
  };

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-28 md:pb-8">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3 fade-up">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #E040FB, #7C3AED)", boxShadow: "0 0 20px rgba(224,64,251,0.2)" }}>
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>
                {editMode ? "Modifier Strategie" : "Strategie Actuelle"}
              </h1>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {editMode ? "Selectionne les plateformes actives et celles a activer" : `${activeOnly.length} active${activeOnly.length > 1 ? "s" : ""} · ${plannedOnly.length} a activer · MAJ ${new Date(strategy.updatedAt).toLocaleDateString("fr-FR")}`}
              </p>
            </div>
            {editMode ? (
              <div className="flex gap-2">
                <button onClick={handleCancel}
                  className="px-3 py-2 rounded-xl text-[11px] font-semibold cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                  style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid var(--border2)" }}>
                  Annuler
                </button>
                <button onClick={handleSave}
                  className="px-4 py-2 rounded-xl text-[11px] font-bold cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                  style={{ background: "var(--accent)", color: "#fff" }}>
                  Sauvegarder
                </button>
              </div>
            ) : (
              <button onClick={handleStartEdit}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                style={{ background: "rgba(224,64,251,0.1)", color: "#E040FB", border: "1px solid rgba(224,64,251,0.2)" }}>
                <Calculator className="w-3.5 h-3.5" />
                Modifier
              </button>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 fade-up">
            {[
              { label: "Revenu actuel", value: `${totalMinRevenue.toLocaleString()}-${totalMaxRevenue.toLocaleString()}€`, color: "var(--success)", icon: DollarSign, sub: plannedOnly.length > 0 ? `+${(projectedMinRevenue - totalMinRevenue).toLocaleString()}€ projete` : undefined },
              { label: "Temps/jour", value: `${totalMinHours}-${totalMaxHours}h`, color: totalMaxHours > current.hoursPerDay ? "#EF4444" : "#10B981", icon: Clock },
              { label: "Shoots/semaine", value: `${totalShoots}`, color: "#F59E0B", icon: Camera },
              { label: "Commission moy.", value: `${avgCommission}%`, color: avgCommission > 25 ? "#EF4444" : "#10B981", icon: BarChart3 },
            ].map(card => (
              <div key={card.label} className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <card.icon className="w-3 h-3" style={{ color: card.color }} />
                  <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{card.label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: card.color }}>{card.value}</span>
                {card.sub && <p className="text-[8px] mt-0.5" style={{ color: "#F59E0B" }}>{card.sub}</p>}
              </div>
            ))}
          </div>

          {/* Active / Planned platform pills */}
          <div className="flex gap-2 flex-wrap fade-up">
            {activeOnly.map(p => (
              <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                style={{ background: `${p.color}15`, color: p.color, border: `1px solid ${p.color}25` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
                {p.name}
              </div>
            ))}
            {plannedOnly.map(p => (
              <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                style={{ background: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "1px dashed rgba(245,158,11,0.3)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#F59E0B" }} />
                {p.name} (a activer)
              </div>
            ))}
            {(hasFullAI || hasManyChat) && (
              <>
                {hasFullAI && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                    style={{ background: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <Bot className="w-3 h-3" /> IA 24/7
                  </div>
                )}
                {hasManyChat && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                    style={{ background: "rgba(96,165,250,0.08)", color: "#60A5FA", border: "1px solid rgba(96,165,250,0.2)" }}>
                    <Zap className="w-3 h-3" /> ManyChat
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 p-0.5 rounded-xl fade-up" style={{ background: "var(--bg2)" }}>
            {([
              { id: "overview" as const, label: "Vue d'ensemble", icon: Target },
              { id: "platforms" as const, label: "Plateformes", icon: Globe },
              { id: "compare" as const, label: "Comparer", icon: BarChart3 },
              { id: "time" as const, label: "Temps & IA", icon: Clock },
              { id: "ads" as const, label: "Pub", icon: Megaphone },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold cursor-pointer transition-all"
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

          {/* ═══ OVERVIEW TAB ═══ */}
          {tab === "overview" && (
            <div className="space-y-4 fade-up">
              {/* Current strategy summary */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>Configuration actuelle</h3>
                {activeOnly.length === 0 && plannedOnly.length === 0 ? (
                  <div className="text-center py-6">
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
                    <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Aucune plateforme configuree</p>
                    <button onClick={handleStartEdit}
                      className="text-[11px] font-semibold cursor-pointer hover:opacity-80"
                      style={{ color: "#E040FB", background: "none", border: "none" }}>
                      Configurer ma strategie
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Active platforms */}
                    {activeOnly.length > 0 && (
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#10B981" }}>
                          Plateformes actives ({activeOnly.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {activeOnly.map(p => (
                            <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                              style={{ background: `${p.color}06`, border: `1px solid ${p.color}20` }}>
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black"
                                style={{ background: p.color, color: "#fff" }}>{p.logo}</div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[11px] font-bold block" style={{ color: "var(--text)" }}>{p.name}</span>
                                <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                                  {p.monthlyMin.toLocaleString()}-{p.monthlyMax.toLocaleString()}€ · {p.chatTimePerDay}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {p.aiChat && <Bot className="w-3 h-3" style={{ color: "#10B981" }} />}
                                {p.manyChatIntegration && <Zap className="w-3 h-3" style={{ color: "#60A5FA" }} />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Planned platforms */}
                    {plannedOnly.length > 0 && (
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#F59E0B" }}>
                          A activer prochainement ({plannedOnly.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {plannedOnly.map(p => (
                            <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                              style={{ background: "rgba(245,158,11,0.04)", border: "1px dashed rgba(245,158,11,0.2)" }}>
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black"
                                style={{ background: "var(--bg2)", color: "#F59E0B" }}>{p.logo}</div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[11px] font-bold block" style={{ color: "var(--text-secondary)" }}>{p.name}</span>
                                <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                                  +{p.monthlyMin.toLocaleString()}-{p.monthlyMax.toLocaleString()}€ potentiel
                                </span>
                              </div>
                              <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-md"
                                style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>Planifie</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Revenue projection */}
                    {plannedOnly.length > 0 && (
                      <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.04), rgba(245,158,11,0.04))", border: "1px solid rgba(16,185,129,0.1)" }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Revenus actuels</span>
                            <p className="text-sm font-bold" style={{ color: "var(--success)" }}>{totalMinRevenue.toLocaleString()}-{totalMaxRevenue.toLocaleString()}€/mois</p>
                          </div>
                          <TrendingUp className="w-5 h-5 mx-3" style={{ color: "#F59E0B" }} />
                          <div className="text-right">
                            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Projete (avec planifies)</span>
                            <p className="text-sm font-bold" style={{ color: "#F59E0B" }}>{projectedMinRevenue.toLocaleString()}-{projectedMaxRevenue.toLocaleString()}€/mois</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick edit button */}
              {!editMode && (
                <button onClick={handleStartEdit}
                  className="w-full py-3 rounded-xl text-xs font-bold cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform"
                  style={{ background: "rgba(224,64,251,0.08)", color: "#E040FB", border: "1px solid rgba(224,64,251,0.15)" }}>
                  Modifier ma strategie
                </button>
              )}
            </div>
          )}

          {/* ═══ PLATFORMS TAB ═══ */}
          {tab === "platforms" && (
            <div className="space-y-4 fade-up">
              {(["subscription", "livecam", "social"] as const).map(groupId => {
                const groupPlatforms = PLATFORMS.filter(p => p.group === groupId);
                const groupLabel = groupPlatforms[0]?.groupLabel || groupId;
                const rules = GROUP_RULES[groupId];
                const isGroupExpanded = expandedGroup === groupId;

                return (
                  <div key={groupId}>
                    {/* Group header */}
                    <button onClick={() => setExpandedGroup(isGroupExpanded ? null : groupId)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl mb-2 cursor-pointer transition-all hover:scale-[1.005]"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{groupLabel}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                          {groupPlatforms.filter(p => getStatus(p.id) !== "off").length}/{groupPlatforms.length} actif
                        </span>
                        {isGroupExpanded ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
                      </div>
                    </button>

                    {/* Group rules */}
                    {isGroupExpanded && rules && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 px-1">
                        <div className="rounded-xl p-3" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}>
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#10B981" }}>Avantages communs</span>
                          <ul className="mt-1.5 space-y-1">
                            {rules.advantages.map((a, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                                <Check className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#10B981" }} /> {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#EF4444" }}>Limites</span>
                          <ul className="mt-1.5 space-y-1">
                            {rules.limits.map((l, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#EF4444" }} /> {l}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.1)" }}>
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#60A5FA" }}>Automatisations IA</span>
                          <ul className="mt-1.5 space-y-1">
                            {rules.automations.map((a, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                                <Bot className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#60A5FA" }} /> {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.1)" }}>
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#F59E0B" }}>Taches communes</span>
                          <ul className="mt-1.5 space-y-1">
                            {rules.tasks.map((t, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                                <Target className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#F59E0B" }} /> {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Platform cards */}
                    <div className="space-y-2">
                      {groupPlatforms.map(p => {
                        const status = getStatus(p.id);
                        const meta = STATUS_META[status];
                        const isOn = status !== "off";
                        const isExpanded = expandedPlatform === p.id;

                        return (
                          <div key={p.id} className="rounded-xl overflow-hidden transition-all"
                            style={{ background: "var(--surface)", border: `1px solid ${isOn ? `${p.color}30` : "var(--border)"}`, opacity: status === "off" ? 0.6 : 1 }}>
                            {/* Platform header */}
                            <div className="flex items-center gap-3 px-4 py-3">
                              {/* Logo + status toggle */}
                              <div className="relative shrink-0">
                                <button onClick={() => cyclePlatformStatus(p.id)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black cursor-pointer transition-all hover:scale-110"
                                  style={{
                                    background: status === "active" ? p.color : status === "planned" ? "var(--bg2)" : "var(--bg2)",
                                    color: status === "active" ? "#fff" : status === "planned" ? p.color : "var(--text-muted)",
                                    boxShadow: status === "active" ? `0 0 12px ${p.color}40` : "none",
                                    border: status === "planned" ? `2px dashed ${p.color}50` : "none",
                                  }}>
                                  {p.logo}
                                </button>
                                {status !== "off" && (
                                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 flex items-center justify-center"
                                    style={{ borderColor: "var(--surface)", background: meta.color }}>
                                    {status === "active" && <Check className="w-2 h-2 text-white" />}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold" style={{ color: isOn ? "var(--text)" : "var(--text-muted)" }}>{p.name}</span>
                                  {/* Status label in edit mode */}
                                  {editMode && (
                                    <div className="flex gap-0.5">
                                      {(["active", "planned", "off"] as PlatformStatus[]).map(s => (
                                        <button key={s} onClick={() => setDraftPlatformStatus(p.id, s)}
                                          className="text-[7px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all"
                                          style={{
                                            background: status === s ? STATUS_META[s].bg : "transparent",
                                            color: status === s ? STATUS_META[s].color : "var(--text-muted)",
                                            border: `1px solid ${status === s ? STATUS_META[s].color + "30" : "transparent"}`,
                                          }}>
                                          {STATUS_META[s].label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {!editMode && status !== "off" && (
                                    <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                                  )}
                                  <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: `${p.color}15`, color: p.color }}>{p.commissionLabel}</span>
                                  {p.aiChat && <Bot className="w-3 h-3" style={{ color: "#10B981" }} />}
                                  {p.manyChatIntegration && <Zap className="w-3 h-3" style={{ color: "#60A5FA" }} />}
                                  {p.requiresCreditCard && <CreditCard className="w-3 h-3" style={{ color: "#EF4444" }} />}
                                </div>
                                <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                                  {p.monthlyMin.toLocaleString()}-{p.monthlyMax.toLocaleString()}€/mois · {p.chatTimePerDay}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-md hidden sm:inline"
                                  style={{
                                    background: p.accessFriction === "low" ? "rgba(16,185,129,0.1)" : p.accessFriction === "medium" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                                    color: p.accessFriction === "low" ? "#10B981" : p.accessFriction === "medium" ? "#F59E0B" : "#EF4444",
                                  }}>
                                  {p.accessFriction === "low" ? "Acces libre" : p.accessFriction === "medium" ? "Friction moyenne" : "CB requise"}
                                </span>
                                <button onClick={() => setExpandedPlatform(isExpanded ? null : p.id)} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                                {/* Access model */}
                                <div className="pt-3">
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    {p.requiresCreditCard ? <Lock className="w-3 h-3" style={{ color: "#EF4444" }} /> : <Unlock className="w-3 h-3" style={{ color: "#10B981" }} />}
                                    <span className="text-[10px] font-bold" style={{ color: "var(--text)" }}>Modele d'acces</span>
                                  </div>
                                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{p.accessFrictionLabel}</p>
                                </div>

                                {/* AI & Automation */}
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <Bot className="w-3 h-3" style={{ color: p.aiChat ? "#10B981" : "var(--text-muted)" }} />
                                    <span className="text-[10px] font-bold" style={{ color: "var(--text)" }}>Automatisation & IA</span>
                                    <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-md"
                                      style={{
                                        background: p.automationLevel === "full" ? "rgba(16,185,129,0.1)" : p.automationLevel === "semi" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                                        color: p.automationLevel === "full" ? "#10B981" : p.automationLevel === "semi" ? "#F59E0B" : "#EF4444",
                                      }}>
                                      {p.automationLabel}
                                    </span>
                                  </div>
                                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{p.aiChatDetails}</p>
                                </div>

                                {/* Advantages vs Disadvantages */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#10B981" }}>Avantages</span>
                                    <ul className="mt-1 space-y-1">
                                      {p.advantages.map((a, i) => (
                                        <li key={i} className="flex items-start gap-1 text-[9px]" style={{ color: "var(--text-secondary)" }}>
                                          <Check className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: "#10B981" }} /> {a}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#EF4444" }}>Inconvenients</span>
                                    <ul className="mt-1 space-y-1">
                                      {p.disadvantages.map((d, i) => (
                                        <li key={i} className="flex items-start gap-1 text-[9px]" style={{ color: "var(--text-secondary)" }}>
                                          <X className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: "#EF4444" }} /> {d}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>

                                {/* Unique features */}
                                <div className="flex flex-wrap gap-1.5">
                                  {p.uniqueFeatures.map((f, i) => (
                                    <span key={i} className="text-[8px] font-medium px-2 py-1 rounded-lg" style={{ background: `${p.color}10`, color: p.color, border: `1px solid ${p.color}20` }}>
                                      {f}
                                    </span>
                                  ))}
                                </div>

                                {/* Best for */}
                                <div className="rounded-lg p-2.5" style={{ background: `${p.color}08`, border: `1px solid ${p.color}15` }}>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Star className="w-3 h-3" style={{ color: p.color }} />
                                    <span className="text-[9px] font-bold" style={{ color: p.color }}>Ideal pour</span>
                                  </div>
                                  <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{p.bestFor}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ COMPARE TAB ═══ */}
          {tab === "compare" && (
            <div className="space-y-4 fade-up">
              {/* Feature comparison matrix */}
              <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>Matrice de comparaison</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]" style={{ minWidth: 600 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--text-muted)" }}>Critere</th>
                        {activePlatforms.map(p => (
                          <th key={p.id} className="text-center px-2 py-2 font-bold" style={{ color: p.color }}>{p.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Commission", key: "commissionLabel" as const },
                        { label: "Abonnement", key: "hasSubscription" as const },
                        { label: "PPV", key: "hasPPV" as const },
                        { label: "Tips/Pourboires", key: "hasTips" as const },
                        { label: "Live", key: "hasLive" as const },
                        { label: "Custom requests", key: "hasCustom" as const },
                        { label: "IA Chat", key: "aiChat" as const },
                        { label: "ManyChat", key: "manyChatIntegration" as const },
                        { label: "Profil gratuit", key: "freeProfile" as const },
                        { label: "CB requise", key: "requiresCreditCard" as const },
                      ].map(row => (
                        <tr key={row.key} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className="px-3 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>{row.label}</td>
                          {activePlatforms.map(p => {
                            const val = p[row.key];
                            return (
                              <td key={p.id} className="text-center px-2 py-2">
                                {typeof val === "boolean" ? (
                                  val ? (
                                    <Check className="w-3.5 h-3.5 mx-auto" style={{ color: row.key === "requiresCreditCard" ? "#EF4444" : "#10B981" }} />
                                  ) : (
                                    <X className="w-3.5 h-3.5 mx-auto" style={{ color: row.key === "requiresCreditCard" ? "#10B981" : "var(--text-muted)", opacity: 0.3 }} />
                                  )
                                ) : (
                                  <span style={{ color: "var(--text)" }}>{val}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="px-3 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>Revenu potentiel</td>
                        {activePlatforms.map(p => (
                          <td key={p.id} className="text-center px-2 py-2 font-semibold" style={{ color: "var(--success)" }}>
                            {p.monthlyMin.toLocaleString()}-{p.monthlyMax.toLocaleString()}€
                          </td>
                        ))}
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="px-3 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>Temps chat/jour</td>
                        {activePlatforms.map(p => (
                          <td key={p.id} className="text-center px-2 py-2" style={{ color: p.minHoursPerDay >= 3 ? "#EF4444" : "#10B981" }}>
                            {p.chatTimePerDay}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>Friction d'acces</td>
                        {activePlatforms.map(p => (
                          <td key={p.id} className="text-center px-2 py-2">
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
                              style={{
                                background: p.accessFriction === "low" ? "rgba(16,185,129,0.1)" : p.accessFriction === "medium" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                                color: p.accessFriction === "low" ? "#10B981" : p.accessFriction === "medium" ? "#F59E0B" : "#EF4444",
                              }}>
                              {p.accessFriction === "low" ? "Libre" : p.accessFriction === "medium" ? "Moyen" : "Eleve"}
                            </span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fanvue vs OnlyFans vs MYM highlight */}
              <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(224,64,251,0.06), rgba(0,175,240,0.06))", border: "1px solid rgba(224,64,251,0.15)" }}>
                <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Eye className="w-4 h-4" style={{ color: "#E040FB" }} />
                  Pourquoi Fanvue resout les problemes des autres
                </h3>
                <div className="space-y-2">
                  {[
                    { problem: "OnlyFans: Chat 100% manuel = 3-6h/jour de DMs", solution: "Fanvue: Agent IA repond, vend du PPV, engage les fans 24/7", icon: Bot, problemColor: "#EF4444", solutionColor: "#10B981" },
                    { problem: "MYM: CB requise a l'inscription = 40-60% de prospects perdus", solution: "Fanvue: Profil gratuit accessible sans CB — conversion naturelle", icon: CreditCard, problemColor: "#EF4444", solutionColor: "#10B981" },
                    { problem: "OnlyFans: Profil gratuit = tout passe par PPV sans IA", solution: "Fanvue: Tier gratuit + IA qui pousse le PPV automatiquement", icon: Zap, problemColor: "#EF4444", solutionColor: "#10B981" },
                    { problem: "Toutes: Pas de pages followers/abonnes distinctes", solution: "Fanvue: Systeme followers gratuits qui se convertissent en abonnes payants", icon: Users, problemColor: "#EF4444", solutionColor: "#10B981" },
                  ].map((item, i) => (
                    <div key={i} className="rounded-lg p-2.5" style={{ background: "var(--surface)" }}>
                      <div className="flex items-start gap-2 mb-1">
                        <X className="w-3 h-3 shrink-0 mt-0.5" style={{ color: item.problemColor }} />
                        <span className="text-[10px]" style={{ color: item.problemColor }}>{item.problem}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-3 h-3 shrink-0 mt-0.5" style={{ color: item.solutionColor }} />
                        <span className="text-[10px] font-medium" style={{ color: item.solutionColor }}>{item.solution}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ TIME & AI TAB ═══ */}
          {tab === "time" && (
            <div className="space-y-4 fade-up">
              {/* Hours budget */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
                  Budget temps quotidien
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <input type="range" min={1} max={12} value={current.hoursPerDay} onChange={e => editMode ? setDraftHours(Number(e.target.value)) : undefined} disabled={!editMode}
                    className="flex-1 accent-[var(--accent)]" style={{ accentColor: "var(--accent)" }} />
                  <span className="text-sm font-bold w-10 text-right" style={{ color: "var(--text)" }}>{current.hoursPerDay}h</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg2)" }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min((totalMaxHours / current.hoursPerDay) * 100, 100)}%`,
                      background: totalMaxHours > current.hoursPerDay ? "linear-gradient(90deg, #10B981, #EF4444)" : "#10B981",
                    }} />
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: totalMaxHours > current.hoursPerDay ? "#EF4444" : "#10B981" }}>
                    {totalMaxHours > current.hoursPerDay ? `Depasse de ${totalMaxHours - current.hoursPerDay}h` : `${current.hoursPerDay - totalMaxHours}h libre`}
                  </span>
                </div>
              </div>

              {/* Per-platform time breakdown */}
              <div className="space-y-2">
                {activePlatforms.map(p => (
                  <div key={p.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0"
                      style={{ background: p.color, color: "#fff" }}>{p.logo}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{p.name}</span>
                        <span className="text-[10px] font-semibold" style={{ color: p.maxHoursPerDay >= 4 ? "#EF4444" : "var(--text-secondary)" }}>
                          {p.minHoursPerDay}-{p.maxHoursPerDay}h/jour
                        </span>
                      </div>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--bg2)" }}>
                        <div className="h-full rounded-full" style={{ width: `${(p.maxHoursPerDay / 12) * 100}%`, background: p.color }} />
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[9px]" style={{ color: "var(--text-muted)" }}>
                        <span>Chat: {p.chatTimePerDay}</span>
                        <span>Shoots: {p.shootPerWeek}/sem</span>
                        <span className="font-semibold" style={{ color: p.automationLevel === "full" ? "#10B981" : p.automationLevel === "semi" ? "#F59E0B" : "#EF4444" }}>
                          {p.automationLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Automation comparison */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Bot className="w-4 h-4" style={{ color: "#10B981" }} />
                  Automatisations disponibles
                </h3>
                <div className="space-y-2">
                  {[
                    { tool: "Agent IA Fanvue", desc: "Chat automatique 24/7, vente PPV, engagement fans — inclus gratuitement dans Fanvue", platforms: ["fanvue"], type: "Inclus", color: "#10B981" },
                    { tool: "ManyChat (Snap/Insta)", desc: "Auto-reply DMs, funnels de conversion, envoi de liens automatique, chatbot reponses", platforms: ["snapchat", "instagram"], type: "Externe ~29€/mois", color: "#60A5FA" },
                    { tool: "Push MYM", desc: "Envoi automatique de contenu aux abonnes — semi-automatisation integree", platforms: ["mym"], type: "Inclus", color: "#FF6B6B" },
                    { tool: "Agent IA custom (API)", desc: "Chatbot IA avance via API — peut s'integrer a Snap/Insta/site. Setup requis", platforms: ["snapchat", "instagram"], type: "Custom 50-200€/mois", color: "#7C3AED" },
                    { tool: "Lovense (Livecam)", desc: "Interaction a distance avec viewers — automatise les reactions physiques en live", platforms: ["stripchat", "eurolive"], type: "Hardware ~100€", color: "#FF3366" },
                  ].map((item, i) => {
                    const relevant = item.platforms.some(pid => getStatus(pid) !== "off");
                    return (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg transition-all"
                        style={{ background: relevant ? `${item.color}06` : "transparent", opacity: relevant ? 1 : 0.4, border: `1px solid ${relevant ? `${item.color}15` : "transparent"}` }}>
                        <Bot className="w-4 h-4 shrink-0 mt-0.5" style={{ color: item.color }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold" style={{ color: "var(--text)" }}>{item.tool}</span>
                            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${item.color}15`, color: item.color }}>{item.type}</span>
                          </div>
                          <p className="text-[9px]" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Time savings with AI */}
              <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(96,165,250,0.06))", border: "1px solid rgba(16,185,129,0.15)" }}>
                <h3 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: "#10B981" }}>
                  <Zap className="w-4 h-4" /> Gain de temps avec l'IA
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.06)" }}>
                    <span className="text-lg font-black" style={{ color: "#EF4444" }}>{totalMaxHours}h</span>
                    <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Sans IA (tout manuel)</p>
                  </div>
                  <div className="text-center p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.06)" }}>
                    <span className="text-lg font-black" style={{ color: "#10B981" }}>
                      {Math.max(1, Math.round(totalMaxHours * (hasFullAI ? 0.35 : hasManyChat ? 0.6 : 0.85)))}h
                    </span>
                    <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Avec IA{hasFullAI ? " (Fanvue)" : ""}{hasManyChat ? " + ManyChat" : ""}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ADS TAB ═══ */}
          {tab === "ads" && (
            <div className="space-y-4 fade-up">
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-bold mb-1 flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Megaphone className="w-4 h-4" style={{ color: "#E040FB" }} />
                  Budget publicitaire
                </h3>
                <p className="text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>
                  Selectionne les plateformes ads et ajuste le budget pour estimer la portee.
                </p>
                <div className="space-y-2">
                  {ADS_OPTIONS.map(ad => {
                    const isSelected = current.ads.includes(ad.id);
                    const budget = current.adsBudgets[ad.id] || ad.minBudget;
                    return (
                      <div key={ad.id} className="rounded-xl overflow-hidden transition-all"
                        style={{ background: isSelected ? `${ad.color}06` : "transparent", border: `1px solid ${isSelected ? `${ad.color}20` : "var(--border)"}` }}>
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <button onClick={() => editMode && toggleDraftAd(ad.id)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition-all"
                            style={{ background: isSelected ? ad.color : "var(--bg2)", color: isSelected ? "#fff" : "var(--text-muted)" }}>
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <Megaphone className="w-3 h-3" />}
                          </button>
                          <div className="flex-1">
                            <span className="text-[11px] font-bold" style={{ color: isSelected ? "var(--text)" : "var(--text-muted)" }}>{ad.label}</span>
                            <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>CPC: {ad.cpc} · {ad.bestFor}</p>
                          </div>
                          <span className="text-[10px] font-semibold" style={{ color: ad.color }}>{ad.minBudget}-{ad.maxBudget}€/mois</span>
                        </div>
                        {isSelected && (
                          <div className="px-3 pb-3">
                            <div className="flex items-center gap-2">
                              <input type="range" min={ad.minBudget} max={ad.maxBudget} step={25} value={budget}
                                onChange={e => editMode && setDraftAdBudget(ad.id, Number(e.target.value))} disabled={!editMode}
                                className="flex-1" style={{ accentColor: ad.color }} />
                              <span className="text-xs font-bold w-12 text-right" style={{ color: ad.color }}>{budget}€</span>
                            </div>
                            <p className="text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>Portee estimee: {ad.reach}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total ads budget */}
              {current.ads.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(224,64,251,0.06), rgba(245,158,11,0.06))", border: "1px solid rgba(224,64,251,0.15)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Budget total Ads</span>
                    <span className="text-sm font-black" style={{ color: "#E040FB" }}>{totalAdsBudget}€/mois</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Revenu potentiel (apres ads)</span>
                    <span className="text-xs font-bold" style={{ color: "var(--success)" }}>
                      {Math.max(0, totalMinRevenue - totalAdsBudget).toLocaleString()}-{(totalMaxRevenue - totalAdsBudget).toLocaleString()}€ net
                    </span>
                  </div>
                  <div className="mt-2 rounded-lg p-2" style={{ background: "var(--surface)" }}>
                    <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                      ROI estime: pour chaque 1€ investi en ads, tu devrais generer {Math.round(totalMaxRevenue / Math.max(totalAdsBudget, 1))}€ de revenus potentiels.
                      Commence petit (50€/mois sur Insta Ads) et scale progressivement.
                    </p>
                  </div>
                </div>
              )}

              {/* Ads strategy recommendations */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>Strategie pub recommandee</h3>
                <div className="space-y-2">
                  {[
                    { phase: "Phase 1 — Decouverte", budget: "50-100€/mois", platforms: "Instagram Reels Ads", desc: "Booster 2-3 Reels SFW par semaine pour attirer des followers. Cibler 18-35 ans, interets mode/lifestyle.", color: "#60A5FA" },
                    { phase: "Phase 2 — Conversion", budget: "100-300€/mois", platforms: "Instagram + Snapchat Ads", desc: "Retargeting des visiteurs profil. Snap Ads story pour convertir les curieux en abonnes.", color: "#F59E0B" },
                    { phase: "Phase 3 — Scale", budget: "300-800€/mois", platforms: "Meta + Google + TikTok", desc: "Lookalike audiences Meta, brand keywords Google, TikTok pour viralite. Scale ce qui marche.", color: "#10B981" },
                  ].map((phase, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ border: `1px solid ${phase.color}20` }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold" style={{ color: phase.color }}>{phase.phase}</span>
                        <span className="text-[9px] font-semibold" style={{ color: "var(--text-muted)" }}>{phase.budget}</span>
                      </div>
                      <p className="text-[9px] mb-1" style={{ color: "var(--text-muted)" }}>{phase.platforms}</p>
                      <p className="text-[9px]" style={{ color: "var(--text-secondary)" }}>{phase.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </OsLayout>
  );
}
