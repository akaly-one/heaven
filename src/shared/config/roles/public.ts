// Public role — visiteur non-authentifié (pas de JWT, pas de session).
// Mode d'accès 4 sur 4 (cf. Phase 10 Agent 10.B — 4 modes d'accès).
//
// Accès limité à la page profil `/m/{slug}` selon le Plan Identité du modèle
// (Découverte / Shadow). Aucun accès au CP `/agence/*`. Lecture uniquement +
// achat pack via tunnel public.
export const PUBLIC_ROLE = {
  slug: "public",
  label: "Visiteur",
  color: "#94A3B8", // gris
  description:
    "Accès lecture seule selon Plan Identité du modèle. Pas d'accès admin.",
  default_scopes: [] as const,
  override_all: false as const,
} as const;
