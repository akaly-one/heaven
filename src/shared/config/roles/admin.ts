// Admin role — Yumi (admin agence + modele IA fusion) + root dev.
// La DB stocke role='root' pour ce tier (compat). 'admin' est l'alias semantique
// utilise dans la matrice de permissions (cf. SECURITY-v1.2026-04-21.md).
export const ADMIN_ROLE = {
  slug: "admin",
  label: "Admin Master",
  color: "#000000",
  description: "Acces complet — tous les profils, parametres, finances, DMCA, DPO.",
  // Scopes par defaut applicables au tier admin (cf. permissions.ts)
  default_scopes: [
    "dmca:read",
    "dmca:write",
    "contract:view",
    "palier:escalate",
    "identity:view_legal",
    "manage_entities",
    "manage_codes",
    "manage_finances",
    "view_all_profiles",
  ] as const,
} as const;
