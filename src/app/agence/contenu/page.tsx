import { redirect } from "next/navigation";

/**
 * Phase 2 — Agent 2.A (D-1 Option 1 sidebar 1:1 pages).
 *
 * Shell temporaire pour la route dédiée « Contenu ». Le contenu réel vit
 * encore dans le monolithe `/agence/page.tsx` (état `tab=contenu`). Tant
 * que Phase 2.B n'a pas extrait `PackComposer` et consorts en composants
 * autonomes, on redirige ici vers `?tab=contenu&_from=route`.
 *
 * Le flag `_from=route` empêche le middleware de re-rediriger vers la
 * route dédiée (évite la boucle).
 *
 * Remplacer ce shell par un import direct du composant dès que l'extraction
 * de Phase 2.B aura livré le sous-module correspondant.
 */
export default function ContenuPage() {
  redirect("/agence?tab=contenu&_from=route");
}
