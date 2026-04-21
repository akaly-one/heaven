"use client";

/**
 * StrategiePanel wrapper — Phase 2 Agent 2.B
 *
 * Re-exports the existing StrategiePanel (already decomposed via
 * `src/shared/components/strategie/tab-*` subcomponents, ~660L).
 *
 * A refonte complète est prévue pour la Phase 7 Agent 7.A
 * (3 plans A/B/C + Release Form Fanvue).
 *
 * Cet alias permet à `/agence/strategie/page.tsx` (créé par Agent 2.A)
 * d'importer un chemin canonique sans casser le chemin legacy utilisé
 * par `/agence/page.tsx`.
 */

export { StrategiePanel } from "@/components/cockpit/strategie-panel";
export { StrategiePanel as default } from "@/components/cockpit/strategie-panel";
