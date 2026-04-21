import { redirect } from "next/navigation";

/**
 * Phase 2 — Agent 2.A (D-1 Option 1 sidebar 1:1 pages).
 *
 * Shell temporaire pour la route dédiée « Stratégie ». Contenu actuel
 * rendu par le monolithe `/agence/page.tsx` sur l'état `tab=strategie`.
 * Sera remplacé quand Phase 2.B aura extrait le panel en composant.
 *
 * Flag `_from=route` : empêche le middleware de renvoyer ici en boucle.
 */
export default function StrategiePage() {
  redirect("/agence?tab=strategie&_from=route");
}
