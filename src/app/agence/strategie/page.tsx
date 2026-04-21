"use client";

/**
 * /agence/strategie — Phase 7 Agent 7.A (B6)
 *
 * Rendu réel de la page Stratégie 3 Plans (A/B/C).
 * Remplace le redirect Phase 2.A vers `/agence?tab=strategie`.
 *
 * - Admin (root + yumi) : 3 onglets Plan A / B / C
 * - Modèles Plan B (paloma/ruby) : uniquement Plan B (leur propre scope)
 */

import { OsLayout } from "@/components/os-layout";
import StrategiePanel from "@/components/cockpit/strategie/strategie-panel";

export default function StrategiePage() {
  return (
    <OsLayout cpId="agence">
      <StrategiePanel />
    </OsLayout>
  );
}
