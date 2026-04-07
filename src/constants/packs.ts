// ══════════════════════════════════════════════
//  Heaven OS — Default Packs Configuration
//  Silver → Gold → VIP Black → VIP Platinum
//  Luxe metallic branding
// ══════════════════════════════════════════════

import type { PackConfig } from "@/types/heaven";

export const DEFAULT_PACKS: PackConfig[] = [
  {
    id: "silver",
    name: "Silver",
    code: "AG-SLV",
    price: 75,
    color: "#C0C0C0",
    features: [
      "Photos & shootings exclusifs",
      "Contenu promo en avant-première",
      "Backstage & behind the scenes",
      "Sans nudité",
    ],
    bonuses: { fanvueAccess: false, freeNudeExpress: false, nudeDedicaceLevres: false, freeVideoOffer: false },
    face: false,
    badge: null,
    active: true,
  },
  {
    id: "gold",
    name: "Gold",
    code: "AG-GLD",
    price: 125,
    color: "#D4AF37",
    features: [
      "TOUT du Silver inclus",
      "Tenue dentelle & lingerie",
      "Poses sensuelles & suggestives",
      "Haul sexy",
    ],
    bonuses: { fanvueAccess: false, freeNudeExpress: true, nudeDedicaceLevres: false, freeVideoOffer: false },
    face: false,
    badge: "Populaire",
    active: true,
  },
  {
    id: "black",
    name: "VIP Black",
    code: "AG-BLK",
    price: 250,
    color: "#1C1C1C",
    features: [
      "TOUT du Gold inclus",
      "Nudes complets",
      "Sextapes — visage caché",
      "Contenu explicite",
    ],
    bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false },
    face: false,
    badge: null,
    active: true,
  },
  {
    id: "platinum",
    name: "VIP Platinum",
    code: "AG-PLT",
    price: 400,
    color: "#B8860B",
    features: [
      "Accès TOTAL tous niveaux",
      "Visage découvert",
      "Contenu hard & personnalisé",
      "Demandes illimitées",
    ],
    bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: true },
    face: true,
    badge: "Ultimate",
    active: true,
  },
];
