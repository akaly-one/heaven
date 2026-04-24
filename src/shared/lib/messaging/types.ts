/**
 * Types partagés messaging — BRIEF-02 TICKET-M05 (2026-04-24).
 *
 * Source de vérité unique pour acteurs de messagerie et shape ConversationLike
 * étendu (liste + agent_mode). Référentiel consommé par :
 *  - <ConversationAvatar>
 *  - <ConversationRow>
 *  - <MessageBubble>
 *  - page /agence/messagerie
 *  - header dropdowns (messages)
 *
 * Spec : plans/modules/messagerie-contacts/UI-STANDARDS-v1.2026-04-24.md §4.1.
 */

import type { ConversationLike } from "./conversation-display";

// ─── Discriminator acteur de bulle chat ─────────────────────────────────
export type MessageActor =
  | "fan"              // inbound — gris, gauche
  | "model_web"        // outbound modèle sur canal web — vert iMessage, droite
  | "model_instagram"  // outbound modèle sur canal IG — bleu iMessage, droite
  | "agent_ai"         // IA envoyée (sent=true) — même couleur que modèle + sparkle
  | "agent_draft"      // IA copilot pending (sent=false) — bg dashed + bot icon
  | "system";          // message system (info, séparateur, etc.)

// ─── Shape conversation "liste" (étend ConversationLike de base) ────────
export interface ConversationListLike extends ConversationLike {
  fan_id: string;
  avatar_url?: string | null;
  last_message?: {
    text: string;
    direction: "in" | "out";
    created_at: string;
    source: "web" | "instagram";
  } | null;
  unread_count: number;
  last_message_at: string;
  tier?: string | null;
  sources?: ("web" | "instagram")[];
  agent_mode?: "auto" | "copilot" | "user" | null;
}

// ─── Helper : dériver l'acteur UI depuis les champs DB ──────────────────
//
// Règle BRIEF-02 §4.1 :
//   - sender_type === "client" → "fan"
//   - sender_type === "model"  → "model_web" | "model_instagram" selon `source`
//   - sender_type === "agent"  (ou ai_run_id présent) :
//       - si `sent === false` → "agent_draft" (copilot HITL pending)
//       - sinon                → "agent_ai" (auto envoyé)
//   - sender_type === "admin"  → traité comme modèle (admin posté en tant que modèle)
export function deriveActor(params: {
  sender_type: "client" | "model" | "admin" | "agent";
  source: "web" | "instagram";
  ai_run_id?: string | null;
  sent?: boolean;
}): MessageActor {
  const { sender_type, source, ai_run_id, sent } = params;

  if (sender_type === "client") return "fan";

  // Agent IA (ai_run_id présent) = brouillon copilot ou envoi auto
  if (ai_run_id || sender_type === "agent") {
    if (sent === false) return "agent_draft";
    return "agent_ai";
  }

  // Modèle (ou admin posté comme modèle) → couleur par canal
  return source === "instagram" ? "model_instagram" : "model_web";
}
