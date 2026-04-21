"use client";

/**
 * AgentDmRequestPanel — demande d'activation Agent DM (Paloma/Ruby).
 *
 * Workflow :
 *  1. Modèle (paloma/ruby) visite /agence/settings tab Agent DM
 *  2. Si module `agent_dm` pas encore activé dans agence_accounts.activable_modules :
 *     → bouton "Demander activation" → crée une entry dans
 *       agence_ai_replies ou agence_outreach_leads avec type='agent_dm_request'
 *       (ou plus simple : POST /api/agence/agent-dm/request-clone)
 *  3. Yumi admin reçoit la demande en messagerie/notification
 *  4. Yumi approuve → toggle module ON via AccountsTable (Phase 10.A)
 *  5. Status passe à "En service" côté modèle
 *
 * Pour MVP : bouton → POST API (à implémenter) + statut local.
 */

import { useEffect, useState } from "react";
import { MessageSquare, Check, Clock, AlertCircle } from "lucide-react";
import { useActiveModelSlug } from "@/lib/use-active-model";

interface AgentDmStatus {
  loading: boolean;
  enabled: boolean;        // module actif côté account
  requested: boolean;      // demande en cours
  requestedAt?: string;
  activatedAt?: string;
  error?: string;
}

interface Props {
  authHeaders: () => HeadersInit;
}

export function AgentDmRequestPanel({ authHeaders }: Props) {
  const slug = useActiveModelSlug();
  const [status, setStatus] = useState<AgentDmStatus>({ loading: true, enabled: false, requested: false });
  const [submitting, setSubmitting] = useState(false);

  // Fetch status : activable_modules.agent_dm.enabled depuis son propre account
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/agence/accounts`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) { setStatus({ loading: false, enabled: false, requested: false, error: "Indisponible" }); return; }
        const accounts = (d.accounts || []) as Array<{
          model_slug?: string | null;
          activable_modules?: Record<string, { enabled?: boolean; activated_at?: string | null }>;
        }>;
        const own = accounts.find((a) => (a.model_slug || "").toLowerCase() === slug.toLowerCase());
        const mod = own?.activable_modules?.agent_dm;
        setStatus({
          loading: false,
          enabled: !!mod?.enabled,
          requested: false,  // TODO : lire depuis agence_outreach_leads si impl
          activatedAt: mod?.activated_at || undefined,
        });
      })
      .catch(() => setStatus({ loading: false, enabled: false, requested: false, error: "Erreur réseau" }));
  }, [slug, authHeaders]);

  const submitRequest = async () => {
    if (!slug || submitting) return;
    setSubmitting(true);
    try {
      // MVP : message à Yumi via messagerie (contactable via API existante).
      // À terme : API dédiée /api/agence/agent-dm/request-clone
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" } as Record<string, string>,
        body: JSON.stringify({
          model: "m1",  // envoi vers yumi agence
          pseudo: slug.toUpperCase(),
          content: `🤖 Demande activation Agent DM Instagram clone pour ${slug}. Merci de configurer et activer depuis Comptes → Modules.`,
          type: "admin_request",
        }),
      });
      if (r.ok) {
        setStatus((p) => ({ ...p, requested: true, requestedAt: new Date().toISOString() }));
      }
    } catch (e) {
      /* noop */
    }
    setSubmitting(false);
  };

  return (
    <div
      className="rounded-2xl p-4 md:p-5 space-y-4"
      style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-4 h-4" style={{ color: "#E84393" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Agent DM Instagram</h2>
      </div>
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Active un clone d'agent IA pour gérer tes DMs Instagram automatiquement (persona, scripts, upsell
        packs). L'activation se fait via l'agence Yumi qui configure un agent dédié à ton compte.
      </p>

      {status.loading ? (
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>Chargement…</div>
      ) : status.error ? (
        <div className="text-xs flex items-center gap-1.5" style={{ color: "#F59E0B" }}>
          <AlertCircle className="w-3.5 h-3.5" /> {status.error}
        </div>
      ) : status.enabled ? (
        <div
          className="rounded-xl p-3 flex items-center gap-2"
          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)" }}
        >
          <Check className="w-4 h-4" style={{ color: "#10B981" }} />
          <div>
            <div className="text-xs font-semibold" style={{ color: "#10B981" }}>Agent DM activé</div>
            {status.activatedAt && (
              <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Activé le {new Date(status.activatedAt).toLocaleDateString("fr-FR")}
              </div>
            )}
          </div>
        </div>
      ) : status.requested ? (
        <div
          className="rounded-xl p-3 flex items-center gap-2"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}
        >
          <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
          <div>
            <div className="text-xs font-semibold" style={{ color: "#F59E0B" }}>Demande envoyée à Yumi</div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Tu recevras une notification quand l'agent sera prêt.
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={submitRequest}
          disabled={submitting || !slug}
          className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, #E84393, #F43F5E)",
            color: "white",
            border: "none",
            opacity: submitting || !slug ? 0.5 : 1,
            cursor: submitting || !slug ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Envoi…" : "Demander activation Agent DM"}
        </button>
      )}

      <ul className="text-[10px] space-y-1 pt-2" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border2)" }}>
        <li>✓ Persona custom adaptée à ton style</li>
        <li>✓ Scripts ciblés (DMs, commentaires, stories)</li>
        <li>✓ Upsell packs PPV + funnel caming → Fanvue</li>
        <li>✓ Mode review (tu valides chaque draft) → auto après 100 drafts validés</li>
      </ul>
    </div>
  );
}
