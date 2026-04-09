import type { LucideIcon } from "lucide-react";
import { Bot, UserCheck, Smartphone, Monitor } from "lucide-react";

export interface PlatformDetail {
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

export const PLATFORMS: PlatformDetail[] = [
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
