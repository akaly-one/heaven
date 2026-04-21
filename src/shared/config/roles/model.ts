// Model role — Paloma, Ruby (et Yumi en self-view).
// Acces scoping strict sur son propre model_id (m1/m2/m3).
export const MODEL_ROLE = {
  slug: "model",
  label: "Modele",
  color: "#E84393",
  description: "Acces scoping sur son propre profil uniquement (revenus self, packs, wall, messages).",
  // Scopes par defaut applicables a un model (cf. permissions.ts)
  default_scopes: [
    "contract:view",
    "caming:operate",
    "view_revenue_self",
    "post_wall",
    "send_messages",
    "manage_packs",
  ] as const,
} as const;
