// ══════════════════════════════════════════════
//  Heaven OS — Default Packs Configuration
//  Silver → Gold → VIP Black → VIP Platinum
//  Luxe metallic branding
// ══════════════════════════════════════════════

import type { PackConfig } from "@/types/heaven";

export const DEFAULT_PACKS: PackConfig[] = [
  {
    id: "p1",
    name: "Silver",
    code: "AG-SLV",
    price: 50,
    color: "#C0C0C0",
    features: [
      "Shootings photos exclusifs",
      "Backstage & behind the scenes",
      "Stories privées & avant-premières",
      "Contenu lifestyle & promo",
      "Sans nudité",
    ],
    bonuses: { fanvueAccess: false, freeNudeExpress: false, nudeDedicaceLevres: false, freeVideoOffer: false },
    face: false,
    badge: null,
    active: true,
  },
  {
    id: "p2",
    name: "Gold",
    code: "AG-GLD",
    price: 100,
    color: "#D4AF37",
    features: [
      "TOUT du Silver inclus",
      "Lingerie & dentelle",
      "Poses sensuelles & suggestives",
      "Haul sexy & essayages",
      "Dédicaces personnalisées",
    ],
    bonuses: { fanvueAccess: false, freeNudeExpress: true, nudeDedicaceLevres: false, freeVideoOffer: false },
    face: false,
    badge: "Populaire",
    active: true,
  },
  {
    id: "p4",
    name: "VIP Black",
    code: "AG-BLK",
    price: 200,
    color: "#1C1C1C",
    features: [
      "TOUT du Gold inclus",
      "Nudes complets sans visage",
      "Sextapes — visage caché",
      "Contenu explicite",
      "Cosplay & accessoires",
    ],
    bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false },
    face: false,
    badge: null,
    active: true,
  },
  {
    id: "p5",
    name: "VIP Platinum",
    code: "AG-PLT",
    price: 350,
    color: "#B8860B",
    features: [
      "Accès TOTAL à tous les niveaux",
      "Visage découvert sur tout le contenu",
      "Hard & contenu premium exclusif",
      "Demandes personnalisées illimitées",
      "Vidéo calls privés",
    ],
    bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: true },
    face: true,
    badge: "Ultimate",
    active: true,
  },
];
