/**
 * Modes de fonctionnement agent IA — NB 2026-04-24.
 *
 * Source de vérité : colonne `agent_personas.mode`.
 * Utilisé par :
 *  - /api/cron/process-ig-replies (worker Instagram)
 *  - /api/messages POST → triggerWebAutoReply (web chat)
 */

export type AgentMode = "auto" | "user" | "shadow" | "learning";

export interface ModeDecision {
  generate: boolean;   // doit-on appeler le LLM pour produire une réponse
  send: boolean;       // doit-on envoyer (Meta / insert agence_messages)
  learning: boolean;   // doit-on flagger pour feedback loop
  reason: string;      // libellé humain pour logs / audit
}

export function decideForMode(mode: AgentMode | string | null | undefined): ModeDecision {
  const m = (mode || "auto") as AgentMode;
  switch (m) {
    case "user":
      return { generate: false, send: false, learning: false, reason: "mode_user_skip_ai" };
    case "shadow":
      return { generate: true, send: false, learning: false, reason: "mode_shadow_draft_only" };
    case "learning":
      return { generate: true, send: true, learning: true, reason: "mode_learning_with_feedback" };
    case "auto":
    default:
      return { generate: true, send: true, learning: false, reason: "mode_auto" };
  }
}

export const MODE_LABELS: Record<AgentMode, { label: string; short: string; description: string; color: string }> = {
  auto: {
    label: "Auto",
    short: "Auto",
    description: "L'agent répond automatiquement aux messages entrants. Mode par défaut.",
    color: "#22C55E",
  },
  user: {
    label: "User",
    short: "Humain",
    description: "Agent désactivé. Toutes les réponses sont tapées manuellement depuis la messagerie.",
    color: "#6B7280",
  },
  shadow: {
    label: "Shadow",
    short: "Proposition",
    description: "L'agent prépare des propositions de réponses visibles côté cockpit, mais rien n'est envoyé. Tu valides/édites avant envoi.",
    color: "#F59E0B",
  },
  learning: {
    label: "Apprentissage",
    short: "Learn",
    description: "L'agent répond automatiquement ET capture tes corrections pour un futur fine-tuning dédié.",
    color: "#A78BFA",
  },
};
