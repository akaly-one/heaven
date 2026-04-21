"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  MessageSquare,
  Send,
  RefreshCw,
  Image as ImageIcon,
  Video,
  X,
} from "lucide-react";

interface IgMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | string;
  media_url?: string;
  thumbnail_url?: string;
  comments_count?: number;
  timestamp?: string;
}

interface IgComment {
  id: string;
  text: string;
  username: string;
  timestamp?: string;
  replies?: IgComment[];
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}j`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function InstagramCommentsList() {
  const [posts, setPosts] = useState<IgMedia[]>([]);
  const [comments, setComments] = useState<IgComment[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch posts list
  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);
    setPostsError(null);
    try {
      const res = await fetch("/api/instagram/media");
      if (res.status === 404) {
        setPostsError("not_configured");
        setPosts([]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: IgMedia[] = Array.isArray(data.posts) ? data.posts : [];
      setPosts(list);
      if (list.length > 0 && !selectedPostId) {
        setSelectedPostId(list[0].id);
      }
    } catch {
      setPostsError("fetch_failed");
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }, [selectedPostId]);

  // Fetch comments for selected post
  const fetchComments = useCallback(async (mediaId: string) => {
    setLoadingComments(true);
    setCommentsError(null);
    try {
      const res = await fetch(
        `/api/instagram/comments?media_id=${encodeURIComponent(mediaId)}`
      );
      if (res.status === 404) {
        setCommentsError("not_configured");
        setComments([]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch {
      setCommentsError("fetch_failed");
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    // fetchPosts only depends on selectedPostId for initial autoselect —
    // safe to disable exhaustive-deps here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPostId) {
      fetchComments(selectedPostId);
      setReplyingTo(null);
      setReplyText("");
    }
  }, [selectedPostId, fetchComments]);

  const selectedPost = useMemo(
    () => posts.find((p) => p.id === selectedPostId),
    [posts, selectedPostId]
  );

  const handleSendReply = async (commentId: string) => {
    const text = replyText.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fetch("/api/instagram/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentId, text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReplyingTo(null);
      setReplyText("");
      // Refresh comments to show the new reply
      if (selectedPostId) await fetchComments(selectedPostId);
    } catch {
      // silent fail — visual indicator remains via replyingTo state
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Post selector */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h2
              className="text-sm font-bold"
              style={{ color: "var(--text)" }}
            >
              Commentaires
            </h2>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Sélectionne un post pour voir et répondre aux commentaires
            </p>
          </div>
          <button
            onClick={() =>
              selectedPostId
                ? fetchComments(selectedPostId)
                : fetchPosts()
            }
            disabled={loadingComments || loadingPosts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-none outline-none"
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border2)",
              color: "var(--text)",
              opacity: loadingComments || loadingPosts ? 0.5 : 1,
            }}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loadingComments || loadingPosts ? "animate-spin" : ""
              }`}
            />
            Rafraîchir
          </button>
        </div>

        {loadingPosts && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-16 h-16 rounded-lg flex-shrink-0 animate-pulse"
                style={{
                  background: "var(--bg2)",
                  border: "1px solid var(--border2)",
                }}
              />
            ))}
          </div>
        )}

        {!loadingPosts && postsError === "not_configured" && (
          <p
            className="text-[11px] py-2"
            style={{ color: "var(--text-muted)" }}
          >
            Connexion Instagram en cours de configuration.
          </p>
        )}

        {!loadingPosts && postsError === "fetch_failed" && (
          <p
            className="text-[11px] py-2"
            style={{ color: "var(--text-muted)" }}
          >
            Impossible de charger les posts.
          </p>
        )}

        {!loadingPosts && !postsError && posts.length === 0 && (
          <p
            className="text-[11px] py-2"
            style={{ color: "var(--text-muted)" }}
          >
            Aucun post disponible.
          </p>
        )}

        {!loadingPosts && !postsError && posts.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {posts.map((post) => {
              const isSelected = post.id === selectedPostId;
              const isVideo = post.media_type === "VIDEO";
              const src = isVideo
                ? post.thumbnail_url || post.media_url
                : post.media_url || post.thumbnail_url;
              return (
                <button
                  key={post.id}
                  onClick={() => setSelectedPostId(post.id)}
                  className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border-none outline-none p-0"
                  style={{
                    border: isSelected
                      ? "2px solid #E1306C"
                      : "1px solid var(--border2)",
                    background: "var(--bg2)",
                  }}
                  title={`${post.comments_count ?? 0} commentaires`}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt="thumbnail"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon
                        className="w-5 h-5"
                        style={{ color: "var(--text-muted)" }}
                      />
                    </div>
                  )}
                  {isVideo && (
                    <div
                      className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.55)" }}
                    >
                      <Video className="w-2 h-2 text-white" />
                    </div>
                  )}
                  {(post.comments_count ?? 0) > 0 && (
                    <div
                      className="absolute bottom-0 left-0 right-0 text-[9px] text-white font-bold text-center py-0.5"
                      style={{ background: "rgba(0,0,0,0.65)" }}
                    >
                      {post.comments_count}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Current post caption strip */}
      {selectedPost && (
        <div
          className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
          style={{
            borderBottom: "1px solid var(--border)",
            background: "var(--bg2)",
          }}
        >
          <MessageSquare
            className="w-3.5 h-3.5 flex-shrink-0"
            style={{ color: "#E1306C" }}
          />
          <p
            className="text-[11px] truncate"
            style={{ color: "var(--text-muted)" }}
          >
            {selectedPost.caption
              ? selectedPost.caption.slice(0, 100) +
                (selectedPost.caption.length > 100 ? "..." : "")
              : "Sans légende"}
          </p>
          <span
            className="text-[10px] ml-auto flex-shrink-0 tabular-nums"
            style={{ color: "var(--text-muted)" }}
          >
            {selectedPost.comments_count ?? 0} commentaires
          </span>
        </div>
      )}

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!selectedPostId && !loadingPosts && (
          <EmptyCommentsState
            title="Sélectionne un post"
            subtitle="Choisis un post ci-dessus pour afficher ses commentaires."
          />
        )}

        {selectedPostId && loadingComments && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-lg animate-pulse"
                style={{
                  background: "var(--bg2)",
                  border: "1px solid var(--border2)",
                  height: 72,
                }}
              />
            ))}
          </div>
        )}

        {selectedPostId &&
          !loadingComments &&
          commentsError === "not_configured" && (
            <EmptyCommentsState
              title="Connexion Instagram en cours de configuration"
              subtitle="Les commentaires seront disponibles une fois le token configuré."
            />
          )}

        {selectedPostId &&
          !loadingComments &&
          commentsError === "fetch_failed" && (
            <EmptyCommentsState
              title="Impossible de charger les commentaires"
              subtitle="Vérifie la connexion Instagram dans l'onglet Config."
            />
          )}

        {selectedPostId &&
          !loadingComments &&
          !commentsError &&
          comments.length === 0 && (
            <EmptyCommentsState
              title="Aucun commentaire"
              subtitle="Les commentaires de ce post apparaîtront ici."
            />
          )}

        {selectedPostId &&
          !loadingComments &&
          !commentsError &&
          comments.length > 0 && (
            <div className="space-y-2">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  replyingTo={replyingTo}
                  replyText={replyText}
                  sending={sending}
                  onReply={() => {
                    setReplyingTo(comment.id);
                    setReplyText("");
                  }}
                  onCancelReply={() => {
                    setReplyingTo(null);
                    setReplyText("");
                  }}
                  onChangeReplyText={setReplyText}
                  onSend={() => handleSendReply(comment.id)}
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function CommentItem({
  comment,
  replyingTo,
  replyText,
  sending,
  onReply,
  onCancelReply,
  onChangeReplyText,
  onSend,
}: {
  comment: IgComment;
  replyingTo: string | null;
  replyText: string;
  sending: boolean;
  onReply: () => void;
  onCancelReply: () => void;
  onChangeReplyText: (v: string) => void;
  onSend: () => void;
}) {
  const isReplying = replyingTo === comment.id;

  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border2)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--text)" }}
            >
              @{comment.username}
            </span>
            {comment.timestamp && (
              <span
                className="text-[10px] tabular-nums"
                style={{ color: "var(--text-muted)" }}
              >
                · {timeAgo(comment.timestamp)}
              </span>
            )}
          </div>
          <p
            className="text-xs leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--text)" }}
          >
            {comment.text}
          </p>
        </div>
        {!isReplying && (
          <button
            onClick={onReply}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer border-none outline-none flex-shrink-0"
            style={{
              background: "rgba(225,48,108,0.12)",
              color: "#E1306C",
            }}
          >
            <MessageSquare className="w-3 h-3" />
            Répondre
          </button>
        )}
      </div>

      {/* Existing replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div
          className="mt-2 pl-3 space-y-2"
          style={{ borderLeft: "2px solid var(--border2)" }}
        >
          {comment.replies.map((reply) => (
            <div key={reply.id} className="text-[11px]">
              <span
                className="font-semibold mr-1.5"
                style={{ color: "var(--text)" }}
              >
                @{reply.username}
              </span>
              <span style={{ color: "var(--text)" }}>{reply.text}</span>
              {reply.timestamp && (
                <span
                  className="ml-1.5 text-[10px] tabular-nums"
                  style={{ color: "var(--text-muted)" }}
                >
                  · {timeAgo(reply.timestamp)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Inline reply form */}
      {isReplying && (
        <div
          className="mt-3 pt-3"
          style={{ borderTop: "1px dashed var(--border2)" }}
        >
          <textarea
            value={replyText}
            onChange={(e) => onChangeReplyText(e.target.value)}
            placeholder={`Répondre à @${comment.username}...`}
            rows={2}
            className="w-full bg-transparent border rounded-lg px-3 py-2 text-xs resize-none outline-none"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border2)",
              color: "var(--text)",
            }}
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={onCancelReply}
              disabled={sending}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium cursor-pointer border-none outline-none"
              style={{
                background: "var(--bg3)",
                color: "var(--text-muted)",
              }}
            >
              <X className="w-3 h-3" />
              Annuler
            </button>
            <button
              onClick={onSend}
              disabled={!replyText.trim() || sending}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium cursor-pointer border-none outline-none"
              style={{
                background: replyText.trim()
                  ? "linear-gradient(135deg, #833AB4, #E1306C, #F77737)"
                  : "var(--bg3)",
                color: replyText.trim() ? "#fff" : "var(--text-muted)",
                opacity: sending ? 0.5 : 1,
              }}
            >
              <Send className="w-3 h-3" />
              {sending ? "Envoi..." : "Envoyer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyCommentsState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(131,58,180,0.15), rgba(225,48,108,0.15), rgba(247,119,55,0.15))",
        }}
      >
        <MessageSquare
          className="w-6 h-6"
          style={{ color: "var(--text-muted)" }}
        />
      </div>
      <p
        className="text-sm font-medium mb-1"
        style={{ color: "var(--text)" }}
      >
        {title}
      </p>
      <p
        className="text-[11px] max-w-xs"
        style={{ color: "var(--text-muted)" }}
      >
        {subtitle}
      </p>
    </div>
  );
}
