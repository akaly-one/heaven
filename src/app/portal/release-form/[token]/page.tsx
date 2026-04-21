"use client";

/**
 * /portal/release-form/[token] — PUBLIC, sans auth, token-gated
 *
 * Flux modèle :
 *  1. GET /api/portal/release-form/[token] → valide token + retourne alias
 *  2. Modèle upload 4 docs via /api/portal/release-form/[token]/upload
 *  3. Modèle signe + consent → POST /api/portal/release-form/[token]
 *
 * P0 :
 *  - AUCUN vrai prénom affiché (alias uniquement)
 *  - Signature stockée sous forme hash (pas le texte brut)
 *  - Token marqué 'used' après soumission (irréversible)
 *
 * Agent 7.B — Heaven / Phase 7
 */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShieldCheck, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { ReleaseFormUploader } from "@/components/cockpit/dmca/release-form-uploader";

interface TokenInfo {
  ok: boolean;
  alias: string;
  model_slug: string;
  agency_username: string;
  platform: string;
  expires_at: string;
}

type UploadedPaths = {
  id_document_recto_url?: string | null;
  id_document_verso_url?: string | null;
  headshot_dated_url?: string | null;
  full_body_url?: string | null;
  release_form_pdf_url?: string | null;
};

export default function PortalReleaseFormPage() {
  const params = useParams();
  const token = String(params.token || "");

  const [loading, setLoading] = useState(true);
  const [gone, setGone] = useState(false);
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [paths, setPaths] = useState<UploadedPaths>({});
  const [signature, setSignature] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(`/api/portal/release-form/${token}`, { cache: "no-store" });
        if (res.status === 410) {
          if (!cancel) setGone(true);
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        const j: TokenInfo = await res.json();
        if (!cancel) setInfo(j);
      } catch (e) {
        if (!cancel) setErr(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [token]);

  const handleUploaded = useCallback(
    (key: string, path: string) => {
      setPaths((p) => ({ ...p, [key]: path }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    setErr(null);
    if (!signature.trim() || signature.trim().length < 2) {
      setErr("Merci d'indiquer ton nom complet pour signer.");
      return;
    }
    if (!consent) {
      setErr("Merci de confirmer ton consentement.");
      return;
    }
    if (
      !paths.id_document_recto_url ||
      !paths.id_document_verso_url ||
      !paths.headshot_dated_url ||
      !paths.full_body_url
    ) {
      setErr("Tous les documents (pièce d'identité recto+verso, headshot, corps entier) sont requis.");
      return;
    }
    setSubmitBusy(true);
    try {
      const res = await fetch(`/api/portal/release-form/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature,
          consent,
          id_recto_path: paths.id_document_recto_url,
          id_verso_path: paths.id_document_verso_url,
          headshot_path: paths.headshot_dated_url,
          full_body_path: paths.full_body_url,
          release_form_pdf_path: paths.release_form_pdf_url || null,
        }),
      });
      if (res.status === 410) {
        setGone(true);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setSuccess(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Soumission échouée");
    } finally {
      setSubmitBusy(false);
    }
  }, [token, signature, consent, paths]);

  // ─── Render states ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg, #0a0a0a)" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  if (gone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg, #0a0a0a)" }}>
        <div className="max-w-md w-full glass rounded-2xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: "#fca5a5" }} />
          <h1 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>
            Lien invalide
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Ce lien est expiré ou a déjà été utilisé. Demande un nouveau lien à ton administrateur.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg, #0a0a0a)" }}>
        <div className="max-w-md w-full glass rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--accent, #c4fd50)" }} />
          <h1 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>
            Merci !
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Ton dossier a bien été reçu. L'équipe prend le relais pour finaliser l'envoi à Fanvue.
          </p>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg, #0a0a0a)" }}>
        <div className="max-w-md w-full glass rounded-2xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: "#fca5a5" }} />
          <p className="text-sm" style={{ color: "var(--text)" }}>
            {err || "Erreur chargement."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--bg, #0a0a0a)" }}>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" style={{ color: "var(--accent, #c4fd50)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate" style={{ color: "var(--text)" }}>
              Release Form — {info.alias}
            </h1>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Pré-remplissage dossier DMCA — compte @{info.agency_username}
            </p>
          </div>
        </div>

        {/* Intro */}
        <div className="glass rounded-xl p-4">
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Ce formulaire te permet d'envoyer les documents requis par Fanvue pour protéger ton contenu.
            Tes fichiers sont chiffrés et accessibles uniquement à l'équipe.
          </p>
        </div>

        {/* Pre-filled identity section */}
        <div className="glass rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Informations pré-remplies
          </h2>
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Nom de scène
              </div>
              <div className="font-mono mt-1" style={{ color: "var(--text)" }}>{info.alias}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Username agence
              </div>
              <div className="font-mono mt-1" style={{ color: "var(--text)" }}>@{info.agency_username}</div>
            </div>
          </div>
        </div>

        {/* Uploader — portal mode */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Documents à envoyer
          </h2>
          <ReleaseFormUploader
            modelId={info.model_slug}
            apiBase={`/api/portal/release-form/${token}`}
            dossier={{
              release_form_pdf_url: paths.release_form_pdf_url,
              id_document_recto_url: paths.id_document_recto_url,
              id_document_verso_url: paths.id_document_verso_url,
              headshot_dated_url: paths.headshot_dated_url,
              full_body_url: paths.full_body_url,
            }}
            onUploaded={handleUploaded}
          />
        </div>

        {/* Signature + consent */}
        <div className="glass rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Signature électronique
          </h2>
          <div>
            <label className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Tape ton nom complet pour signer (sera chiffré)
            </label>
            <input
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              autoComplete="off"
              className="mt-1 w-full px-3 py-2 rounded-lg text-[13px] bg-transparent outline-none"
              style={{
                border: "1px solid var(--border, #ffffff22)",
                color: "var(--text)",
              }}
              placeholder="Prénom Nom"
            />
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Je confirme être la personne figurant sur les documents fournis et accorder
              l'autorisation à l'agence de soumettre ce dossier pour la protection DMCA de
              mon contenu sur la plateforme {info.platform}.
            </span>
          </label>
        </div>

        {err && (
          <div
            className="p-3 rounded-lg text-[12px]"
            style={{
              background: "rgba(220, 38, 38, 0.08)",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              color: "#fecaca",
            }}
          >
            {err}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitBusy}
          className="w-full inline-flex items-center justify-center gap-2 text-[13px] px-4 py-3 rounded-lg font-semibold transition-all"
          style={{
            background: "var(--accent, #c4fd50)",
            color: "var(--bg, #000)",
            opacity: submitBusy ? 0.6 : 1,
          }}
        >
          {submitBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          Envoyer mon dossier
        </button>

        <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>
          Expire le {new Date(info.expires_at).toLocaleString("fr-FR")}
        </p>
      </div>
    </div>
  );
}
