// ══════════════════════════════════════════════
//  Heaven OS — Default Packs Configuration
//  Single source replacing agence/page.tsx +
//  api/packs/route.ts duplicates
// ══════════════════════════════════════════════

import type { PackConfig } from "@/types/heaven";

export const DEFAULT_PACKS: PackConfig[] = [
  {
    id: "vip",
    name: "VIP Glamour",
    code: "AG-P150",
    price: 150,
    color: "#E63329",
    features: [
      "Pieds glamour/sales + accessoires",
      "Lingerie sexy + haul",
      "Teasing + demandes custom",
      "Dedicaces personnalisees",
    ],
    bonuses: { fanvueAccess: false, freeNudeExpress: true, nudeDedicaceLevres: false, freeVideoOffer: false },
    face: false,
    badge: null,
    active: true,
    wise_url: "https://wise.com/pay/r/uQcY2-5PTQqyvko",
  },
  {
    id: "gold",
    name: "Gold",
    code: "AG-P200",
    price: 200,
    color: "#D4A017",
    features: [
      "TOUT du VIP inclus",
      "Nudes complets",
      "Cosplay",
      "Sextape sans visage",
    ],
    bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false },
    face: false,
    badge: "Populaire",
    active: true,
  },
  {
    id: "diamond",
    name: "Diamond",
    code: "AG-P250",
    price: 250,
    color: "#4F46E5",
    features: [
      "TOUT du Gold inclus",
      "Nudes avec visage",
      "Cosplay avec visage",
      "Sextape avec visage",
      "Hard illimite",
    ],
    bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false },
    face: true,
    badge: null,
    active: true,
  },
  {
    id: "platinum",
    name: "Platinum All-Access",
    code: "AG-P320",
    price: 320,
    color: "#7C3AED",
    features: [
      "Acces TOTAL aux 3 packs",
      "Demandes personnalisees",
      "Video calls prives",
      "Contenu exclusif illimite",
    ],
    bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: true },
    face: true,
    badge: "Ultimate",
    active: true,
  },
];
