"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Send, X, ExternalLink } from "lucide-react";
import type { FeedItem } from "@/types/heaven";

/**
 * Lightbox modal for a single feed item :
 *  - Image full size (16:9 max with object-contain)
 *  - Caption complète
 *  - Liste des commentaires (GET /api/feed-items/[id]/comments)
 *  - Saisie nouveau commentaire (POST) — désactivée si pas de clientId
 *  - Bouton like (POST /api/feed-items/[id]/like) avec optimistic update
 *  - Esc keyboard + click backdrop pour fermer
 *
 * Style : sombre cohérent admin-auth-modal.tsx, blur backdrop, max-w-2xl.
 */

interface FeedComment {
  id: string;
  feed_item_id: string;
  client_id: string;
  content: string;
  created_at: string;
  author_pseudo?: string | null;
  author_avatar?: string | null;
}

interface FeedItemDetailModalProps {
  item: FeedItem;
  clientId?: string | null;
  modelSlug: string;
  onClose: () => void;
  /** Optional initial liked state */
  initialLiked?: boolean;
}

const COMMENT_MAX = 500;
const COMMENT_MIN = 1;

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function FeedItemDetailModal({
  item,
  clientId,
  modelSlug: _modelSlug,
  onClose,
  initialLiked = false,
}: FeedItemDetailModalProps) {
  // ── Like state ─────────────────────────────────────────────────────────────
  const [liked, setLiked] = useState<boolean>(initialLiked);
  const [likeCount, setLikeCount] = useState<number>(item.like_count || 0);
  const [likeBusy, setLikeBusy] = useState<boolean>(false);

  // ── Comments state ─────────────────────────────────────────────────────────
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [posting, setPosting] = useState<boolean>(false);
  const [postError, setPostError] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Esc to close ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Lock scroll while open ─────────────────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ── Fetch comments on mount ────────────────────────────────────────────────
  useEffect(() => {
    let aborted = false;
    setCommentsLoading(true);
    setCommentsError(null);
    fetch(`/api/feed-items/${item.id}/comments?limit=50`)
      .then((r) => (r.ok ? r.json() : { comments: [], total: 0 }))
      .then((d) => {
        if (aborted) return;
        const list: FeedComment[] = Array.isArray(d.comments) ? d.comments : [];
        // Tri DESC date (plus récent en premier).
        list.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setComments(list);
      })
      .catch(() => {
        if (!aborted) setCommentsError("Impossible de charger les commentaires");
      })
      .finally(() => {
        if (!aborted) setCommentsLoading(false);
      });
    return () => {
      aborted = true;
    };
  }, [item.id]);

  // ── Like handler ───────────────────────────────────────────────────────────
  const handleLike = useCallback(async () => {
    if (!clientId || likeBusy) return;
    const wasLiked = liked;
    const prevCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    setLikeBusy(true);
    try {
      const res = await fetch(`/api/feed-items/${item.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) throw new Error("like failed");
      const data = (await res.json()) as { liked: boolean; likeCount: number };
      setLiked(!!data.liked);
      setLikeCount(typeof data.likeCount === "number" ? data.likeCount : prevCount);
    } catch {
      setLiked(wasLiked);
      setLikeCount(prevCount);
    } finally {
      setLikeBusy(false);
    }
  }, [clientId, item.id, liked, likeCount, likeBusy]);

  // ── Submit comment ─────────────────────────────────────────────────────────
  const submitComment = useCallback(async () => {
    if (!clientId || posting) return;
    const content = draft.trim();
    if (content.length < COMMENT_MIN) {
      setPostError("Commentaire vide");
      return;
    }
    if (content.length > COMMENT_MAX) {
      setPostError(`Maximum ${COMMENT_MAX} caractères`);
      return;
    }
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch(`/api/feed-items/${item.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, content }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "post failed");
      }
      const data = (await res.json()) as { comment: FeedComment };
      if (data.comment) {
        setComments((prev) => [data.comment, ...prev]);
      }
      setDraft("");
    } catch (e) {
      setPostError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPosting(false);
    }
  }, [clientId, draft, item.id, posting]);

  const isVideo = (item.media_type || "").toLowerCase() === "video";
  const mediaSrc = isVideo
    ? item.thumbnail_url || item.media_url
    : item.media_url || item.thumbnail_url;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5"
      style={{
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Détail du post"
    >
      <div
        className="w-full max-w-2xl rounded-2xl relative overflow-hidden flex flex-col"
        style={{
          background: "linear-gradient(180deg, rgba(28,28,32,0.98), rgba(18,18,22,0.99))",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          maxHeight: "92vh",
          animation: "fadeUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — like + close */}
        <div
          className="flex items-center justify-between px-4 sm:px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            type="button"
            onClick={handleLike}
            disabled={!clientId || likeBusy}
            aria-label={liked ? "Retirer le j'aime" : "J'aime"}
            aria-pressed={liked}
            className="flex items-center gap-1.5 text-sm cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              color: liked ? "#F43F5E" : "rgba(255,255,255,0.7)",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "999px",
              padding: "6px 12px",
            }}
            title={!clientId ? "Connecte-toi pour aimer" : undefined}
          >
            <Heart className="w-4 h-4" fill={liked ? "currentColor" : "none"} />
            <span className="tabular-nums font-semibold">{likeCount}</span>
          </button>

          <div className="flex items-center gap-2">
            {item.external_url && (
              <a
                href={item.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] font-semibold opacity-70 hover:opacity-100 transition-opacity"
                style={{ color: "#fff", textDecoration: "none" }}
              >
                <ExternalLink className="w-3 h-3" /> Source
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="p-1.5 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
              style={{ background: "none", border: "none" }}
            >
              <X className="w-4 h-4" style={{ color: "#fff" }} />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Media */}
          {mediaSrc && (
            <div
              className="w-full flex items-center justify-center"
              style={{ background: "#000", maxHeight: "60vh" }}
            >
              <img
                src={mediaSrc}
                alt=""
                className="max-w-full max-h-[60vh] object-contain"
                loading="eager"
                draggable={false}
              />
            </div>
          )}

          {/* Caption */}
          {item.caption && (
            <div className="px-4 sm:px-5 py-4">
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                {item.caption}
              </p>
              <p
                className="text-[10px] mt-2 opacity-50"
                style={{ color: "#fff" }}
              >
                {timeAgo(item.posted_at)}
              </p>
            </div>
          )}

          {/* Comments list */}
          <div
            className="px-4 sm:px-5 py-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4" style={{ color: "rgba(255,255,255,0.6)" }} />
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                Commentaires
                <span className="ml-1.5 tabular-nums opacity-70">({comments.length})</span>
              </span>
            </div>
            {commentsLoading ? (
              <p className="text-xs opacity-50 py-3" style={{ color: "#fff" }}>
                Chargement…
              </p>
            ) : commentsError ? (
              <p className="text-xs py-3" style={{ color: "#EF4444" }}>
                {commentsError}
              </p>
            ) : comments.length === 0 ? (
              <p className="text-xs opacity-50 py-3" style={{ color: "#fff" }}>
                Sois le premier à commenter
              </p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => (
                  <li key={c.id} className="flex items-start gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      {c.author_avatar ? (
                        <img
                          src={c.author_avatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (c.author_pseudo || "?").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold truncate"
                          style={{ color: "#fff" }}
                        >
                          {c.author_pseudo || "Anonyme"}
                        </span>
                        <span
                          className="text-[10px] shrink-0 opacity-50"
                          style={{ color: "#fff" }}
                        >
                          {timeAgo(c.created_at)}
                        </span>
                      </div>
                      <p
                        className="text-sm mt-0.5 leading-relaxed whitespace-pre-wrap break-words"
                        style={{ color: "rgba(255,255,255,0.85)" }}
                      >
                        {c.content}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer — comment input */}
        <div
          className="px-4 sm:px-5 py-3 shrink-0"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.4)",
          }}
        >
          {clientId ? (
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value.slice(0, COMMENT_MAX));
                  if (postError) setPostError(null);
                }}
                placeholder="Ajouter un commentaire…"
                aria-label="Nouveau commentaire"
                rows={1}
                disabled={posting}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none resize-none disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.08)",
                  maxHeight: 100,
                  minHeight: 38,
                }}
              />
              <button
                type="button"
                onClick={submitComment}
                disabled={posting || draft.trim().length < COMMENT_MIN}
                aria-label="Envoyer"
                className="p-2.5 rounded-xl cursor-pointer transition-all hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #E63329, #A78BFA)",
                  color: "#fff",
                  border: "none",
                }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p
              className="text-xs text-center py-2"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Connecte-toi pour commenter
            </p>
          )}
          {postError && (
            <p className="text-[11px] mt-1.5 text-center" style={{ color: "#EF4444" }}>
              {postError}
            </p>
          )}
          {clientId && draft.length > 0 && (
            <p
              className="text-[10px] mt-1 text-right tabular-nums"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {draft.length}/{COMMENT_MAX}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
