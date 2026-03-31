"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Target, Globe, DollarSign, Camera, Zap, Users,
  CheckCircle, Circle, ChevronDown, ChevronUp, Power,
  Instagram, Shield, AlertTriangle, Bot, Smartphone,
  Monitor, Star, Video, UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";

// ═══════════════════════════════════
// DONNÉES PLATEFORMES (référence complète)
// ═══════════════════════════════════

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
  // For daily checklist
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

// ═══════════════════════════════════
// ONBOARDING UNIVERSEL
// ═══════════════════════════════════

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

// ═══════════════════════════════════
// COMPARATIF REVENUS
// ═══════════════════════════════════

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

// ═══════════════════════════════════
// PAGE
// ═══════════════════════════════════

type ActiveTab = "plateformes" | "onboarding" | "strategie";

export default function StrategiePage() {
  const { currentModel } = useModel();
  const modelSlug = currentModel || "yumi";

  const [activeTab, setActiveTab] = useState<ActiveTab>("plateformes");
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [onboardingChecked, setOnboardingChecked] = useState<Record<string, boolean>>({});

  // Strategy state (from original page)
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

  useEffect(() => {
    localStorage.setItem(`heaven_strategy_${modelSlug}`, JSON.stringify({ platforms: [...activePlatforms] }));
  }, [activePlatforms, modelSlug]);

  useEffect(() => {
    localStorage.setItem(`heaven_checklist_${modelSlug}`, JSON.stringify(checklist));
  }, [checklist, modelSlug]);

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

  const active = PLATFORMS.filter(p => activePlatforms.has(p.id));
  const totalTasks = active.reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = active.reduce((sum, p) => sum + p.tasks.filter((_, i) => checklist[`${p.id}-${i}`]).length, 0);
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const onboardingDone = GLOBAL_CHECKLIST.filter(i => onboardingChecked[i.label]).length;

  const badge = (level: "auto" | "semi" | "manual") => ({
    auto: { label: "Auto", bg: "rgba(16,185,129,0.12)", color: "#10B981" },
    semi: { label: "Semi", bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
    manual: { label: "Manuel", bg: "rgba(100,116,139,0.12)", color: "#64748B" },
  }[level]);

  const TABS: { id: ActiveTab; label: string }[] = [
    { id: "plateformes", label: "Plateformes" },
    { id: "onboarding", label: "Onboarding" },
    { id: "strategie", label: "Strategie" },
  ];

  return (
    <OsLayout cpId="agence">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Target className="w-5 h-5" style={{ color: "var(--accent)" }} /> Strategie & Plateformes
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Comparatif plateformes, onboarding universel et planificateur hebdomadaire.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 text-xs font-semibold transition-all cursor-pointer rounded-t-lg"
              style={{
                color: activeTab === tab.id ? "var(--accent)" : "var(--text-muted)",
                borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: PLATEFORMES ── */}
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
                        {/* Left */}
                        <div className="space-y-3">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: p.color }}>
                              Fonctionnalites
                            </p>
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
                        {/* Right */}
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
                            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: p.color }}>
                              Etapes d'activation
                            </p>
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

        {/* ── TAB: ONBOARDING ── */}
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

        {/* ── TAB: STRATEGIE ── */}
        {activeTab === "strategie" && (
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
              <div className="flex gap-2 overflow-x-auto pb-2">
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
    </OsLayout>
  );
}
