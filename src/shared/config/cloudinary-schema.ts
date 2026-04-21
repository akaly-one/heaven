/**
 * ════════════════════════════════════════════════════════════════
 *  Heaven OS — Cloudinary Schema (SSOT)
 * ════════════════════════════════════════════════════════════════
 *
 *  Convention stricte pour TOUS les uploads/refs Cloudinary.
 *  Toujours utiliser helpers ci-dessous — jamais de path en dur.
 *
 *  Structure :
 *    heaven/<slug>/<category>/[<tier>/]<public_id>
 *
 *  Examples :
 *    heaven/yumi/avatar/abc123              ← avatar
 *    heaven/yumi/cover/xyz789               ← banner/cover
 *    heaven/yumi/gallery/p0/xxx             ← gallery public (tier optionnel)
 *    heaven/yumi/posts/p0/yyy               ← post feed public
 *    heaven/yumi/packs/gold/zzz             ← pack gold
 *    heaven/yumi/packs/platinum/www         ← pack platinum
 *
 *  Rules :
 *   • Toujours slug (yumi/ruby/paloma), jamais model_id (m2/m3/m4).
 *   • Slug = identifiant public stable (ne change pas).
 *   • Category fixe (voir CATEGORIES).
 *   • Tier optionnel pour avatar/cover, obligatoire pour packs.
 *   • public_id auto-généré Cloudinary (display_name = human-readable).
 * ════════════════════════════════════════════════════════════════
 */

export const CLOUDINARY_ROOT = "heaven";

export const CATEGORIES = [
  "avatar",    // Photo de profil (rond, affichage header/messagerie/login)
  "cover",     // Bannière/cover de la page profil
  "gallery",   // Galerie publique ou teaser
  "content",   // Uploads bruts (à trier ensuite en posts/packs)
  "posts",     // Posts publiés (feed + stories)
  "packs",     // Contenu payant par tier
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Tiers standardisés — alignés sur agence_pack_catalog.
 * "p0" = public/free ; "p1-p5" = Heaven legacy notation ; noms clairs recommandés.
 */
export const TIERS = [
  "public",       // gratuit, visible par tous (= p0)
  "teaser",       // preview flouté
  "soft",         // doux (pack soft)
  "sensual",      // intermédiaire
  "gold",         // premium (= p2 legacy)
  "platinum",     // premium élevé (= p3 legacy)
  "exclusive",    // VIP
  "hard_premium", // hardcore premium
] as const;

export type Tier = (typeof TIERS)[number];

/**
 * Mapping Heaven legacy tier (p0–p5) → nouveau tier standardisé.
 */
export const LEGACY_TIER_MAP: Record<string, Tier> = {
  p0: "public",
  p1: "soft",
  p2: "gold",
  p3: "platinum",
  p4: "exclusive",
  p5: "hard_premium",
};

/**
 * Build a Cloudinary folder path for a given model + category + optional tier.
 */
export function cloudinaryFolder(
  slug: string,
  category: Category,
  tier?: Tier
): string {
  const clean = slug.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_-]{1,30}$/.test(clean)) {
    throw new Error(`Slug invalide: ${slug}`);
  }
  const parts: string[] = [CLOUDINARY_ROOT, clean, category];
  if (tier) {
    if (!TIERS.includes(tier)) throw new Error(`Tier invalide: ${tier}`);
    parts.push(tier);
  }
  return parts.join("/");
}

/**
 * Extract { slug, category, tier } from a Cloudinary URL or public_id.
 * Accepts both formats and legacy variants.
 */
export function parseCloudinaryPath(urlOrPid: string): {
  slug: string | null;
  category: Category | null;
  tier: Tier | null;
  legacy: boolean;
} {
  let path = urlOrPid;
  const uploadIdx = path.indexOf("/upload/");
  if (uploadIdx >= 0) {
    path = path.slice(uploadIdx + "/upload/".length);
    // Skip version v123...
    path = path.replace(/^v\d+\//, "");
  }

  const segs = path.split("/").filter(Boolean);
  if (segs[0] !== CLOUDINARY_ROOT) return { slug: null, category: null, tier: null, legacy: true };

  // heaven/<slug>/<category>/[<tier>/]<id>
  if (segs.length >= 3) {
    const slug = segs[1];
    const rawCat = segs[2];
    if ((CATEGORIES as readonly string[]).includes(rawCat)) {
      const category = rawCat as Category;
      // Next segment may be tier or public_id
      const maybeTier = segs[3];
      if (maybeTier && (TIERS as readonly string[]).includes(maybeTier)) {
        return { slug, category, tier: maybeTier as Tier, legacy: false };
      }
      if (maybeTier && LEGACY_TIER_MAP[maybeTier]) {
        return { slug, category, tier: LEGACY_TIER_MAP[maybeTier], legacy: true };
      }
      return { slug, category, tier: null, legacy: false };
    }
    // Legacy: heaven/feed/<slug>/<tier>/<id>
    if (rawCat === "feed" && segs[3]) {
      const slug = segs[3];
      const tier = (segs[4] && (TIERS as readonly string[]).includes(segs[4])
        ? (segs[4] as Tier)
        : LEGACY_TIER_MAP[segs[4]] || "public") as Tier;
      return { slug, category: "posts", tier, legacy: true };
    }
    // Legacy: heaven/m4/... (model_id at slug position)
    return { slug, category: null, tier: null, legacy: true };
  }
  return { slug: null, category: null, tier: null, legacy: true };
}

/**
 * Helper : returns true if a URL is clean (conforms to current schema).
 */
export function isCanonicalCloudinaryPath(urlOrPid: string): boolean {
  const parsed = parseCloudinaryPath(urlOrPid);
  return !parsed.legacy && !!parsed.slug && !!parsed.category;
}
