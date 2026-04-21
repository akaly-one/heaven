"use client";

/**
 * useActiveModelSlug() — Hook canonique pour le slug du modèle CP courant.
 * ────────────────────────────────────────────────────────────────────────
 * Garantit un cloisonnement strict entre m1 (yumi), m2 (paloma), m3 (ruby).
 *
 * Priorité de résolution :
 *   1. `currentModel` du ModelContext (override root via RootCpSelector)
 *   2. `auth?.model_slug` du JWT de session (modèle logué)
 *   3. `null` — aucun modèle actif (visiteur public ou root sans sélection)
 *
 * Règle NB (2026-04-21, bug croisement inter-modèles) :
 *   « chaque cp est cloisoné par securité en db en cloudinary en skeleton et
 *   infos qui circulent en config en tout, les modeles partagent que le chasis
 *   skeleton pas les donnée qui circulent »
 *
 * ❌ INTERDIT :
 *   - `const slug = auth?.model_slug` sans prise en compte de currentModel
 *   - `const slug = auth?.model_slug || "yumi"` (fallback hardcodé qui masque
 *     un état incohérent ; "yumi" est un vrai modèle, pas un défaut générique)
 *   - Hardcodings de slug dans des composants génériques
 *
 * ✅ CORRECT :
 *   - Utiliser ce hook partout où on a besoin du slug courant
 *   - Pour les fallbacks visuels, prévoir un état "no model" (null) au lieu de
 *     rediriger vers yumi par défaut
 */

import { useMemo } from "react";
import { useModel } from "@/lib/model-context";

/** Retourne le slug du modèle actif (m1/m2/m3 ou null). */
export function useActiveModelSlug(): string | null {
  const { currentModel, auth } = useModel();
  return useMemo(() => {
    return currentModel || auth?.model_slug || null;
  }, [currentModel, auth?.model_slug]);
}

/** True si l'utilisateur est admin (root ou yumi) — voit tous les modèles. */
export function useIsAgenceAdmin(): boolean {
  const { auth, isRoot } = useModel();
  const slug = auth?.model_slug;
  return isRoot || slug === "yumi";
}

/** True si l'utilisateur est root (dev SQWENSY, scopes wildcard). */
export function useIsRootDev(): boolean {
  const { auth } = useModel();
  return auth?.role === "root" && !auth?.model_slug;
}
