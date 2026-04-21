"use client";

/**
 * ReleaseFormUploader — 5 uploads séquentiels (admin scope)
 *
 *   1. release_form_pdf    (PDF)
 *   2. id_recto            (JPG/PNG/WEBP)
 *   3. id_verso            (JPG/PNG/WEBP)
 *   4. headshot_dated      (JPG/PNG/WEBP)
 *   5. full_body           (JPG/PNG/WEBP)
 *
 * Chaque upload :
 *   - POST /api/agence/dmca/{model_id}/upload → signed URL Supabase
 *   - PUT direct au signed URL
 *   - puis POST /api/agence/dmca/{model_id} avec la column path correspondante
 *
 * Agent 7.B — Heaven / Phase 7
 */

import { useCallback, useState } from "react";
import { Upload, CheckCircle2, FileText, Loader2, AlertCircle, Image as ImageIcon } from "lucide-react";

export type DocType =
  | "release_form_pdf"
  | "id_recto"
  | "id_verso"
  | "headshot_dated"
  | "full_body";

interface DocSpec {
  id: DocType;
  label: string;
  description: string;
  mime: string[];
  acceptAttr: string;
  maxMB: number;
  dossierKey:
    | "release_form_pdf_url"
    | "id_document_recto_url"
    | "id_document_verso_url"
    | "headshot_dated_url"
    | "full_body_url";
  iconKind: "pdf" | "image";
}

const DOCS: DocSpec[] = [
  {
    id: "release_form_pdf",
    label: "Release Form signé (PDF)",
    description: "Fichier PDF du formulaire Fanvue signé",
    mime: ["application/pdf"],
    acceptAttr: "application/pdf,.pdf",
    maxMB: 20,
    dossierKey: "release_form_pdf_url",
    iconKind: "pdf",
  },
  {
    id: "id_recto",
    label: "Pièce d'identité — recto",
    description: "JPG / PNG / WEBP, lisible, non rogné",
    mime: ["image/jpeg", "image/png", "image/webp"],
    acceptAttr: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
    maxMB: 20,
    dossierKey: "id_document_recto_url",
    iconKind: "image",
  },
  {
    id: "id_verso",
    label: "Pièce d'identité — verso",
    description: "JPG / PNG / WEBP",
    mime: ["image/jpeg", "image/png", "image/webp"],
    acceptAttr: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
    maxMB: 20,
    dossierKey: "id_document_verso_url",
    iconKind: "image",
  },
  {
    id: "headshot_dated",
    label: "Headshot daté avec username",
    description: "Photo visage tenant papier avec date + username « yumiclub »",
    mime: ["image/jpeg", "image/png", "image/webp"],
    acceptAttr: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
    maxMB: 20,
    dossierKey: "headshot_dated_url",
    iconKind: "image",
  },
  {
    id: "full_body",
    label: "Plan entier non retouché",
    description: "Photo corps entier sans filtre ni retouche",
    mime: ["image/jpeg", "image/png", "image/webp"],
    acceptAttr: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
    maxMB: 20,
    dossierKey: "full_body_url",
    iconKind: "image",
  },
];

type Dossier = Partial<Record<DocSpec["dossierKey"], string | null>>;

interface Props {
  modelId: string;
  dossier: Dossier | null;
  onUploaded: (key: DocSpec["dossierKey"], path: string) => void;
  /** Custom API base — default uses admin endpoint. Override for portal. */
  apiBase?: string;
}

export function ReleaseFormUploader({ modelId, dossier, onUploaded, apiBase }: Props) {
  const base = apiBase || `/api/agence/dmca/${modelId}`;
  const [busy, setBusy] = useState<DocType | null>(null);
  const [errors, setErrors] = useState<Record<DocType, string | null>>({
    release_form_pdf: null,
    id_recto: null,
    id_verso: null,
    headshot_dated: null,
    full_body: null,
  });

  const setError = useCallback((id: DocType, msg: string | null) => {
    setErrors((e) => ({ ...e, [id]: msg }));
  }, []);

  const upload = useCallback(
    async (spec: DocSpec, file: File) => {
      setError(spec.id, null);

      // Validate mime
      if (!spec.mime.includes(file.type)) {
        setError(spec.id, `Format invalide (${file.type}). Attendu : ${spec.mime.join(", ")}`);
        return;
      }
      // Validate size
      if (file.size / (1024 * 1024) > spec.maxMB) {
        setError(spec.id, `Fichier trop lourd (${(file.size / 1048576).toFixed(1)}MB). Max ${spec.maxMB}MB`);
        return;
      }

      setBusy(spec.id);
      try {
        // 1. Get signed upload URL
        const urlRes = await fetch(`${base}/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc_type: spec.id, content_type: file.type }),
        });
        if (!urlRes.ok) {
          const j = await urlRes.json().catch(() => ({}));
          throw new Error(j.error || `Signed URL failed (${urlRes.status})`);
        }
        const { upload_url, full_path } = await urlRes.json();

        // 2. PUT file to signed URL
        const putRes = await fetch(upload_url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putRes.ok) {
          throw new Error(`Upload PUT failed (${putRes.status})`);
        }

        // 3. Persist path reference in dossier (admin endpoint only)
        if (!apiBase) {
          const saveRes = await fetch(base, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [spec.dossierKey]: full_path }),
          });
          if (!saveRes.ok) {
            const j = await saveRes.json().catch(() => ({}));
            throw new Error(j.error || `Save failed (${saveRes.status})`);
          }
        }

        onUploaded(spec.dossierKey, full_path);
      } catch (e) {
        setError(spec.id, e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(null);
      }
    },
    [base, onUploaded, setError, apiBase]
  );

  // Sequential enforcement: next step unlocks only when previous is uploaded
  const isUnlocked = (idx: number): boolean => {
    if (idx === 0) return true;
    const prev = DOCS[idx - 1];
    return Boolean(dossier?.[prev.dossierKey]);
  };

  return (
    <div className="space-y-3">
      {DOCS.map((spec, idx) => {
        const uploaded = Boolean(dossier?.[spec.dossierKey]);
        const isBusy = busy === spec.id;
        const unlocked = isUnlocked(idx);
        const err = errors[spec.id];

        return (
          <div
            key={spec.id}
            className={`glass rounded-xl p-4 transition-all ${!unlocked ? "opacity-50" : ""}`}
          >
            <div className="flex items-start gap-3">
              {/* Step number + icon */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: uploaded
                    ? "var(--accent, #c4fd50)"
                    : "var(--surface-2, #ffffff0d)",
                  color: uploaded ? "var(--bg, #000)" : "var(--text-muted)",
                }}
              >
                {uploaded ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : spec.iconKind === "pdf" ? (
                  <FileText className="w-4 h-4" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                    {idx + 1}/5
                  </span>
                  <h4 className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                    {spec.label}
                  </h4>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {spec.description}
                </p>

                {err && (
                  <div
                    className="mt-2 flex items-start gap-1.5 text-[11px]"
                    style={{ color: "#fca5a5" }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{err}</span>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="flex-shrink-0">
                {uploaded ? (
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg cursor-pointer glass-hover transition-all"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Remplacer
                    <input
                      type="file"
                      hidden
                      accept={spec.acceptAttr}
                      disabled={isBusy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) upload(spec, f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                ) : (
                  <label
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg font-medium transition-all ${
                      unlocked ? "cursor-pointer" : "cursor-not-allowed"
                    }`}
                    style={{
                      background: unlocked ? "var(--accent, #c4fd50)" : "var(--surface-2)",
                      color: unlocked ? "var(--bg, #000)" : "var(--text-muted)",
                    }}
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Envoi…
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        Choisir
                      </>
                    )}
                    <input
                      type="file"
                      hidden
                      accept={spec.acceptAttr}
                      disabled={!unlocked || isBusy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) upload(spec, f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
