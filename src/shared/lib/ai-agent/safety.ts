// ══════════════════════════════════════════════════════════════════════════
//  Safety filter — mode différencié web / instagram
//
//  NB 2026-04-24 : directive « aucun filtre sexuel mode web, mais pour
//  instagram oui ». Profile web = espace contrôlé (plateforme Heaven),
//  Instagram = contraintes Meta strictes.
// ══════════════════════════════════════════════════════════════════════════

export type SafetyChannel = "web" | "instagram";

interface Rule {
  pattern: RegExp;
  severity: "low" | "medium" | "high" | "critical";
  action: "block" | "rephrase" | "flag";
  reason: string;
}

// ── Règles COMMUNES (toujours appliquées, quel que soit le canal) ───────────
const COMMON_RULES: Rule[] = [
  // AI leak (zéro tolérance — confidentialité Heaven absolue)
  { pattern: /\b(je suis une? (intelligence artificielle|IA|bot|assistant|chatbot|modèle))\b/i,
    severity: "critical", action: "rephrase", reason: "ai_leak_fr" },
  { pattern: /\b(as an? ai|i am an? ai|language model|gpt|claude|llm)\b/i,
    severity: "critical", action: "rephrase", reason: "ai_leak_en" },
  // Confidentialité Heaven / SQWENSY
  { pattern: /\b(sqwensy|heaven)\b/i,
    severity: "high", action: "rephrase", reason: "confidentiality_leak" },
  // Autres modèles (pas mélanger)
  { pattern: /\b(paloma|ruby)\b/i,
    severity: "medium", action: "rephrase", reason: "cross_model_leak" },
  // Paiements non whitelist
  { pattern: /\b(cashapp|venmo|zelle|paypal\.me|bitcoin|crypto|wire transfer)\b/i,
    severity: "critical", action: "block", reason: "unauthorized_payment" },
];

// ── Règles INSTAGRAM uniquement (Meta compliance strict) ────────────────────
const INSTAGRAM_RULES: Rule[] = [
  // Contenu sexuel explicite (banned Meta)
  { pattern: /\b(fuck|suck|dick|pussy|nude|naked|hard|cum|orgasm|horny)\b/i,
    severity: "high", action: "rephrase", reason: "nsfw_explicit_ig" },
  { pattern: /\b(baise|bite|chatte|nichons|seins|jouir|bander|orgasme|salope|putain)\b/i,
    severity: "high", action: "rephrase", reason: "nsfw_explicit_ig_fr" },
  // Redirections hors Fanvue (Meta bloque)
  { pattern: /\b(whatsapp|telegram|snapchat|wickr|kik)\b/i,
    severity: "high", action: "rephrase", reason: "external_platform_redirect" },
];

// ── Règles WEB (permissif : NSFW autorisé sur Fanvue, mais pas explicite tout de même) ──
const WEB_RULES: Rule[] = [
  // Pas de filtre NSFW — la plateforme Heaven tolère flirt et double-sens.
  // Les seules règles web = les COMMON_RULES.
];

interface SafetyResult {
  ok: boolean;
  action: "pass" | "rephrase" | "block";
  flags: Array<{ reason: string; severity: string; match: string }>;
  sanitized?: string;                // si action=rephrase, suggestion canned
}

/**
 * Filtre output d'un message IA avant envoi.
 * Retourne {ok: true} si safe, sinon action à prendre avec raison.
 */
export function filterOutbound(
  text: string,
  channel: SafetyChannel
): SafetyResult {
  const rules = [...COMMON_RULES, ...(channel === "instagram" ? INSTAGRAM_RULES : WEB_RULES)];
  const flags: SafetyResult["flags"] = [];
  let worstAction: "pass" | "rephrase" | "block" = "pass";

  for (const rule of rules) {
    const match = text.match(rule.pattern);
    if (match) {
      flags.push({
        reason: rule.reason,
        severity: rule.severity,
        match: match[0].slice(0, 50),
      });
      if (rule.action === "block") {
        worstAction = "block";
      } else if (rule.action === "rephrase" && worstAction !== "block") {
        worstAction = "rephrase";
      }
    }
  }

  const result: SafetyResult = {
    ok: worstAction === "pass",
    action: worstAction,
    flags,
  };

  // Fallback canned si bloqué
  if (worstAction === "block") {
    result.sanitized = channel === "instagram"
      ? "Hey 💜 viens voir mon contenu exclusif sur Fanvue 😘"
      : "Hey mon cœur 💜 on en parle ailleurs, viens sur mon Fanvue 💋";
  } else if (worstAction === "rephrase") {
    // Pour rephrase, caller décide : regen via LLM ou fallback canned
    result.sanitized = channel === "instagram"
      ? "Hey mon chou 💜 je te réponds vite"
      : "Hey bb 💜";
  }

  return result;
}

/** Humanizer : délai random 2-6s pour simuler humain (anti bot detection). */
export function humanizeDelay(min = 2000, max = 6000): Promise<void> {
  const ms = min + Math.floor(Math.random() * (max - min));
  return new Promise((resolve) => setTimeout(resolve, ms));
}
