"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import {
  Heart, MessageCircle, Send, Lock, Newspaper, Camera, Instagram, ExternalLink,
} from "lucide-react";
import { ContentProtection } from "@/components/content-protection";
import { TIER_META, TIER_HEX } from "@/constants/tiers";
import type { ModelInfo, Post, WallPost, UploadedContent, FeedItem } from "@/types/heaven";

// ── Tier helpers (mirror page.tsx logic) ──
const TIER_HIERARCHY = ["p1", "p2", "p3", "p4", "p5"];
const TIER_ALIASES: Record<string, string> = {
  vip: "p1", diamond: "p4",
  silver: "p1", gold: "p2", feet: "p3", black: "p4", platinum: "p5",
  public: "p0", free: "p0", promo: "p0",
};
function normalizeTier(t: string): string {
  if (/^p\d$/.test(t)) return t;
  return TIER_ALIASES[t?.toLowerCase()] || t;
}
function tierIncludes(unlockedTier: string, contentTier: string): boolean {
  const ui = TIER_HIERARCHY.indexOf(normalizeTier(unlockedTier));
  const ci = TIER_HIERARCHY.indexOf(normalizeTier(contentTier));
  if (ui === -1 || ci === -1) return false;
  return ui >= ci;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// IG caption truncation with "voir plus"
function truncate(s: string, max = 200): { body: string; truncated: boolean } {
  if (!s || s.length <= max) return { body: s || "", truncated: false };
  return { body: s.slice(0, max).trimEnd(), truncated: true };
}

export interface FeedSectionProps {
  wallContent: string;
  setWallContent: (v: string) => void;
  wallPosting: boolean;
  onSubmitWall: () => void;
  posts: Post[];
  wallPosts: WallPost[];
  model: ModelInfo;
  modelId: string;
  slug: string;
  visitorHandle: string;
  visitorPlatform: string | null;
  visitorRegistered: boolean;
  unlockedTier: string | null;
  contentUnlocked: boolean;
  isModelLoggedIn: boolean;
  purchasedItems: Set<string>;
  subscriberUsername: string;
  hasSubscriberIdentity: boolean;
  clientId: string | null;
  uploads: UploadedContent[];
  setLightboxUrl: (url: string | null) => void;
  setGalleryTier: (tier: string) => void;
  setWallPosts: React.Dispatch<React.SetStateAction<WallPost[]>>;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  /**
   * Optional pre-fetched unified feed items. When omitted, the component
   * self-fetches `/api/feed?model=<slug>` once on mount. If the unified
   * feed is empty (e.g. before migration 038), we fall back to merging
   * `posts` + `wallPosts` using the legacy path — no regression.
   */
  feedItems?: FeedItem[];
}

export function FeedSection({
  wallContent,
  setWallContent,
  wallPosting,
  posts,
  wallPosts,
  model,
  modelId,
  slug,
  visitorHandle,
  visitorPlatform,
  visitorRegistered,
  unlockedTier,
  contentUnlocked,
  isModelLoggedIn,
  purchasedItems,
  subscriberUsername,
  hasSubscriberIdentity,
  clientId,
  uploads,
  setLightboxUrl,
  setGalleryTier,
  setWallPosts,
  setPosts,
  feedItems: feedItemsProp,
}: FeedSectionProps) {

  // ─── Unified feed source ─────────────────────────────────────────────────
  // Feature flag: if agence_feed_items has rows for this model, switch to the
  // polymorphic rendering. Otherwise keep the legacy merge (posts + wall).
  const [fetchedItems, setFetchedItems] = useState<FeedItem[] | null>(null);
  const [igExpanded, setIgExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (feedItemsProp !== undefined) return; // caller controls the data
    let aborted = false;
    fetch(`/api/feed?model=${encodeURIComponent(slug || modelId)}`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { if (!aborted) setFetchedItems(Array.isArray(d.items) ? d.items : []); })
      .catch(() => { if (!aborted) setFetchedItems([]); });
    return () => { aborted = true; };
  }, [feedItemsProp, slug, modelId]);

  const feedItems: FeedItem[] = feedItemsProp ?? fetchedItems ?? [];
  const useUnified = feedItems.length > 0;

  const handleWallPost = useCallback(async () => {
    if (!wallContent.trim()) return;
    const pseudo = visitorHandle || "Anonyme";
    try {
      const res = await fetch("/api/wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId, pseudo, content: wallContent.trim(), client_id: clientId }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.post) setWallPosts(prev => [d.post, ...prev]);
        setWallContent("");
      }
    } catch { /* ignore */ }
  }, [wallContent, visitorHandle, modelId, clientId, setWallPosts, setWallContent]);

  // ─── Legacy merge (kept for fallback) ────────────────────────────────────
  const visitorPosts = wallPosts
    .filter(w => !w.content?.includes("#post-") && w.pseudo !== "SYSTEM")
    .map(w => ({ type: "wall" as const, id: w.id, created_at: w.created_at, data: w }));

  const filteredModelPosts = contentUnlocked ? posts : posts.filter(p => {
    const tier = normalizeTier(p.tier_required || "public");
    if (!tier || tier === "p0") return true;
    if (unlockedTier && tierIncludes(unlockedTier, tier)) return true;
    return false;
  });
  const modelPosts = filteredModelPosts.map(p => ({ type: "post" as const, id: p.id, created_at: p.created_at, data: p }));
  const legacyItems = [...visitorPosts, ...modelPosts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ─── Unified items (tier-gated where relevant) ──────────────────────────
  const unifiedItems = useMemo(() => {
    if (!useUnified) return [];
    return feedItems.filter(it => {
      // IG is always public (no blur / no tier gate)
      if (it.source_type === "instagram") return true;
      if (it.source_type === "wall") return true;
      // Manual posts: respect tier gating (same logic as before)
      const t = normalizeTier(it.tier || "public");
      if (!t || t === "p0") return true;
      if (contentUnlocked) return true;
      if (unlockedTier && tierIncludes(unlockedTier, t)) return true;
      return false;
    });
  }, [feedItems, useUnified, contentUnlocked, unlockedTier]);

  return (
    <div className="fade-up">
      {/* 2-column: feed center + recent photos sidebar on desktop */}
      <div className="flex gap-5 max-w-5xl mx-auto">
        {/* Feed column */}
        <div className="space-y-5 sm:space-y-6 flex-1 min-w-0 max-w-2xl mx-auto">
          {/* Visitor post composer */}
          {!isModelLoggedIn && (
            <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex gap-3">
                <input
                  value={wallContent}
                  onChange={e => setWallContent(e.target.value)}
                  placeholder={`Un message pour ${model.display_name}...`}
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-1"
                  style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
                  onKeyDown={async e => {
                    if (e.key !== "Enter" || !wallContent.trim()) return;
                    await handleWallPost();
                  }}
                />
                <button disabled={wallPosting || !wallContent.trim()} onClick={handleWallPost}
                  className="px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-30 shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "var(--accent)", color: "#fff" }}>
                  {wallPosting ? "..." : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* ═══ UNIFIED RENDERING (feature flag) ═══ */}
          {useUnified ? (
            unifiedItems.length === 0 ? (
              <div className="text-center py-20 sm:py-24">
                <Newspaper className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Pas encore de publications</p>
              </div>
            ) : (
              <>
                {unifiedItems.map((item, idx) => {
                  // ─── Instagram card ────────────────────────────────────
                  if (item.source_type === "instagram") {
                    const expanded = !!igExpanded[item.id];
                    const { body, truncated } = truncate(item.caption || "", 200);
                    const visibleCaption = expanded ? (item.caption || "") : body;
                    const isVideo = (item.media_type || "").toLowerCase() === "video";
                    const src = isVideo ? (item.thumbnail_url || item.media_url) : (item.media_url || item.thumbnail_url);

                    return (
                      <div key={item.id} className="rounded-2xl overflow-hidden"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)", animation: `slideUp 0.4s ease-out ${idx * 0.04}s both` }}>
                        <div className="flex items-start gap-3 sm:gap-4 p-5 sm:p-6 pb-3 sm:pb-4">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                            style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", color: "#fff" }}>
                            <Instagram className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{model.display_name}</span>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                                  style={{
                                    background: "linear-gradient(135deg, rgba(188,24,136,0.15), rgba(220,39,67,0.15))",
                                    color: "#dc2743",
                                  }}>
                                  <Instagram className="w-2.5 h-2.5" />
                                  INSTAGRAM
                                </span>
                              </div>
                              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{timeAgo(item.posted_at)}</span>
                            </div>
                            {visibleCaption && (
                              <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                                {visibleCaption}
                                {truncated && !expanded && (
                                  <>
                                    {"… "}
                                    <button
                                      onClick={() => setIgExpanded(prev => ({ ...prev, [item.id]: true }))}
                                      className="text-xs font-semibold cursor-pointer"
                                      style={{ color: "var(--accent)", background: "none", border: "none", padding: 0 }}
                                    >
                                      voir plus
                                    </button>
                                  </>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        {src && (
                          <div className="relative cursor-pointer mx-5 sm:mx-6 mb-4 rounded-xl overflow-hidden"
                            onClick={() => setLightboxUrl(src)}>
                            <img src={src} alt="" className="w-full max-h-[400px] sm:max-h-[500px] object-cover" loading="lazy" />
                            {isVideo && (
                              <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                                VIDEO
                              </div>
                            )}
                          </div>
                        )}
                        {/* Footer — like + comment counts + external link */}
                        <div className="flex items-center gap-6 px-5 sm:px-6 py-3.5" style={{ borderTop: "1px solid var(--border)" }}>
                          <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                            <Heart className="w-4 h-4" />
                            <span className="tabular-nums">{item.like_count || 0}</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                            <MessageCircle className="w-4 h-4" />
                            <span className="tabular-nums">{item.comment_count || 0}</span>
                          </span>
                          {item.external_url && (
                            <a href={item.external_url} target="_blank" rel="noopener noreferrer"
                              className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold transition-opacity hover:opacity-80"
                              style={{ color: "#dc2743" }}>
                              Voir sur Instagram
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // ─── Wall card (visitor message) ─────────────────────
                  if (item.source_type === "wall") {
                    const pseudo = item.author_pseudo || "Anonyme";
                    return (
                      <div key={`w-${item.id}`} className="rounded-2xl p-5 sm:p-6"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)", animation: `slideUp 0.4s ease-out ${idx * 0.04}s both` }}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                            style={{ background: "var(--bg3)", color: "var(--text-muted)" }}>
                            {pseudo.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold" style={{ color: "var(--text)" }}>@{pseudo}</span>
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(item.posted_at)}</span>
                            </div>
                            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.caption}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ─── Manual post card (same styling as legacy) ──────
                  const postTier = normalizeTier(item.tier || "public");
                  const mediaUnlocked = postTier === "p0" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, postTier));
                  const tierHex = TIER_HEX[postTier] || "#64748B";
                  return (
                    <div key={item.id} className="rounded-2xl overflow-hidden"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", animation: `slideUp 0.4s ease-out ${idx * 0.04}s both` }}>
                      <div className="flex items-start gap-3 sm:gap-4 p-5 sm:p-6 pb-3 sm:pb-4">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden"
                          style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}>
                          {model.avatar ? <img src={model.avatar} alt="" className="w-full h-full object-cover" /> : model.display_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{model.display_name}</span>
                              {postTier !== "public" && postTier !== "p0" && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${tierHex}12`, color: tierHex }}>
                                  {TIER_META[postTier]?.label || postTier.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{timeAgo(item.posted_at)}</span>
                          </div>
                          {item.caption && (
                            <p className="text-base mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{item.caption}</p>
                          )}
                        </div>
                      </div>
                      {item.media_url && (
                        mediaUnlocked ? (
                          <div className="cursor-pointer mx-5 sm:mx-6 mb-4 rounded-xl overflow-hidden"
                            onClick={() => setLightboxUrl(item.media_url)}>
                            <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn}>
                              <img src={item.media_url} alt="" className="w-full max-h-[400px] sm:max-h-[500px] object-cover" loading="lazy" />
                            </ContentProtection>
                          </div>
                        ) : (
                          <div className="relative cursor-pointer mx-5 sm:mx-6 mb-4 rounded-xl overflow-hidden"
                            onClick={() => {
                              if (purchasedItems.has(item.id)) { setLightboxUrl(item.media_url); return; }
                              setGalleryTier(postTier !== "public" ? postTier : "feed");
                            }}>
                            <div className="w-full h-[300px] sm:h-[400px] relative">
                              {item.media_url && (
                                <img src={item.media_url} alt="" className="absolute inset-0 w-full h-full object-cover"
                                  style={{ filter: "blur(14px) brightness(0.4)", transform: "scale(1.15)" }} loading="lazy" />
                              )}
                              <div className="absolute inset-0" style={{
                                background: `linear-gradient(160deg, ${tierHex}20 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)`,
                              }} />
                            </div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                              <Lock className="w-6 h-6" style={{ color: "#fff", opacity: 0.9 }} />
                              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                                {TIER_META[postTier]?.symbol} {TIER_META[postTier]?.label || "Exclusive"}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                      <div className="flex items-center gap-6 px-5 sm:px-6 py-3.5" style={{ borderTop: "1px solid var(--border)" }}>
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                          <Heart className="w-4 h-4" />
                          <span className="tabular-nums">{item.like_count || 0}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                          <MessageCircle className="w-4 h-4" />
                          <span className="tabular-nums">{item.comment_count || 0}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            )
          ) : (
            // ═══ LEGACY RENDERING (fallback when unified feed is empty) ═══
            legacyItems.length === 0 ? (
              <div className="text-center py-20 sm:py-24">
                <Newspaper className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Pas encore de publications</p>
              </div>
            ) : (
              <>
                {legacyItems.map((item, idx) => {
                  if (item.type === "wall") {
                    const w = item.data as WallPost;
                    return (
                      <div key={`w-${w.id}`} className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)", animation: `slideUp 0.4s ease-out ${idx * 0.04}s both` }}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                            style={{ background: "var(--bg3)", color: "var(--text-muted)" }}>
                            {w.pseudo?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold" style={{ color: "var(--text)" }}>@{w.pseudo}</span>
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(w.created_at)}</span>
                            </div>
                            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{w.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  const post = item.data as Post;
                  const postTier = normalizeTier(post.tier_required || "public");
                  const mediaUnlocked = postTier === "p0" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, postTier));
                  const tierHex = TIER_HEX[postTier] || "#64748B";
                  return (
                    <div key={post.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)", animation: `slideUp 0.4s ease-out ${idx * 0.04}s both` }}>
                      <div className="flex items-start gap-3 sm:gap-4 p-5 sm:p-6 pb-3 sm:pb-4">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden"
                          style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}>
                          {model.avatar ? <img src={model.avatar} alt="" className="w-full h-full object-cover" /> : model.display_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{model.display_name}</span>
                              {postTier !== "public" && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${tierHex}12`, color: tierHex }}>
                                  {TIER_META[postTier]?.label || postTier.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{timeAgo(post.created_at)}</span>
                          </div>
                          {post.content && (
                            <p className="text-base mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{post.content}</p>
                          )}
                        </div>
                      </div>
                      {post.media_url && (
                        mediaUnlocked ? (
                          <div className="cursor-pointer mx-5 sm:mx-6 mb-4 rounded-xl overflow-hidden"
                            onClick={() => setLightboxUrl(post.media_url)}>
                            <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn}>
                              <img src={post.media_url} alt="" className="w-full max-h-[400px] sm:max-h-[500px] object-cover" loading="lazy" />
                            </ContentProtection>
                          </div>
                        ) : (
                          <div className="relative cursor-pointer mx-5 sm:mx-6 mb-4 rounded-xl overflow-hidden"
                            onClick={() => {
                              if (purchasedItems.has(post.id)) { setLightboxUrl(post.media_url); return; }
                              setGalleryTier(postTier !== "public" ? postTier : "feed");
                            }}>
                            <div className="w-full h-[300px] sm:h-[400px] relative">
                              {post.media_url && (
                                <img src={post.media_url} alt="" className="absolute inset-0 w-full h-full object-cover"
                                  style={{ filter: "blur(14px) brightness(0.4)", transform: "scale(1.15)" }} loading="lazy" />
                              )}
                              <div className="absolute inset-0" style={{
                                background: `linear-gradient(160deg, ${tierHex}20 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)`,
                              }} />
                            </div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                              <Lock className="w-6 h-6" style={{ color: "#fff", opacity: 0.9 }} />
                              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                                {TIER_META[postTier]?.symbol} {TIER_META[postTier]?.label || "Exclusive"}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                      {/* Like + comment */}
                      <div className="flex items-center gap-6 px-5 sm:px-6 py-3.5" style={{ borderTop: "1px solid var(--border)" }}>
                        <button onClick={async () => {
                          try {
                            await fetch(`/api/posts`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: post.id, model: modelId, action: "like" }),
                            });
                            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p));
                          } catch { /* ignore */ }
                        }} className="flex items-center gap-1.5 text-xs cursor-pointer transition-colors hover:text-[#F43F5E] group/like" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                          <Heart className="w-4 h-4 transition-transform group-hover/like:scale-110" fill={(post.likes_count || 0) > 0 ? "currentColor" : "none"} />
                          <span className="tabular-nums">{post.likes_count || 0}</span>
                        </button>
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                          <MessageCircle className="w-4 h-4" />
                          <span className="tabular-nums">{wallPosts.filter(w => w.content?.includes(`#post-${post.id}`)).length + (post.comments_count || 0)}</span>
                        </span>
                      </div>
                      {/* Comments */}
                      {wallPosts.filter(w => w.content?.includes(`#post-${post.id}`)).slice(0, 3).map(w => (
                        <div key={w.id} className="px-5 sm:px-6 py-2 flex items-start gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                          <span className="text-[11px] font-bold shrink-0" style={{ color: "var(--text)" }}>@{w.pseudo}</span>
                          <span className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{w.content?.replace(`#post-${post.id}`, "").trim()}</span>
                        </div>
                      ))}
                      {/* Comment input */}
                      <div className="px-5 sm:px-6 py-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                        <input
                          data-comment-post={post.id}
                          placeholder={visitorRegistered ? "Ajouter un commentaire..." : "Identifie-toi pour commenter"}
                          className="flex-1 text-sm bg-transparent outline-none py-1"
                          style={{ color: "var(--text)" }}
                          readOnly={!visitorRegistered}
                          onClick={() => { if (!visitorRegistered) { /* identity gate will handle */ } }}
                          onKeyDown={async (e) => {
                            if (!visitorRegistered) return;
                            if (e.key === "Enter") {
                              const input = e.target as HTMLInputElement;
                              const text = input.value.trim();
                              if (!text) return;
                              input.value = "";
                              try {
                                await fetch("/api/wall", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    model: modelId,
                                    pseudo: visitorHandle,
                                    content: `${text} #post-${post.id}`,
                                    pseudo_snap: visitorPlatform === "snap" ? visitorHandle : null,
                                    pseudo_insta: visitorPlatform === "insta" ? visitorHandle : null,
                                    client_id: clientId,
                                  }),
                                });
                                const res = await fetch(`/api/wall?model=${modelId}`);
                                const data = await res.json();
                                setWallPosts(data.posts || []);
                              } catch { /* ignore */ }
                            }
                          }}
                        />
                        <button onClick={async () => {
                          if (!visitorRegistered) return;
                          const input = (document.querySelector(`[data-comment-post="${post.id}"]`) as HTMLInputElement);
                          const text = input?.value?.trim();
                          if (!text) return;
                          input.value = "";
                          try {
                            await fetch("/api/wall", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                model: modelId, pseudo: visitorHandle,
                                content: `${text} #post-${post.id}`,
                                pseudo_snap: visitorPlatform === "snap" ? visitorHandle : null,
                                pseudo_insta: visitorPlatform === "insta" ? visitorHandle : null,
                                client_id: clientId,
                              }),
                            });
                            const res = await fetch(`/api/wall?model=${modelId}`);
                            const data = await res.json();
                            setWallPosts(data.posts || []);
                          } catch { /* ignore */ }
                        }} className="cursor-pointer hover:opacity-70 transition-opacity" style={{ background: "none", border: "none" }}>
                          <Send className="w-3.5 h-3.5" style={{ color: visitorRegistered ? "var(--accent)" : "var(--text-muted)" }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )
          )}
        </div>

        {/* Right sidebar — recent photos (desktop only) */}
        <div className="hidden lg:block w-[280px] xl:w-[320px] shrink-0 sticky top-[60px] self-start space-y-3" style={{ maxHeight: "calc(100vh - 80px)" }}>
          <span className="text-[11px] font-bold uppercase tracking-wider px-1" style={{ color: "var(--text-muted)" }}>
            Photos récentes
          </span>
          <div className="overflow-y-auto rounded-xl no-scrollbar" style={{ maxHeight: "calc(100vh - 120px)" }}>
            <div className="grid grid-cols-2 gap-2">
              {(() => {
                const recentMedia: { url: string; tier: string; id: string }[] = [];
                uploads.filter(u => u.dataUrl && u.type === "photo").slice(0, 12).forEach(u => {
                  recentMedia.push({ url: u.dataUrl, tier: normalizeTier(u.tier || "public"), id: u.id });
                });
                posts.filter(p => p.media_url).slice(0, 8).forEach(p => {
                  if (!recentMedia.find(m => m.url === p.media_url)) {
                    recentMedia.push({ url: p.media_url!, tier: normalizeTier(p.tier_required || "public"), id: p.id });
                  }
                });
                const items = recentMedia.slice(0, 20);
                if (items.length === 0) return (
                  <div className="col-span-2 py-8 text-center">
                    <Camera className="w-5 h-5 mx-auto mb-1.5" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Bientôt</span>
                  </div>
                );
                return items.map(item => {
                  const canView = item.tier === "p0" || item.tier === "promo" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, item.tier));
                  const hex = TIER_HEX[item.tier] || "#64748B";
                  return (
                    <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                      onClick={() => {
                        if (canView) setLightboxUrl(item.url);
                        else setGalleryTier(item.tier);
                      }}>
                      <img src={item.url} alt="" draggable={false}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        style={{
                          filter: canView ? "none" : "blur(12px) brightness(0.4)",
                          transform: canView ? undefined : "scale(1.15)",
                        }} />
                      {!canView && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                          <Lock className="w-4 h-4" style={{ color: hex }} />
                          <span className="text-[9px] font-bold uppercase" style={{ color: hex }}>
                            {TIER_META[item.tier]?.symbol} {TIER_META[item.tier]?.label}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
