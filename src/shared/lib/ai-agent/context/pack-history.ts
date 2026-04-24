/**
 * BRIEF-16 Phase G (Agent IA pack awareness) — contexte historique packs fan.
 *
 * Fournit à l'agent IA (Groq Llama 3.3 70B) une vue structurée des achats d'un
 * fan : pack actuel, temps restant, packs expirés, éventuelle demande custom
 * en attente. Injecté dans le system prompt pour que l'agent puisse répondre
 * à des questions du type :
 *  - « il me reste combien de jours sur mon pack Gold ? »
 *  - « j'ai acheté quoi chez toi dernièrement ? »
 *
 * Source de vérité :
 *  - `agence_codes` (via pack-guard.listClientPacks)
 *  - `agence_pending_payments` pour les demandes custom en cours.
 *  - `agence_packs` pour le label human-readable (ex: "Gold" vs slug "p2").
 *
 * Log tag : `[pack-history]`.
 */

import { getServerSupabase } from "@/lib/supabase-server";
import { listClientPacks, type ClientPackEntry } from "@/lib/access/pack-guard";

export interface PackHistoryItem {
  slug: string;
  /** Label human-readable (ex: "Gold", "VIP Black") — fallback: slug. */
  label: string;
  purchasedAt: string;
  expiresAt: string;
  remainingDays: number;
  status: "active" | "expired" | "revoked";
}

export interface PackHistoryContext {
  clientId: string;
  model: string;
  packs: PackHistoryItem[];
  hasActiveCustomRequest: boolean;
  /** Référence code de la dernière demande custom en attente (si applicable). */
  pendingReferenceCode: string | null;
}

/**
 * Empty / neutral context — utilisé quand le fan n'a rien acheté ou quand DB
 * est indisponible. L'agent IA doit alors rester générique.
 */
export function emptyPackHistoryContext(
  clientId: string,
  model: string
): PackHistoryContext {
  return {
    clientId,
    model,
    packs: [],
    hasActiveCustomRequest: false,
    pendingReferenceCode: null,
  };
}

/**
 * Construit le contexte complet pour l'agent IA.
 *
 * @param clientId  UUID du client (agence_clients.id)
 * @param model     model_id (m1 / m2 / m3) — MÊME format que celui stocké dans
 *                  agence_codes.model et agence_pending_payments.model.
 */
export async function buildPackHistoryContext(
  clientId: string,
  model: string
): Promise<PackHistoryContext> {
  if (!clientId || !model) {
    return emptyPackHistoryContext(clientId || "", model || "");
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    console.warn("[pack-history] DB unavailable");
    return emptyPackHistoryContext(clientId, model);
  }

  // 1. Liste complète des codes pack-based du client (active + expired)
  const packEntries: ClientPackEntry[] = await listClientPacks(clientId, model);

  // 2. Lookup label depuis agence_packs (pack_id = slug → name)
  const slugs = Array.from(new Set(packEntries.map((p) => p.packSlug)));
  const labelMap = new Map<string, string>();
  if (slugs.length > 0) {
    const { data: packRows } = await supabase
      .from("agence_packs")
      .select("pack_id, name")
      .eq("model", model)
      .in("pack_id", slugs);
    for (const row of packRows || []) {
      if (row.pack_id && row.name) labelMap.set(row.pack_id, row.name);
    }
  }

  const packs: PackHistoryItem[] = packEntries.map((p) => ({
    slug: p.packSlug,
    label: labelMap.get(p.packSlug) || p.packSlug,
    purchasedAt: p.createdAt,
    expiresAt: p.expiresAt,
    remainingDays: p.remainingDays,
    status: p.status,
  }));

  // 3. Demande custom en attente (pack_breakdown non null, status pending-ish)
  //    BRIEF-16 phase A/F : agence_pending_payments peut avoir status
  //    "awaiting_manual_confirm" / "pending" (V1 manuel) ou "pending" (V2 auto).
  let hasActiveCustomRequest = false;
  let pendingReferenceCode: string | null = null;
  try {
    const { data: pending } = await supabase
      .from("agence_pending_payments")
      .select("reference_code, status, pack_breakdown, created_at")
      .eq("client_id", clientId)
      .eq("model", model)
      .in("status", ["pending", "awaiting_manual_confirm"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pending) {
      hasActiveCustomRequest = !!pending.pack_breakdown;
      pendingReferenceCode = (pending.reference_code as string) || null;
    }
  } catch (err) {
    console.warn("[pack-history] pending_payments lookup failed:", err);
  }

  return {
    clientId,
    model,
    packs,
    hasActiveCustomRequest,
    pendingReferenceCode,
  };
}

/**
 * Transforme le contexte en bloc texte pour injection dans le system prompt
 * LLM. Gardé court (<300 mots) pour ne pas gaspiller de tokens.
 *
 * Format :
 *   HISTORIQUE ACHATS CLIENT :
 *   - <Label> (slug <slug>) — <status> (<remainingDays>j restants / expiré il y a Nj)
 *   [Demande custom en attente de validation : référence YUMI-P42-XXXX]
 *
 * Si aucun pack : retourne string vide (ne pas injecter un bloc inutile).
 */
export function formatPackHistoryForPrompt(ctx: PackHistoryContext): string {
  if (ctx.packs.length === 0 && !ctx.hasActiveCustomRequest) {
    return "";
  }

  const lines: string[] = ["HISTORIQUE ACHATS CLIENT :"];

  if (ctx.packs.length === 0) {
    lines.push("- Aucun pack acheté jusqu'ici.");
  } else {
    // Trie : actifs d'abord, puis expirés récents
    const sorted = [...ctx.packs].sort((a, b) => {
      const aActive = a.status === "active" ? 1 : 0;
      const bActive = b.status === "active" ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime();
    });

    for (const p of sorted.slice(0, 5)) {
      const statusTxt = renderStatus(p);
      lines.push(`- ${p.label} (slug ${p.slug}) — ${statusTxt}`);
    }
  }

  if (ctx.hasActiveCustomRequest) {
    const ref = ctx.pendingReferenceCode
      ? ` (référence ${ctx.pendingReferenceCode})`
      : "";
    lines.push(`Demande custom en attente de validation manuelle${ref}.`);
  }

  lines.push(
    "Tu peux répondre aux questions du client sur son pack actuel, temps restant, ou contenu inclus. Ne jamais inventer de code d'accès."
  );

  return lines.join("\n");
}

function renderStatus(p: PackHistoryItem): string {
  if (p.status === "active") {
    if (p.remainingDays <= 0) return "expire aujourd'hui";
    if (p.remainingDays === 1) return "actif, expire demain";
    return `actif, expire dans ${p.remainingDays}j`;
  }
  if (p.status === "revoked") return "révoqué";
  // expired — calcule "il y a N jours" depuis expiresAt
  const expiredDaysAgo = Math.max(
    0,
    Math.floor((Date.now() - new Date(p.expiresAt).getTime()) / 86_400_000)
  );
  if (expiredDaysAgo === 0) return "expiré aujourd'hui";
  if (expiredDaysAgo === 1) return "expiré hier";
  return `expiré il y a ${expiredDaysAgo}j`;
}
