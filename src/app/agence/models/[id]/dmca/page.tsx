"use client";

/**
 * /agence/models/[id]/dmca — Admin page to manage DMCA dossier per model
 *
 * Agent 7.B — Heaven / Phase 7
 *
 * Scope admin : accessible uniquement role=root ou role=model + slug=yumi.
 * Workflow : Upload 5 docs → Submit → Email DMCA → (validated/rejected).
 */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ShieldAlert, Send, Link as LinkIcon, Copy, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { toModelId } from "@/lib/model-utils";
import { ReleaseFormUploader } from "@/components/cockpit/dmca/release-form-uploader";
import { DmcaStateMachine, type DmcaStatus } from "@/components/cockpit/dmca/dmca-state-machine";
import { DmcaEmailGenerator } from "@/components/cockpit/dmca/dmca-email-generator";

interface Dossier {
  id?: string;
  model_id: string;
  platform: string;
  release_form_pdf_url?: string | null;
  id_document_recto_url?: string | null;
  id_document_verso_url?: string | null;
  headshot_dated_url?: string | null;
  full_body_url?: string | null;
  faceswap_before_url?: string | null;
  faceswap_after_url?: string | null;
  submitted_at?: string | null;
  validated_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
}

export default function DmcaPage() {
  const params = useParams();
  const rawId = String(params.id || "");
  const modelId = toModelId(rawId);
  const { isRoot, auth } = useModel();
  const isAgencyAdmin = isRoot || String(auth?.model_slug || "").toLowerCase() === "yumi";

  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [status, setStatus] = useState<DmcaStatus>("pending");
  const [modelAlias, setModelAlias] = useState<string>(rawId);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [tokenBusy, setTokenBusy] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [portalExpires, setPortalExpires] = useState<string | null>(null);
  const [portalCopied, setPortalCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Fetch dossier + model alias
  const fetchDossier = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch(`/api/agence/dmca/${modelId}?platform=fanvue`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      setDossier(j.dossier || null);
      setStatus(j.status || "pending");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  // Fetch model alias (display_name only — never real first name)
  const fetchAlias = useCallback(async () => {
    try {
      const res = await fetch(`/api/models`, { cache: "no-store" });
      if (!res.ok) return;
      const j = await res.json();
      const m = (j?.models || []).find(
        (x: { model_id?: string; model_slug?: string; slug?: string }) =>
          x.model_id === modelId || x.slug === rawId || x.model_slug === rawId
      );
      if (m) {
        setModelAlias(m.display_name || m.slug || m.model_slug || rawId);
      }
    } catch {
      /* non-blocking */
    }
  }, [modelId, rawId]);

  useEffect(() => {
    if (!isAgencyAdmin) return;
    fetchDossier();
    fetchAlias();
  }, [fetchDossier, fetchAlias, isAgencyAdmin]);

  const handleUploaded = useCallback(
    (_key: string, _path: string) => {
      // Refresh dossier state after each upload
      fetchDossier();
    },
    [fetchDossier]
  );

  const handleSubmit = useCallback(async () => {
    setSubmitBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/agence/dmca/${modelId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "fanvue" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      await fetchDossier();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitBusy(false);
    }
  }, [modelId, fetchDossier]);

  const handleGenerateToken = useCallback(async () => {
    setTokenBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/agence/dmca/${modelId}/portal-token`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      setPortalUrl(j.url);
      setPortalExpires(j.expires_at);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Token failed");
    } finally {
      setTokenBusy(false);
    }
  }, [modelId]);

  const handleCopyPortal = useCallback(async () => {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
      setPortalCopied(true);
      setTimeout(() => setPortalCopied(false), 1800);
    } catch {
      /* blocked */
    }
  }, [portalUrl]);

  if (!isAgencyAdmin) {
    return (
      <OsLayout cpId="agence">
        <div className="p-8 max-w-xl mx-auto">
          <div className="glass rounded-xl p-6 text-center">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text)" }}>
              Accès réservé à l'administration.
            </p>
          </div>
        </div>
      </OsLayout>
    );
  }

  const canSubmit =
    status === "documents_collected" && !submitBusy;

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3 fade-up">
            <Link
              href="/agence/settings"
              className="w-8 h-8 rounded-lg flex items-center justify-center glass-hover transition-all"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate" style={{ color: "var(--text)" }}>
                Dossier DMCA — {modelAlias}
              </h1>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Release Form Fanvue / Model release dossier
              </p>
            </div>
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

          {/* State machine */}
          <DmcaStateMachine
            status={status}
            submittedAt={dossier?.submitted_at}
            validatedAt={dossier?.validated_at}
            rejectedAt={dossier?.rejected_at}
            rejectionReason={dossier?.rejection_reason}
          />

          {/* Send portal link */}
          <div className="glass rounded-xl p-5 fade-up-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <LinkIcon className="w-4 h-4" />
                  Lien de pré-remplissage modèle
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Envoie un lien unique à la modèle pour qu'elle upload ses documents directement.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateToken}
                disabled={tokenBusy}
                className="inline-flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-lg font-medium transition-all"
                style={{
                  background: "var(--accent, #c4fd50)",
                  color: "var(--bg, #000)",
                  opacity: tokenBusy ? 0.6 : 1,
                }}
              >
                {tokenBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                Générer
              </button>
            </div>

            {portalUrl && (
              <div
                className="p-3 rounded-lg space-y-2"
                style={{ background: "var(--surface-2, #ffffff08)" }}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={portalUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 text-[11px] font-mono bg-transparent border-0 outline-none"
                    style={{ color: "var(--text)" }}
                  />
                  <button
                    type="button"
                    onClick={handleCopyPortal}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md transition-all glass-hover"
                    style={{ color: "var(--text)" }}
                  >
                    {portalCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {portalCopied ? "Copié" : "Copier"}
                  </button>
                </div>
                {portalExpires && (
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Expire le {new Date(portalExpires).toLocaleString("fr-FR")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Uploader */}
          <div className="space-y-3 fade-up-2">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Documents du dossier
            </h2>
            {loading ? (
              <div className="glass rounded-xl p-6 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>
                Chargement…
              </div>
            ) : (
              <ReleaseFormUploader
                modelId={modelId}
                dossier={dossier}
                onUploaded={handleUploaded}
              />
            )}
          </div>

          {/* Submit button */}
          {status !== "validated" && (
            <div className="fade-up-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full inline-flex items-center justify-center gap-2 text-[13px] px-4 py-3 rounded-lg font-semibold transition-all"
                style={{
                  background: canSubmit ? "var(--accent, #c4fd50)" : "var(--surface-2)",
                  color: canSubmit ? "var(--bg, #000)" : "var(--text-muted)",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                }}
              >
                {submitBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {status === "submitted_dmca"
                  ? "Dossier déjà soumis à DMCA"
                  : status === "rejected"
                  ? "Resoumettre après correction"
                  : "Marquer comme soumis à DMCA"}
              </button>
            </div>
          )}

          {/* Email generator */}
          <DmcaEmailGenerator modelSlug={modelAlias} />
        </div>
      </div>
    </OsLayout>
  );
}
