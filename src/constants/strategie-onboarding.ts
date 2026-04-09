import { Shield, DollarSign, Camera, Star, Globe } from "lucide-react";

export const ONBOARDING_CATEGORIES = {
  legal: { label: "Legal & Identite", color: "#EF4444", icon: Shield },
  finance: { label: "Finance & Paiements", color: "#10B981", icon: DollarSign },
  materiel: { label: "Materiel technique", color: "#E84393", icon: Camera },
  contenu: { label: "Contenu initial", color: "#E040FB", icon: Star },
  promo: { label: "Promotion & Reseaux", color: "#00AFF0", icon: Globe },
} as const;

export const GLOBAL_CHECKLIST = [
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
