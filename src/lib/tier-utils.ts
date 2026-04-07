// ══════════════════════════════════════════════
//  Heaven OS — Tier Reference System (single source)
//  Internal IDs are STABLE and NEVER change.
//  Display labels are CONFIGURABLE and can be renamed freely.
//  DB + Cloudinary always use internal IDs.
// ══════════════════════════════════════════════

/** Canonical internal tier IDs — these NEVER change, even if display names change */
export const TIER_IDS = ["silver", "gold", "feet", "black", "platinum"] as const;
export type TierId = (typeof TIER_IDS)[number];

/** Special visibility tiers (not purchasable packs) */
export const VISIBILITY_TIERS = ["public", "free", "promo"] as const;
export type VisibilityTier = (typeof VISIBILITY_TIERS)[number];

/** All possible tier values in the system */
export type AnyTier = TierId | VisibilityTier;

/** Legacy aliases → canonical mapping (for backward compat with old DB data) */
const LEGACY_ALIASES: Record<string, TierId> = {
  vip: "silver",
  diamond: "black",
};

/**
 * Normalize any tier string to its canonical internal ID.
 * Handles legacy aliases (vip→silver, diamond→black).
 * Returns the input unchanged if already canonical or unknown.
 */
export function normalizeTier(tier: string | null | undefined): string {
  if (!tier) return "silver"; // safe default
  const lower = tier.toLowerCase().trim();
  return LEGACY_ALIASES[lower] || lower;
}

/**
 * Check if a tier string is a valid canonical tier ID.
 */
export function isValidTierId(tier: string): tier is TierId {
  return (TIER_IDS as readonly string[]).includes(tier);
}

/**
 * Check if a tier string is a visibility tier (not a pack).
 */
export function isVisibilityTier(tier: string): tier is VisibilityTier {
  return (VISIBILITY_TIERS as readonly string[]).includes(tier);
}

/**
 * Tier hierarchy for access control.
 * Index-based: higher index = more premium access.
 * "feet" is a special standalone tier (index 2).
 */
export const TIER_HIERARCHY: TierId[] = ["silver", "gold", "feet", "black", "platinum"];

/**
 * Check if unlockedTier grants access to contentTier.
 * Uses hierarchy: platinum > black > feet > gold > silver.
 * Special case: "feet" only includes silver and feet (not gold).
 */
export function tierIncludes(unlockedTier: string, contentTier: string): boolean {
  const u = normalizeTier(unlockedTier);
  const c = normalizeTier(contentTier);
  if (u === c) return true;
  const ui = TIER_HIERARCHY.indexOf(u as TierId);
  const ci = TIER_HIERARCHY.indexOf(c as TierId);
  if (ui === -1 || ci === -1) return false;
  return ui >= ci;
}

/**
 * Get a safe default tier for code generation, payments, etc.
 * Always returns a canonical tier ID, never a legacy alias.
 */
export function safeDefaultTier(): TierId {
  return "silver";
}

/**
 * Normalize tier value before writing to database.
 * Ensures legacy aliases are converted to canonical IDs.
 */
export function tierForDb(tier: string | null | undefined): string {
  return normalizeTier(tier);
}

/**
 * Normalize tier value read from database.
 * Converts legacy aliases to canonical IDs for consistent UI display.
 */
export function tierFromDb(tier: string | null | undefined): string {
  return normalizeTier(tier);
}
