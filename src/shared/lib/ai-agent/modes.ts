/**
 * Modes de fonctionnement agent IA — NB 2026-04-24 (refonte 3 modes).
 *
 * Aligné sur les standards industrie (Intercom Fin / Zendesk Agent Assist /
 * GitHub Copilot) : un mode pleinement autonome, un mode copilote HITL
 * (human-in-the-loop) avec apprentissage, un mode manuel.
 *
 * Source de vérité : colonne `agent_personas.mode`.
 * Utilisé par :
 *  - /api/cron/process-ig-replies (worker Instagram)
 *  - /api/messages POST → triggerWebAutoReply (web chat)
 */

export type AgentMode = "auto" | "copilot" | "user";

export interface ModeDecision {
  generate: boolean;   // doit-on appeler le LLM pour produire une réponse
  send: boolean;       // doit-on envoyer (Meta / insert agence_messages)
  learning: boolean;   // doit-on flagger pour feedback loop
  reason: string;      // libellé humain pour logs / audit
}

export function decideForMode(mode: AgentMode | string | null | undefined): ModeDecision {
  // Backward-compat : anciens enum values "shadow"/"learning" → copilot
  const raw = (mode || "auto").toString();
  const m = (["shadow", "learning"].includes(raw) ? "copilot" : raw) as AgentMode;
  switch (m) {
    case "user":
      return { generate: false, send: false, learning: false, reason: "mode_user_skip_ai" };
    case "copilot":
      // Agent génère en parallèle (sent=false) pour capturer le draft
      // → le human tape + envoie depuis la messagerie, la différence entre
      //   draft agent et reply humain alimente le dataset de feedback.
      return { generate: true, send: false, learning: true, reason: "mode_copilot_hitl" };
    case "auto":
    default:
      return { generate: true, send: true, learning: false, reason: "mode_auto" };
  }
}

export const MODE_LABELS: Record<AgentMode, { label: string; short: string; description: string; color: string }> = {
  auto: {
    label: "Auto",
    short: "Auto",
    description: "L'agent répond automatiquement aux messages entrants. Mode par défaut pour volume / vitesse.",
    color: "#22C55E",
  },
  copilot: {
    label: "Copilote",
    short: "Copilote",
    description: "Toi tu écris et envoies, l'agent génère en parallèle un draft silencieux et apprend de tes corrections. Aligné Intercom Fin / Zendesk Agent Assist.",
    color: "#A78BFA",
  },
  user: {
    label: "Manuel",
    short: "Manuel",
    description: "Agent complètement désactivé. 100% humain — utile si le ton doit rester ultra perso.",
    color: "#6B7280",
  },
};
