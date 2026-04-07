// ══════════════════════════════════════════════
//  Heaven OS — Generic Model Reference System
//
//  Model IDs are POSITIONAL (m1, m2, m3...), NEVER semantic.
//  Slugs are PUBLIC ALIASES (renameable via CP).
//  DB + Cloudinary + payments ALWAYS use model IDs internally.
//  URLs use slugs for SEO: /m/gret → resolves to m1
// ══════════════════════════════════════════════

/** Model ID format: m + number */
export type ModelId = string; // "m1", "m2", "m3", etc.

/**
 * Known model mappings (loaded from DB at runtime, this is fallback).
 * Will be replaced by DB lookup in production.
 */
const SLUG_TO_ID: Record<string, string> = {
  gret: "m1",
  yumi: "m2",
  ruby: "m3",
  paloma: "m4",
};

const ID_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_ID).map(([slug, id]) => [id, slug])
);

/**
 * Check if a string is a model ID (mN format).
 */
export function isModelId(s: string | null | undefined): boolean {
  if (!s) return false;
  return /^m\d+$/.test(s);
}

/**
 * Resolve ANY model identifier (slug or model_id) to a model_id.
 * "gret" → "m1", "m1" → "m1", "paloma" → "m4"
 * Returns input unchanged if unknown (for forward compat with new models).
 */
export function toModelId(slugOrId: string | null | undefined): string {
  if (!slugOrId) return "m1"; // safe default
  const s = slugOrId.toLowerCase().trim();
  if (isModelId(s)) return s;
  return SLUG_TO_ID[s] || s; // return as-is if unknown (new model not in hardcoded map)
}

/**
 * Resolve a model_id to its current slug (for URLs, display).
 * "m1" → "gret", "m2" → "yumi"
 * Returns input unchanged if unknown.
 */
export function toSlug(modelId: string | null | undefined): string {
  if (!modelId) return "";
  const s = modelId.toLowerCase().trim();
  if (!isModelId(s)) return s; // already a slug
  return ID_TO_SLUG[s] || s;
}

/**
 * Normalize model identifier for DATABASE writes.
 * Always outputs a model_id (mN).
 */
export function modelForDb(slugOrId: string | null | undefined): string {
  return toModelId(slugOrId);
}

/**
 * Update the runtime slug↔id mapping (called after DB fetch).
 * This allows dynamic model creation without code changes.
 */
export function updateModelMap(models: Array<{ slug: string; model_id: string }>) {
  for (const m of models) {
    SLUG_TO_ID[m.slug] = m.model_id;
    ID_TO_SLUG[m.model_id] = m.slug;
  }
}

/**
 * Get all known model IDs.
 */
export function getAllModelIds(): string[] {
  return Object.values(SLUG_TO_ID);
}

/**
 * Get all known slugs.
 */
export function getAllSlugs(): string[] {
  return Object.keys(SLUG_TO_ID);
}
