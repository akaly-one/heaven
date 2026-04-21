"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Heart,
  MessageSquare,
  RefreshCw,
  X,
  ExternalLink,
  Image as ImageIcon,
  Video,
} from "lucide-react";

interface IgMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

export function InstagramMediaGrid() {
  const [posts, setPosts] = useState<IgMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<IgMedia | null>(null);

  const fetchPosts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/instagram/media");
      if (res.status === 404) {
        setError("not_configured");
        setPosts([]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch {
      setError("fetch_failed");
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0 sticky top-0 z-10"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div>
          <h2
            className="text-sm font-bold"
            style={{ color: "var(--text)" }}
          >
            {posts.length > 0 ? `${posts.length} derniers posts` : "Derniers posts"}
          </h2>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Contenu publié sur Instagram
          </p>
        </div>
        <button
          onClick={() => fetchPosts(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-none outline-none transition-all"
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border2)",
            color: "var(--text)",
            opacity: refreshing || loading ? 0.5 : 1,
          }}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Rafraîchir
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-4">
        {loading && <MediaGridSkeleton />}

        {!loading && error === "not_configured" && (
          <EmptyState
            title="Connexion Instagram en cours de configuration"
            subtitle="Les posts seront disponibles une fois le token configuré."
          />
        )}

        {!loading && error === "fetch_failed" && (
          <EmptyState
            title="Impossible de charger les posts"
            subtitle="Vérifie la connexion Instagram dans l'onglet Config."
          />
        )}

        {!loading && !error && posts.length === 0 && (
          <EmptyState
            title="Aucun post publié"
            subtitle="Les publications apparaîtront ici dès leur mise en ligne."
          />
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {posts.map((post) => (
              <MediaCard
                key={post.id}
                post={post}
                onClick={() => setSelected(post)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <MediaDetailModal
          post={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ──

function MediaCard({
  post,
  onClick,
}: {
  post: IgMedia;
  onClick: () => void;
}) {
  const isVideo = post.media_type === "VIDEO";
  const src = isVideo
    ? post.thumbnail_url || post.media_url
    : post.media_url || post.thumbnail_url;

  return (
    <button
      onClick={onClick}
      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group border-none outline-none p-0 text-left"
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border2)",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={post.caption?.slice(0, 80) || "post Instagram"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: "var(--bg3)" }}
        >
          <ImageIcon
            className="w-8 h-8"
            style={{ color: "var(--text-muted)" }}
          />
        </div>
      )}

      {/* Video badge */}
      {isVideo && (
        <div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <Video className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Overlay bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 px-2.5 py-2"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.75) 100%)",
        }}
      >
        {post.caption && (
          <p className="text-[10px] text-white line-clamp-1 mb-1 opacity-95">
            {truncate(post.caption, 60)}
          </p>
        )}
        <div className="flex items-center gap-3 text-white text-[10px] font-medium">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" fill="currentColor" />
            {post.like_count ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {post.comments_count ?? 0}
          </span>
        </div>
      </div>
    </button>
  );
}

function MediaDetailModal({
  post,
  onClose,
}: {
  post: IgMedia;
  onClose: () => void;
}) {
  // ESC key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const isVideo = post.media_type === "VIDEO";
  const displaySrc =
    post.media_url || post.thumbnail_url || undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-none outline-none"
          style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Media */}
        <div
          className="w-full flex-shrink-0"
          style={{ background: "#000", maxHeight: "55vh" }}
        >
          {isVideo && post.media_url ? (
            <video
              src={post.media_url}
              poster={post.thumbnail_url}
              controls
              className="w-full max-h-[55vh] object-contain"
            />
          ) : displaySrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displaySrc}
              alt={post.caption?.slice(0, 80) || "post Instagram"}
              className="w-full max-h-[55vh] object-contain"
            />
          ) : (
            <div
              className="w-full h-64 flex items-center justify-center"
              style={{ background: "var(--bg3)" }}
            >
              <ImageIcon
                className="w-10 h-10"
                style={{ color: "var(--text-muted)" }}
              />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 overflow-y-auto">
          <div className="flex items-center gap-4 mb-3 text-xs">
            <span
              className="flex items-center gap-1 font-medium"
              style={{ color: "var(--text)" }}
            >
              <Heart
                className="w-3.5 h-3.5"
                style={{ color: "#E1306C" }}
                fill="#E1306C"
              />
              {post.like_count ?? 0} likes
            </span>
            <span
              className="flex items-center gap-1 font-medium"
              style={{ color: "var(--text)" }}
            >
              <MessageSquare
                className="w-3.5 h-3.5"
                style={{ color: "var(--text-muted)" }}
              />
              {post.comments_count ?? 0} commentaires
            </span>
            {post.timestamp && (
              <span
                className="text-[11px] ml-auto"
                style={{ color: "var(--text-muted)" }}
              >
                {formatDate(post.timestamp)}
              </span>
            )}
          </div>

          {post.caption && (
            <p
              className="text-xs leading-relaxed whitespace-pre-wrap mb-4"
              style={{ color: "var(--text)" }}
            >
              {post.caption}
            </p>
          )}

          {post.permalink && (
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
              style={{
                background:
                  "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
                color: "#fff",
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Voir sur Instagram
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-lg animate-pulse"
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border2)",
          }}
        />
      ))}
    </div>
  );
}

function EmptyState({
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
        <ImageIcon
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
