"use client";

/**
 * HeavenClientHeader — BRIEF-18 Phase 2
 * ─────────────────────────────────────
 * Wrapper minimal qui délègue intégralement vers <ModelHeaderBar> legacy.
 *
 * Cible : visiteurs / fans sur /m/[slug] sans session admin.
 *
 * En Phase 3, ce composant inlinera son propre markup et le legacy
 * `model-header-bar.tsx` sera marqué @deprecated.
 */

import type { ReactNode } from "react";
import { ModelHeaderBar } from "@/components/profile/model-header-bar";
import type { ModelInfo, AccessCode, VisitorPlatform } from "@/types/heaven";

export interface HeavenClientHeaderProps {
  // Identité du modèle
  model: ModelInfo;
  displayModel: ModelInfo | null;
  slug: string;
  modelId: string;

  // État admin (false ici par construction — composant client/visiteur)
  isModelLoggedIn: boolean;

  // État visiteur
  visitorRegistered: boolean;
  visitorPlatform: VisitorPlatform | null;
  visitorHandle: string;
  visitorVerified: boolean;
  unlockedTier: string | null;
  activeCode: AccessCode | null;

  // Chat / notifications
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatUnread: number;
  newNotifications: number;

  // Order history
  orderHistoryOpen: boolean;
  setOrderHistoryOpen: (open: boolean) => void;
  clearNotifications: () => void;

  // Code unlock
  setCodeSheetOpen: (open: boolean) => void;
  onCodeValidated: (code: { tier: string; expiresAt: string; code: string; id?: string }) => void;

  /** Slot pour boutons additionnels (réservé Phase 3 — ignoré actuellement). */
  extraActions?: ReactNode;
}

export function HeavenClientHeader(props: HeavenClientHeaderProps) {
  // Pour Phase 2 : delegate vers ModelHeaderBar legacy
  // Le slot extraActions est ignoré (sera utilisé en Phase 3 quand on inlinera le markup)
  return (
    <ModelHeaderBar
      model={props.model}
      displayModel={props.displayModel}
      isModelLoggedIn={props.isModelLoggedIn}
      visitorRegistered={props.visitorRegistered}
      visitorPlatform={props.visitorPlatform}
      visitorHandle={props.visitorHandle}
      visitorVerified={props.visitorVerified}
      unlockedTier={props.unlockedTier}
      activeCode={props.activeCode}
      chatOpen={props.chatOpen}
      setChatOpen={props.setChatOpen}
      chatUnread={props.chatUnread}
      orderHistoryOpen={props.orderHistoryOpen}
      setOrderHistoryOpen={props.setOrderHistoryOpen}
      newNotifications={props.newNotifications}
      clearNotifications={props.clearNotifications}
      setCodeSheetOpen={props.setCodeSheetOpen}
      slug={props.slug}
      modelId={props.modelId}
      onCodeValidated={props.onCodeValidated}
    />
  );
}
