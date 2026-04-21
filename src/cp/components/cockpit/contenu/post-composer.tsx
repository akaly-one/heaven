"use client";

// ══════════════════════════════════════════════════════════════════════════
//  PostComposer — create a new feed/story/wall post
//
//  Responsibilities:
//   - File selection (image/video).
//   - CLIENT-DIRECT Cloudinary upload using `/api/upload/signed-url` (B8).
//     Legacy base64 POST to /api/upload is intentionally bypassed — avoids
//     the 10MB Vercel body limit and frees the lambda.
//   - Live upload progress bar (XHR fallback, since fetch has no progress API).
//   - Checkbox "Publier aussi sur Instagram" — visible ONLY when:
//       a) model has an active instagram_config (detected once on mount), and
//       b) model_id === "m1" (Yumi only — per brief P1-5).
//   - After creating the post row, optionally POST to
//     /api/posts/[id]/publish-ig.
//
//  Out of scope (other Agent 5.X owners):
//   - Drag & drop    (Agent 5.A)
//   - Pack visibility (Agent 5.B)
//   - Messagerie     (Phase 4)
// ══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Instagram,
  Loader2,
  Send,
  Sparkles,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// ── IG eligibility constant ──
// Only m1 (Yumi) has IG publishing enabled in Phase 5. Update when more
// models onboard — this gate is defensive in addition to the API check.
const IG_ENABLED_MODELS = new Set(["m1"]);

type PostType = "feed" | "story" | "wall";
type TierId = "public" | "p1" | "p2" | "p3" | "p4" | "p5";

export interface PostComposerProps {
  /** Model slug OR mN. Internal calls normalise to mN. */
  modelSlug: string;
  /** Resolved model_id (mN). Passed to the composer so it doesn't have to re-resolve. */
  modelId: string;
  /** Auth headers provider (same pattern used by packs-editor etc). */
  authHeaders: () => HeadersInit;
  /** Called once a post has been persisted (parent refetches the feed). */
  onPosted?: (postId: string) => void;
}

interface UploadedMedia {
  url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  resource_type: "image" | "video";
}

interface SignedUrlPayload {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string;
  tags?: string;
  eager?: string;
  upload_url: string;
  expires_in_seconds: number;
}

export function PostComposer({ modelSlug, modelId, authHeaders, onPosted }: PostComposerProps) {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PostType>("feed");
  const [tier, setTier] = useState<TierId>("public");
  const [publishToIg, setPublishToIg] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedMedia | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [posting, setPosting] = useState(false);
  const [igAvailable, setIgAvailable] = useState<boolean | null>(null); // null = unknown
  const [toast, setToast] = useState<{ kind: "ok" | "err" | "info"; msg: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<XMLHttpRequest | null>(null);

  // ── Preview URL mgmt (revoke on unmount) ───────────────────────────────
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── Toast auto-dismiss ─────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Check IG availability on mount ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    // Quick client-side gate first
    if (!IG_ENABLED_MODELS.has(modelId)) {
      setIgAvailable(false);
      return;
    }
    (async () => {
      try {
        const r = await fetch(`/api/instagram/config?model=${modelId}`, {
          headers: authHeaders(),
        });
        if (!r.ok) {
          if (!cancelled) setIgAvailable(false);
          return;
        }
        const d = await r.json();
        if (!cancelled) setIgAvailable(Boolean(d?.config?.is_active));
      } catch {
        if (!cancelled) setIgAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  const isVideo = useMemo(() => file?.type.startsWith("video/") ?? false, [file]);
  const resourceType: "image" | "video" | "auto" = isVideo ? "video" : "image";

  // ── Handlers ───────────────────────────────────────────────────────────
  const onPickFile = (f: File | null) => {
    setUploaded(null);
    setUploadPct(0);
    setFile(f);
  };

  const cancelUpload = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploading(false);
    setUploadPct(0);
  };

  /**
   * Upload the selected file to Cloudinary directly from the browser.
   * We XHR (not fetch) because fetch has no upload-progress API.
   */
  const uploadDirect = useCallback(async (): Promise<UploadedMedia | null> => {
    if (!file) return null;
    setUploading(true);
    setUploadPct(0);
    try {
      // 1. Get signed payload from our server
      const folderSuffix = postType === "story" ? "stories" : "content";
      const signRes = await fetch("/api/upload/signed-url", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: modelId,
          folder_suffix: folderSuffix,
          tags: [`type:${postType}`, `tier:${tier}`],
        }),
      });
      if (!signRes.ok) {
        const d = await signRes.json().catch(() => ({}));
        throw new Error(d.error || `signed-url ${signRes.status}`);
      }
      const signed = (await signRes.json()) as SignedUrlPayload;

      // 2. Browser-direct POST to Cloudinary
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", signed.api_key);
      form.append("timestamp", String(signed.timestamp));
      form.append("signature", signed.signature);
      form.append("folder", signed.folder);
      if (signed.tags) form.append("tags", signed.tags);
      if (signed.eager) form.append("eager", signed.eager);

      const result = await new Promise<UploadedMedia>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        abortRef.current = xhr;
        xhr.open("POST", signed.upload_url);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setUploadPct(Math.round((ev.loaded / ev.total) * 100));
          }
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({
                url: data.secure_url,
                public_id: data.public_id,
                width: data.width,
                height: data.height,
                format: data.format,
                bytes: data.bytes,
                resource_type: (data.resource_type || resourceType) as "image" | "video",
              });
            } else {
              reject(new Error(data?.error?.message || `Cloudinary ${xhr.status}`));
            }
          } catch (e) {
            reject(e instanceof Error ? e : new Error("parse failed"));
          }
        };
        xhr.onerror = () => reject(new Error("network error"));
        xhr.onabort = () => reject(new Error("aborted"));
        xhr.send(form);
      });

      abortRef.current = null;
      setUploaded(result);
      setUploadPct(100);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "upload failed";
      setToast({ kind: "err", msg: `Upload: ${msg}` });
      return null;
    } finally {
      setUploading(false);
    }
  }, [file, modelId, postType, tier, authHeaders, resourceType]);

  /**
   * Submit: (a) upload if not yet done, (b) create post row, (c) optional IG publish.
   */
  const submit = async () => {
    if (!content.trim() && !file && !uploaded) {
      setToast({ kind: "err", msg: "Ajoute du texte ou un média" });
      return;
    }
    setPosting(true);
    try {
      // Upload if a file is picked but not yet uploaded
      let media = uploaded;
      if (file && !media) {
        media = await uploadDirect();
        if (!media) {
          setPosting(false);
          return;
        }
      }

      // Create the post
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelSlug,
          content: content.trim() || null,
          media_url: media?.url || null,
          media_type: media?.resource_type || null,
          tier_required: tier,
          post_type: postType,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `post ${res.status}`);
      }
      const { post } = await res.json();
      const postId: string = post.id;
      setToast({ kind: "ok", msg: "Post publié" });

      // Optional IG cross-post
      if (publishToIg && igAvailable && media) {
        try {
          const ig = await fetch(`/api/posts/${postId}/publish-ig`, {
            method: "POST",
            headers: authHeaders(),
          });
          const ij = await ig.json().catch(() => ({}));
          if (ig.ok && ij.ok) {
            setToast({
              kind: "ok",
              msg: ij.pending_processing
                ? "IG: traitement en cours (vidéo)"
                : "Publié sur IG",
            });
          } else if (ij.devMode) {
            setToast({
              kind: "info",
              msg: "IG en DevMode (App Review requis). Post web OK.",
            });
          } else {
            setToast({
              kind: "err",
              msg: `IG: ${ij.error || "échec"} — post web sauvé`,
            });
          }
        } catch {
          setToast({ kind: "err", msg: "IG indisponible, post web sauvé" });
        }
      }

      // Reset
      setContent("");
      setFile(null);
      setUploaded(null);
      setUploadPct(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onPosted?.(postId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erreur";
      setToast({ kind: "err", msg });
    } finally {
      setPosting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  const igCheckboxVisible = igAvailable === true;

  return (
    <div
      className="rounded-2xl border p-4 space-y-3"
      style={{
        background: "rgba(20,20,22,0.8)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      {/* ── Text ── */}
      <div>
        <label className="text-[11px] uppercase tracking-widest opacity-60 block mb-1">
          Texte
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Écris ton post…"
          className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          disabled={posting || uploading}
        />
      </div>

      {/* ── Media picker ── */}
      <div>
        <label className="text-[11px] uppercase tracking-widest opacity-60 block mb-1">
          Média
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          className="hidden"
          id="post-composer-file"
          disabled={posting || uploading}
        />
        {!file && !uploaded ? (
          <label
            htmlFor="post-composer-file"
            className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-white/15 px-3 py-3 hover:bg-white/5 transition-colors"
          >
            <ImageIcon className="w-4 h-4 opacity-60" />
            <span className="text-sm opacity-80">Choisir une image ou vidéo</span>
          </label>
        ) : (
          <div className="rounded-lg border border-white/10 p-2 flex items-center gap-3">
            {preview && !isVideo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={uploaded?.url || preview}
                alt=""
                className="w-16 h-16 object-cover rounded"
              />
            )}
            {preview && isVideo && (
              <video
                src={uploaded?.url || preview}
                className="w-16 h-16 object-cover rounded bg-black"
                muted
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs truncate opacity-80">
                {file?.name ?? uploaded?.public_id}
              </div>
              <div className="text-[10px] opacity-50">
                {file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : null}
                {uploaded ? ` • ${uploaded.format} • ${uploaded.width}×${uploaded.height}` : null}
              </div>
              {uploading && (
                <div className="mt-1 h-1 w-full bg-white/10 rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-[width]"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
              )}
            </div>
            {uploading ? (
              <button
                type="button"
                onClick={cancelUpload}
                className="p-1.5 rounded hover:bg-white/10"
                title="Annuler"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setUploaded(null);
                  setUploadPct(0);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="p-1.5 rounded hover:bg-white/10"
                title="Retirer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Type + Tier ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] uppercase tracking-widest opacity-60 block mb-1">
            Type
          </label>
          <select
            value={postType}
            onChange={(e) => setPostType(e.target.value as PostType)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm"
            disabled={posting || uploading}
          >
            <option value="feed">Feed</option>
            <option value="story">Story (24h)</option>
            <option value="wall">Wall</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-widest opacity-60 block mb-1">
            Accès
          </label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as TierId)}
            className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm"
            disabled={posting || uploading}
          >
            <option value="public">Public</option>
            <option value="p1">P1</option>
            <option value="p2">P2</option>
            <option value="p3">P3</option>
            <option value="p4">P4</option>
            <option value="p5">P5</option>
          </select>
        </div>
      </div>

      {/* ── IG cross-post toggle ── */}
      {igCheckboxVisible && (
        <label className="flex items-center gap-2 text-sm cursor-pointer group">
          <input
            type="checkbox"
            checked={publishToIg}
            onChange={(e) => setPublishToIg(e.target.checked)}
            disabled={posting || uploading || !uploaded && !file}
            className="accent-pink-500"
          />
          <Instagram className="w-4 h-4" style={{ color: "#E1306C" }} />
          <span className="group-hover:opacity-100 opacity-80">
            Publier aussi sur Instagram
          </span>
          <span className="text-[10px] opacity-50">
            (requiert un média • App Review pending)
          </span>
        </label>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 text-[11px] opacity-50">
          <Sparkles className="w-3 h-3" />
          <span>Upload direct Cloudinary</span>
        </div>
        <div className="flex items-center gap-2">
          {file && !uploaded && !uploading && (
            <button
              type="button"
              onClick={uploadDirect}
              className="px-3 py-1.5 rounded-lg text-sm border border-white/15 hover:bg-white/5 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Uploader
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={posting || uploading}
            className="px-4 py-1.5 rounded-lg text-sm bg-white text-black disabled:opacity-50 flex items-center gap-2"
          >
            {posting || uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Publier
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 border"
          style={{
            background:
              toast.kind === "ok"
                ? "rgba(16,185,129,0.12)"
                : toast.kind === "err"
                ? "rgba(239,68,68,0.12)"
                : "rgba(99,102,241,0.12)",
            borderColor:
              toast.kind === "ok"
                ? "rgba(16,185,129,0.3)"
                : toast.kind === "err"
                ? "rgba(239,68,68,0.3)"
                : "rgba(99,102,241,0.3)",
            color:
              toast.kind === "ok"
                ? "#10B981"
                : toast.kind === "err"
                ? "#EF4444"
                : "#818CF8",
          }}
        >
          {toast.kind === "ok" ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5" />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
