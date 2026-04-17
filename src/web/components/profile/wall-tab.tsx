"use client";

import {
  Heart, MessageCircle, Send, Lock, Newspaper,
  Pin, Ghost, Instagram, Play, Camera, Eye,
} from "lucide-react";
import { ContentProtection } from "@/components/content-protection";
import type { ModelInfo, Post, WallPost, VisitorPlatform } from "@/types/heaven";
import { TIER_META, TIER_HEX } from "@/constants/tiers";
import { toSlot } from "@/lib/tier-utils";

interface SocialPopup {
  pseudo: string;
  snap?: string | null;
  insta?: string | null;
  x: number;
  y: number;
}

interface WallTabProps {
  slug: string;
  model: ModelInfo;
  posts: Post[];
  wallPosts: WallPost[];
  wallContent: string;
  setWallContent: (v: string) => void;
  wallPosting: boolean;
  submitWallPost: () => void;
  visitorPlatform: VisitorPlatform | null;
  visitorHandle: string;
  setVisitorRegistered: (v: boolean) => void;
  setClientId: (v: string | null) => void;
  socialPopup: SocialPopup | null;
  setSocialPopup: (v: SocialPopup | null) => void;
  isModelLoggedIn: boolean;
  unlockedTier: string | null;
  setShowUnlock: (v: boolean) => void;
  subscriberUsername: string;
  hasSubscriberIdentity: boolean;
  timeAgo: (d: string) => string;
  tierIncludes: (unlockedTier: string, contentTier: string) => boolean;
}

export function WallTab({
  slug, model, posts, wallPosts, wallContent, setWallContent,
  wallPosting, submitWallPost, visitorPlatform, visitorHandle,
  setVisitorRegistered, setClientId, socialPopup, setSocialPopup,
  isModelLoggedIn, unlockedTier, setShowUnlock,
  subscriberUsername, hasSubscriberIdentity, timeAgo, tierIncludes,
}: WallTabProps) {
  // Merge model posts and wall posts into a single timeline
  const feedItems: Array<{ type: "model"; data: Post } | { type: "wall"; data: WallPost }> = [
    ...posts.map(p => ({ type: "model" as const, data: p })),
    ...wallPosts.map(w => ({ type: "wall" as const, data: w })),
  ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());

  return (
    <div className="space-y-3 fade-up">
      {/* Composer — visitor always identified via gate */}
      <div className="card-premium p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{
              background: visitorPlatform === "snap" ? "rgba(153,122,0,0.15)"
                : visitorPlatform === "insta" ? "rgba(225,48,108,0.15)"
                : visitorPlatform === "phone" ? "rgba(22,163,74,0.12)"
                : "rgba(99,102,241,0.12)",
              color: visitorPlatform === "snap" ? "#997A00"
                : visitorPlatform === "insta" ? "#E1306C"
                : visitorPlatform === "phone" ? "#16A34A"
                : "#6366F1",
            }}>
            {visitorPlatform === "snap" ? <Ghost className="w-4 h-4" />
              : visitorPlatform === "insta" ? <Instagram className="w-4 h-4" />
              : visitorPlatform === "phone" ? <span className="text-[11px]">Tel</span>
              : <span className="text-[11px]">U</span>
            }
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              {visitorPlatform === "snap" ? <Ghost className="w-3.5 h-3.5 shrink-0" style={{ color: "#997A00" }} />
                : visitorPlatform === "insta" ? <Instagram className="w-3.5 h-3.5 shrink-0" style={{ color: "#E1306C" }} />
                : null
              }
              <span className="text-[12px] font-bold" style={{ color: "var(--text)" }}>@{visitorHandle}</span>
              <div className="flex-1" />
              <button onClick={() => { setVisitorRegistered(false); setClientId(null); sessionStorage.removeItem(`heaven_client_${slug}`); }}
                className="text-[10px] cursor-pointer opacity-50 hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>changer</button>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={wallContent}
                onChange={e => setWallContent(e.target.value)}
                placeholder={`Un message pour ${model.display_name}...`}
                className="flex-1 px-3 py-2.5 rounded-xl text-xs outline-none transition-all focus:ring-1"
                style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)", "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
                maxLength={500}
                onKeyDown={e => { if (e.key === "Enter" && wallContent.trim()) submitWallPost(); }}
              />
              <button onClick={submitWallPost} disabled={wallPosting || !wallContent.trim()}
                className="px-4 py-2.5 rounded-xl text-[11px] font-semibold cursor-pointer btn-gradient disabled:opacity-30 shrink-0 transition-all"
                style={{ minWidth: 56 }}>
                {wallPosting ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Instagram-style grid for image posts ── */}
      {(() => {
        const imagePosts = feedItems.filter(item => item.type === "model" && (item.data as Post).media_url);
        if (imagePosts.length > 0) {
          return (
            <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden mb-3">
              {imagePosts.map((item) => {
                const post = item.data as Post;
                const postTier = toSlot(post.tier_required || "public");
                const mediaUnlocked = postTier === "p0" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, postTier));
                const tierHex = TIER_HEX[postTier] || "#64748B";
                return (
                  <div key={`grid-${post.id}`} className="relative aspect-square overflow-hidden cursor-pointer group"
                    onClick={() => !mediaUnlocked && setShowUnlock(true)}>
                    {mediaUnlocked ? (
                      <img src={post.media_url!} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                    ) : (
                      <>
                        <img src={post.media_url!} alt="" className="w-full h-full object-cover" style={{ filter: "blur(20px) brightness(0.5)" }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Lock className="w-5 h-5" style={{ color: tierHex }} />
                        </div>
                      </>
                    )}
                    {/* Hover overlay with stats */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <span className="flex items-center gap-1 text-white text-xs font-bold"><Heart className="w-3.5 h-3.5" fill="white" /> {post.likes_count || 0}</span>
                      <span className="flex items-center gap-1 text-white text-xs font-bold"><MessageCircle className="w-3.5 h-3.5" /> {post.comments_count || 0}</span>
                    </div>
                    {postTier !== "p0" && mediaUnlocked && (
                      <span className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${tierHex}80`, color: "#fff" }}>
                        {postTier.toUpperCase()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }
        return null;
      })()}

      {/* ── Text posts + wall comments ── */}
      {feedItems.length === 0 ? (
        <EmptyState icon={Newspaper} text="Be the first to leave a message!" />
      ) : (
        feedItems.filter(item => !(item.type === "model" && (item.data as Post).media_url)).map((item, i) => {
          if (item.type === "model") {
            const post = item.data;
            const postTier = toSlot(post.tier_required || "public");
            const mediaUnlocked = postTier === "p0" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, postTier));
            const tierMeta = TIER_META[postTier];
            const tierHex = TIER_HEX[postTier] || "#64748B";
            return (
              <div key={`post-${post.id}`} className="card-premium overflow-hidden post-hover" style={{ animation: `slideUp 0.4s ease-out ${i * 0.06}s both` }}>
                {post.pinned && (
                  <div className="flex items-center gap-1.5 px-4 pt-3 pb-0">
                    <Pin className="w-3 h-3" style={{ color: "var(--tier-gold)" }} />
                    <span className="text-[10px] font-medium" style={{ color: "var(--tier-gold)" }}>Pinned</span>
                  </div>
                )}
                <div className="flex items-start gap-3 p-4 pb-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", color: "#fff" }}>
                    {model.display_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[13px] font-bold" style={{ color: "var(--text)" }}>{model.display_name}</p>
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>@{slug}</span>
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>·</span>
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{timeAgo(post.created_at)}</span>
                      {postTier !== "p0" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${tierHex}18`, color: tierHex }}>
                          {tierMeta?.label || postTier}
                        </span>
                      )}
                    </div>

                    {post.content && (
                      <p className="text-[13px] sm:text-sm leading-relaxed mt-1.5 whitespace-pre-wrap" style={{ color: "var(--text)" }}>{post.content}</p>
                    )}

                    {post.media_url && (
                      mediaUnlocked ? (
                        <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn}>
                          <div className="mt-2.5 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border2)" }}>
                            <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover" loading="lazy" />
                          </div>
                        </ContentProtection>
                      ) : (
                        <div className="mt-2.5 rounded-xl overflow-hidden relative cursor-pointer" onClick={() => setShowUnlock(true)} style={{ border: "1px solid var(--border2)" }}>
                          <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover content-locked" />
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(20px)" }}>
                            <div className="text-center">
                              <Lock className="w-6 h-6 mx-auto mb-1.5" style={{ color: tierHex }} />
                              <span className="text-xs font-bold" style={{ color: tierHex }}>{tierMeta?.label || postTier} Only</span>
                              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Unlock to view</p>
                            </div>
                          </div>
                        </div>
                      )
                    )}

                    <div className="flex items-center gap-6 mt-3 mb-1">
                      <button className="flex items-center gap-1.5 text-[12px] cursor-pointer transition-colors hover:text-[#F43F5E] group/like" style={{ color: "var(--text-muted)" }}>
                        <Heart className="w-4 h-4 transition-transform group-hover/like:scale-110" fill={post.likes_count > 0 ? "#F43F5E" : "none"} style={{ color: post.likes_count > 0 ? "#F43F5E" : undefined }} />
                        <span>{post.likes_count || ""}</span>
                      </button>
                      <button className="flex items-center gap-1.5 text-[12px] cursor-pointer transition-colors hover:text-[#7C3AED] group/comment" style={{ color: "var(--text-muted)" }}>
                        <MessageCircle className="w-4 h-4 transition-transform group-hover/comment:scale-110" />
                        <span>{post.comments_count || ""}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Wall post — Twitter-style card
          const wp = item.data;
          return (
            <div key={`wall-${wp.id}`} className="card-premium px-4 py-3" style={{ animation: `slideUp 0.3s ease-out ${i * 0.04}s both` }}>
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                  style={{ background: "rgba(167,139,250,0.12)", color: "var(--tier-platinum)" }}>
                  {wp.pseudo.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      className="text-[12px] font-bold shrink-0 cursor-pointer hover:underline"
                      style={{ color: "var(--text)", background: "none", border: "none", padding: 0 }}
                      onClick={(e) => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setSocialPopup({
                          pseudo: wp.pseudo,
                          snap: wp.pseudo_snap,
                          insta: wp.pseudo_insta,
                          x: rect.left,
                          y: rect.bottom + 4,
                        });
                      }}
                    >
                      {wp.pseudo}
                    </button>
                    {(wp.pseudo_snap || wp.pseudo_insta) && (
                      <div className="flex items-center gap-1">
                        {wp.pseudo_snap && <Ghost className="w-3 h-3" style={{ color: "#997A00" }} />}
                        {wp.pseudo_insta && <Instagram className="w-3 h-3" style={{ color: "#E1306C" }} />}
                      </div>
                    )}
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>· {timeAgo(wp.created_at)}</span>
                  </div>
                  <p className="text-[13px] leading-relaxed mt-1 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                    {wp.content || ""}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Social popup — shows snap/insta on pseudo click */}
      {socialPopup && (
        <div className="fixed inset-0 z-[999]" onClick={() => setSocialPopup(null)}>
          <div
            className="absolute rounded-xl p-3 shadow-2xl space-y-2 min-w-[180px]"
            style={{
              left: Math.min(socialPopup.x, window.innerWidth - 200),
              top: socialPopup.y,
              background: "rgba(20,20,25,0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border2)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[11px] font-bold" style={{ color: "var(--text)" }}>@{socialPopup.pseudo}</p>
            {socialPopup.snap && (
              <div className="flex items-center gap-2">
                <Ghost className="w-3.5 h-3.5" style={{ color: "#997A00" }} />
                <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{socialPopup.snap}</span>
              </div>
            )}
            {socialPopup.insta && (
              <div className="flex items-center gap-2">
                <Instagram className="w-3.5 h-3.5" style={{ color: "#E1306C" }} />
                <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{socialPopup.insta}</span>
              </div>
            )}
            {!socialPopup.snap && !socialPopup.insta && (
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>No social accounts linked</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; text: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{text}</p>
    </div>
  );
}
