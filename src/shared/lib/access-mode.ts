// ══════════════════════════════════════════════
//  Heaven OS — Access Mode Detection
//  Phase 10 Agent 10.B (B5 — 4 modes d'accès)
//
//  4 modes distincts :
//  - 'dev'    : compte root sans model_id (dev SQWENSY, override scope)
//  - 'agence' : compte root avec model_id='m1' (yumi admin + modèle IA fusion)
//  - 'model'  : compte role='model' (paloma/ruby — scope own profile)
//  - 'public' : pas de session (visiteur profil public)
//
//  Source de vérité : JWT (HeavenTokenPayload) ou HeavenSession côté RBAC.
//  Fallback compat client : HeavenAuth (sessionStorage, pas de model_id natif
//  — on dérive depuis model_slug via toModelId).
// ══════════════════════════════════════════════

import { toModelId } from "./model-utils";

export type AccessMode = "dev" | "agence" | "model" | "public";

/**
 * Shape minimale acceptée par getAccessMode().
 *
 * Définie structurellement (et non par import) pour éviter le cycle
 * `rbac.ts → access-mode.ts → rbac.ts`. Compatible :
 * - Server-side HeavenSession (role + model_id + scopes) — src/shared/rbac.ts
 * - Client-side HeavenAuth (role + model_slug) — src/shared/types/heaven.ts
 */
export interface AccessModeSession {
  role: string;
  model_id?: string | null;
  model_slug?: string | null;
}

export type AccessModeInput = AccessModeSession | null | undefined;

/**
 * Normalise l'input (HeavenAuth sans model_id → dérive depuis model_slug).
 * Ne dépend PAS de `scopes`/`sub` : uniquement `role` + `model_id`.
 */
function resolveModelId(session: AccessModeInput): string | null {
  if (!session) return null;
  // HeavenSession a model_id direct (peut être null pour root dev)
  if ("model_id" in session && session.model_id !== undefined) {
    return session.model_id ?? null;
  }
  // HeavenAuth (client) : pas de model_id → dérive depuis model_slug
  if ("model_slug" in session && session.model_slug) {
    return toModelId(session.model_slug);
  }
  return null;
}

/**
 * Détermine le mode d'accès à partir de la session.
 * Ordre de résolution :
 *   1. Pas de session → 'public'
 *   2. role='root' (ou 'admin') + pas de model_id → 'dev'
 *   3. role='root' (ou 'admin') + model_id='m1' → 'agence'
 *   4. role='model' → 'model'
 *   5. fallback → 'public'
 */
export function getAccessMode(session: AccessModeInput): AccessMode {
  if (!session) return "public";
  const role = session.role;
  const modelId = resolveModelId(session);

  // Root / admin tier (DB stocke 'root', semantic alias 'admin')
  if (role === "root" || role === "admin") {
    // Dev = root sans model_id (pur dev SQWENSY)
    if (!modelId) return "dev";
    // Agence = root avec model_id='m1' (yumi admin fusion)
    if (modelId === "m1") return "agence";
    // Root avec autre model_id (cas théorique futur) → traité comme agence
    return "agence";
  }

  // Modèle scopé (paloma m2, ruby m3)
  if (role === "model") return "model";

  return "public";
}

/**
 * Label lisible pour UI (badge, header).
 */
export function getModeLabel(mode: AccessMode): string {
  switch (mode) {
    case "dev":
      return "Dev Root";
    case "agence":
      return "Agence";
    case "model":
      return "Modèle";
    case "public":
      return "Visiteur";
  }
}

/**
 * Couleur du mode (UI badge). Modes admin/dev = couleurs fixes,
 * le mode 'model' devrait idéalement tirer sa couleur de
 * `agence_models.color` via l'entité — ce helper fournit la couleur
 * par défaut, l'appelant peut override.
 */
export function getModeColor(mode: AccessMode): string {
  switch (mode) {
    case "dev":
      return "#DC2626"; // rouge
    case "agence":
      return "#E84393"; // gradient accent Heaven (fallback solid)
    case "model":
      return "#E84393"; // fallback — override via entity.color côté UI
    case "public":
      return "#94A3B8"; // gris
  }
}

/**
 * Gradient CSS pour le mode Agence (Heaven brand).
 * Utilisé par ModeBadge en mode 'agence'.
 */
export function getModeGradient(mode: AccessMode): string | null {
  if (mode === "agence") {
    return "linear-gradient(90deg, #E84393 0%, #A78BFA 100%)";
  }
  return null;
}

/**
 * True si le mode a accès au cockpit `/agence/*`.
 * Mode 'public' → false (redirect vers /m/{slug}).
 */
export function canAccessCP(mode: AccessMode): boolean {
  return mode === "dev" || mode === "agence" || mode === "model";
}

/**
 * True si le mode a accès au Dev Center (Architecture map, env vars,
 * migrations log). Uniquement dev root.
 */
export function canAccessDevCenter(mode: AccessMode): boolean {
  return mode === "dev";
}

/**
 * True si le mode a accès aux vues agrégées multi-modèles
 * (Finance, Ops, Agent DM). Uniquement agence + dev.
 */
export function canAccessAgenceAggregates(mode: AccessMode): boolean {
  return mode === "dev" || mode === "agence";
}
