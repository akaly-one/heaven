// ══════════════════════════════════════════════
//  ROOT (m0) — CP maître / template spécimen
//
//  NB 2026-04-24 : ROOT est un CP complet en DB (model_id = m0).
//  Les autres CPs commencent à m1 (Yumi). ROOT affiche le skeleton
//  et la documentation, pas de data opérationnelle.
// ══════════════════════════════════════════════

export const ROOT_ENTITY = {
  slug: "root",
  model_id: "m0",
  display_name: "ROOT",
  color: "#F59E0B",              // ambre (dev mode)
  handle_instagram: null,         // pas de handle IG pour ROOT
} as const;
