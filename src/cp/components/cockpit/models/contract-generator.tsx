"use client";

import { useMemo, useState } from "react";
import { FileSignature, Upload, Loader2, RefreshCw } from "lucide-react";
import {
  generateContractMarkdown,
  type ContractMode,
  type ContractIdentityPlan,
  type ContractPalier,
  type ContractStatut,
} from "@/shared/templates/contract-templates";

interface ContractGeneratorProps {
  modelId: string;
  pseudo: string;
  mode: ContractMode | null;
  identityPlan: ContractIdentityPlan | null;
  palier: ContractPalier | null;
  statutInitial: ContractStatut | null;
  currentVersion: number;
  authHeaders: () => HeadersInit;
  onUploaded?: () => void;
}

/**
 * Agent 7.C — Contract generator (template Markdown → upload).
 *
 * Genere un contrat type selon (Mode, Plan Identite, Palier, Statut) depuis
 * src/shared/templates/contract-templates/index.ts (stockage LOCAL, P0 conf).
 * Upload vers bucket prive contracts-private via POST /contract.
 *
 * Support aussi upload fichier externe (PDF deja signe).
 */
export function ContractGenerator({
  modelId,
  pseudo,
  mode,
  identityPlan,
  palier,
  statutInitial,
  currentVersion,
  authHeaders,
  onUploaded,
}: ContractGeneratorProps) {
  const [amendmentReason, setAmendmentReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const nextVersion = currentVersion + 1;

  const preview = useMemo(() => {
    if (!mode || !identityPlan || !palier) return "";
    return generateContractMarkdown({
      mode,
      identity_plan: identityPlan,
      palier,
      statut_initial: statutInitial ?? undefined,
      pseudo,
      model_id: modelId,
      date_signature: new Date().toISOString().split("T")[0],
      version: nextVersion,
      amendment_reason: amendmentReason.trim() || undefined,
    });
  }, [mode, identityPlan, palier, statutInitial, pseudo, modelId, nextVersion, amendmentReason]);

  async function uploadGenerated() {
    if (!preview) {
      setFeedback("Profil incomplet — definir mode/plan identite/palier d'abord.");
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/agence/models/${modelId}/contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          generated_markdown: preview,
          amendment_reason: amendmentReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Erreur upload");
        return;
      }
      setFeedback(`Version v${data.version.version} creee et signee.`);
      onUploaded?.();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Erreur reseau");
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile() {
    if (!file) return;
    setLoading(true);
    setFeedback(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (amendmentReason.trim()) fd.append("amendment_reason", amendmentReason.trim());
      const res = await fetch(`/api/agence/models/${modelId}/contract`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Erreur upload");
        return;
      }
      setFeedback(`Version v${data.version.version} uploadee.`);
      setFile(null);
      onUploaded?.();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Erreur reseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <FileSignature size={18} style={{ color: "var(--accent)" }} />
        <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Nouveau contrat (v{nextVersion})
        </h3>
      </header>

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Le template est genere localement (pas d&apos;exposition externe). Templates
        dans <code>src/shared/templates/contract-templates/</code>. Parametres
        lus : mode={mode ?? "—"} / plan={identityPlan ?? "—"} / palier=
        {palier ?? "—"} / statut={statutInitial ?? "—"}.
      </p>

      <div className="space-y-2">
        <label
          className="block text-[11px] font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          Motif / avenant
        </label>
        <input
          value={amendmentReason}
          onChange={(e) => setAmendmentReason(e.target.value)}
          placeholder="Ex : premiere signature / bascule P2→P3 / changement plan identite"
          className="w-full rounded-md px-3 py-2 text-[13px]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
      </div>

      {/* Preview */}
      {preview && (
        <details className="glass rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
          <summary
            className="cursor-pointer text-[12px] font-medium"
            style={{ color: "var(--text)" }}
          >
            Voir le template genere
          </summary>
          <pre
            className="mt-3 overflow-auto max-h-80 whitespace-pre-wrap text-[10px]"
            style={{ color: "var(--text-muted)" }}
          >
            {preview}
          </pre>
        </details>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={uploadGenerated}
          disabled={loading || !preview}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-[12px] font-semibold disabled:opacity-40"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Generer & enregistrer
        </button>

        <label
          className="inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-[12px] font-semibold"
          style={{
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          <Upload size={14} />
          Importer PDF signe
          <input
            type="file"
            accept="application/pdf,.md,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>

        {file && (
          <button
            type="button"
            onClick={uploadFile}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-[12px] font-semibold disabled:opacity-40"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Uploader {file.name}
          </button>
        )}
      </div>

      {feedback && (
        <div
          className="rounded-md px-3 py-2 text-[12px]"
          style={{
            background: feedback.includes("Erreur")
              ? "rgba(239,68,68,0.1)"
              : "rgba(34,197,94,0.1)",
            color: feedback.includes("Erreur") ? "#ef4444" : "#22c55e",
          }}
        >
          {feedback}
        </div>
      )}
    </div>
  );
}
