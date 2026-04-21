// Dev role — compte "root" SQWENSY (dev/maintenance).
// Mode d'accès 1 sur 4 (cf. Phase 10 Agent 10.B — 4 modes d'accès).
//
// Note compat JWT : la DB stocke role='root' et model_id=null pour ce tier.
// La distinction avec le mode Agence se fait sur `model_id` (null → dev,
// 'm1' → agence/yumi fusion). Cf. src/shared/lib/access-mode.ts pour la
// logique de détection.
export const DEV_ROLE = {
  slug: "dev",
  label: "Dev Root",
  color: "#DC2626", // rouge
  description:
    "Dev SQWENSY — accès total, édition infra, Dev Center, override scope checks.",
  // Wildcard = bypass de toutes les permissions granulaires (cf. rbac.hasScope)
  default_scopes: ["*"] as const,
  // Override toutes les permissions statiques (cf. permissions.ts matrice)
  override_all: true as const,
} as const;
