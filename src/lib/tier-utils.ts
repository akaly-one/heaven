// ══════════════════════════════════════════════
//  Heaven OS — Generic Tier Reference System
//
//  IDs are POSITIONAL (p0–p9), NEVER semantic.
//  The NUMBER = hierarchy level. p5 > p4 > p3 > p2 > p1 > p0.
//  Display names are per-model aliases (configurable, renameable).
//  DB, Cloudinary, payments ALWAYS use pN IDs.
// ══════════════════════════════════════════════

/** Generic pack slot IDs — positional, never change */
export const PACK_SLOTS = ["p0", "p1", "p2", "p3", "p4", "p5"] as const;
export type PackSlot = (typeof PACK_SLOTS)[number];

/** Maximum pack slots (expandable) */
export const MAX_PACK_SLOTS = 9;

/** p0 is always the free/public tier */
export const FREE_SLOT: PackSlot = "p0";

/** Paid slots only (for pack configurator, grid, etc.) */
export const PAID_SLOTS = ["p1", "p2", "p3", "p4", "p5"] as const;
export type PaidSlot = (typeof PAID_SLOTS)[number];

// ── Legacy → Generic mapping ──
// Maps ALL old semantic tier IDs to their generic equivalent.
// This is the ONLY place that knows about old names.
const LEGACY_TO_SLOT: Record<string, PackSlot> = {
  // Current canonical names (from previous system)
  silver: "p1",
  gold: "p2",
  feet: "p3",
  black: "p4",
  platinum: "p5",
  // Legacy aliases
  vip: "p1",
  diamond: "p4",
  // Visibility/free tiers
  public: "p0",
  free: "p0",
  promo: "p0",
};

// Reverse map: pN → old canonical name (for backward compat during migration)
const SLOT_TO_LEGACY: Record<PackSlot, string> = {
  p0: "public",
  p1: "silver",
  p2: "gold",
  p3: "feet",
  p4: "black",
  p5: "platinum",
};

/**
 * Normalize ANY tier/pack string to its generic slot ID.
 * Handles: "silver"→"p1", "vip"→"p1", "diamond"→"p4", "p2"→"p2", null→"p1"
 */
export function toSlot(tier: string | null | undefined): PackSlot {
  if (!tier) return "p1"; // safe default = cheapest paid tier
  const t = tier.toLowerCase().trim();
  // Already a slot ID?
  if (/^p\d$/.test(t) && parseInt(t[1]) <= MAX_PACK_SLOTS) return t as PackSlot;
  // Legacy name?
  return LEGACY_TO_SLOT[t] || "p1";
}

/**
 * Normalize tier for DATABASE writes.
 * Always outputs a pN slot ID.
 */
export function tierForDb(tier: string | null | undefined): string {
  return toSlot(tier);
}

/**
 * Normalize tier read from DATABASE.
 * Converts legacy values to pN.
 */
export function tierFromDb(tier: string | null | undefined): PackSlot {
  return toSlot(tier);
}

/**
 * Check if slot A grants access to slot B.
 * Higher number = more access. p5 includes all below.
 * Simple numeric comparison.
 */
export function slotIncludes(unlockedSlot: string, contentSlot: string): boolean {
  const u = toSlot(unlockedSlot);
  const c = toSlot(contentSlot);
  const uLevel = parseInt(u[1]);
  const cLevel = parseInt(c[1]);
  return uLevel >= cLevel;
}

/**
 * Get the numeric level of a slot (0-9).
 * Useful for sorting, comparison, hierarchy display.
 */
export function slotLevel(slot: string): number {
  const s = toSlot(slot);
  return parseInt(s[1]);
}

/**
 * Compare two slots for sorting. Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareSlots(a: string, b: string): number {
  return slotLevel(a) - slotLevel(b);
}

/**
 * Check if a string is a valid slot ID.
 */
export function isValidSlot(s: string): s is PackSlot {
  return /^p\d$/.test(s) && parseInt(s[1]) <= MAX_PACK_SLOTS;
}

/**
 * Check if a slot is the free/public tier.
 */
export function isFreeSlot(s: string): boolean {
  return toSlot(s) === "p0";
}

/**
 * Get legacy name for a slot (backward compat for display during migration).
 * Eventually this will be replaced by per-model pack config lookups.
 */
export function slotToLegacy(slot: string): string {
  const s = toSlot(slot);
  return SLOT_TO_LEGACY[s] || s;
}

// ── Backward compatibility exports ──
// These maintain the old API surface so existing imports don't break.
// They delegate to the new slot system internally.

/** @deprecated Use toSlot() instead */
export function normalizeTier(tier: string | null | undefined): string {
  return toSlot(tier);
}

/** @deprecated Use slotIncludes() instead */
export function tierIncludes(unlockedTier: string, contentTier: string): boolean {
  return slotIncludes(unlockedTier, contentTier);
}

/** @deprecated Use toSlot() instead */
export function tierFromDb_legacy(tier: string | null | undefined): string {
  return toSlot(tier);
}

/** Safe default tier = p1 (cheapest paid) */
export function safeDefaultTier(): PackSlot {
  return "p1";
}

/** Canonical tier IDs for iteration */
export const TIER_IDS = PACK_SLOTS;
export type TierId = PackSlot;

/** Hierarchy = paid slots in order */
export const TIER_HIERARCHY = PAID_SLOTS;
