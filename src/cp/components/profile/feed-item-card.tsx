"use client";

import { Heart, MessageCircle, Lock, ExternalLink } from "lucide-react";
import { ContentProtection } from "@/components/content-protection";
import { ContentBadge } from "./content-badge";
import { TIER_META, TIER_HEX } from "@/constants/tiers";
import type { FeedItem, ModelInfo } from "@/types/heaven";

/**
 * Polymorphic feed card — renders a single `agence_feed_items` row with the
 * appropriate badge overlay and click behaviour for its source.
 *
 * Sources handled:
 *   - `instagram` → IG badge, click opens permalink in a new tab
 *   - `wall`      → author pseudo badge, body is a short text post
 *   - `manual`    → crown badge (exclusive web), respects tier gating
 *                   + `visibility_computed` (Phase 5.B blur/paywall rules)
 *
 * Brief B10 (badges + click behaviour) + Phase 5.B visibility rules.
 * This component does not own the layout — the caller places it inside a list
 * container and passes the post/click handlers explicitly.
 */

// ── Tier helpers (mirror page.tsx) ───────────────────────────────────────────
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
function tierIncludes(unlocked: string, required: string): boolean {
  const ui = TIER_HIERARCHY.indexOf(normalizeTier(unlocked));
  const ci = TIER_HIERARCHY.indexOf(normalizeTier(required));
  if (ui === -1 || ci === -1) return false;
  return ui >= ci;
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function truncateCaption(s: string, max: number): { body: string; truncated: boolean } {
  if (!s || s.length <= max) return { body: s || "", truncated: false };
  return { body: s.slice(0, max).trimEnd(), truncated: true };
}

export interface FeedItemCardProps {
  item: FeedItem & {
    visibility_computed?: {
      visible: boolean;
      blurred: boolean;
      blurIntensity: number;
      showPaywall: boolean;
    };
  };
  model: ModelInfo;
  unlockedTier: string | null;
  isModelLoggedIn: boolean;
  purchasedItems?: Set<string>;
  subscriberUsername: string;
  hasSubscriberIdentity: boolean;
  onOpenLightbox: (url: string) => void;
  onNavigateTier: (tier: string) => void;
  /** Animation index for staggered slide-up. */
  index?: number;
  /** Expand state for IG long captions (owned by parent). */
  captionExpanded?: boolean;
  onToggleCaption?: () => void;
}

export function FeedItemCard({
  item,
  model,
  unlockedTier,
  isModelLoggedIn,
  purchasedItems,
  subscriberUsername,
  hasSubscriberIdentity,
  onOpenLightbox,
  onNavigateTier,
  index = 0,
  captionExpanded = false,
  onToggleCaption,
}: FeedItemCardProps) {
  const stagger = { animation: `slideUp 0.4s ease-out ${index * 0.04}s both` };

  // ─── Instagram source ──────────────────────────────────────────────────────
  if (item.source_type === "instagram") {
    const { body, truncated } = truncateCaption(item.caption || "", 200);
    const visibleCaption = captionExpanded ? (item.caption || "") : body;
    const isVideo = (item.media_type || "").toLowerCase() === "video";
    const src = isVideo ? (item.thumbnail_url || item.media_url) : (item.media_url || item.thumbnail_url);

    // Click → open permalink in a new tab. Falls back to lightbox if no URL.
    const handleMediaClick = () => {
      if (item.external_url) {
        window.open(item.external_url, "_blank", "noopener,noreferrer");
      } else if (src) {
        onOpenLightbox(src);
      }
    };

    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", ...stagger }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-4 p-5 sm:p-6 pb-3 sm:pb-4">
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
              color: "#fff",
            }}
          >
            {model.avatar ? (
              <img src={model.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-semibold">{model.display_name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
                  {model.display_name}
                </span>
                <ContentBadge type="instagram" compact />
              </div>
              <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
                {timeAgo(item.posted_at)}
              </span>
            </div>
            {visibleCaption && (
              <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                {visibleCaption}
                {truncated && !captionExpanded && onToggleCaption && (
                  <>
                    {"… "}
                    <button
                      onClick={onToggleCaption}
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

        {/* Media */}
        {src && (
          <div
            className="relative cursor-pointer mx-5 sm:mx-6 mb-4 rounded-xl overflow-hidden group"
            onClick={handleMediaClick}
            role="link"
            aria-label="Voir le post sur Instagram"
          >
            <img
              src={src}
              alt=""
              className="w-full max-h-[400px] sm:max-h-[500px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
            {isVideo && (
              <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                VIDEO
              </div>
            )}
            {/* Hover overlay hint that click leaves Heaven */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent 45%)" }}>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white px-2.5 py-1 rounded-full"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
                <ExternalLink className="w-3 h-3" /> Instagram
              </span>
            </div>
          </div>
        )}

        {/* Footer — counts + permalink */}
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
            <a
              href={item.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold transition-opacity hover:opacity-80"
              style={{ color: "#dc2743" }}
            >
              Voir sur Instagram
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    );
  }

  // ─── Wall source (fan message) ─────────────────────────────────────────────
  if (item.source_type === "wall") {
    const pseudo = item.author_pseudo || "Anonyme";
    return (
      <div
        className="rounded-2xl p-5 sm:p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", ...stagger }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ background: "var(--bg3)", color: "var(--text-muted)" }}
          >
            {pseudo.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ContentBadge type="wall" authorPseudo={pseudo} compact />
              </div>
              <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
                {timeAgo(item.posted_at)}
              </span>
            </div>
            {item.caption && (
              <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {item.caption}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Manual source (exclusive web content) ─────────────────────────────────
  const postTier = normalizeTier(item.tier || "public");
  const tierHex = TIER_HEX[postTier] || "#64748B";
  const tierUnlocked =
    postTier === "p0" ||
    postTier === "public" ||
    isModelLoggedIn ||
    (unlockedTier && tierIncludes(unlockedTier, postTier));

  // Phase 5.B visibility: if pack_id + computed blurred → overlay blur; paywall → lock icon.
  const vc = item.visibility_computed;
  const packBlurred = !!vc?.blurred;
  const paywallActive = !!vc?.showPaywall;
  // Combined "can view cleanly" check : either tier-unlocked AND not pack-blurred,
  // or admin. The pack visibility rules stack on top of tier gating.
  const mediaUnlocked = isModelLoggedIn || (tierUnlocked && !packBlurred && !paywallActive);
  const alreadyPurchased = purchasedItems?.has(item.id) ?? false;

  const blurStyle = packBlurred
    ? { filter: `blur(${Math.max(vc?.blurIntensity ?? 12, 8)}px) brightness(0.45)`, transform: "scale(1.15)" }
    : { filter: "blur(14px) brightness(0.4)", transform: "scale(1.15)" };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", ...stagger }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4 p-5 sm:p-6 pb-3 sm:pb-4">
        <div
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}
        >
          {model.avatar ? (
            <img src={model.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            model.display_name.charAt(0)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
                {model.display_name}
              </span>
              <ContentBadge type="crown" compact />
              {postTier !== "public" && postTier !== "p0" && (
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${tierHex}12`, color: tierHex }}
                >
                  {TIER_META[postTier]?.label || postTier.toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
              {timeAgo(item.posted_at)}
            </span>
          </div>
          {item.caption && (
            <p className="text-base mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>
              {item.caption}
            </p>
          )}
        </div>
      </div>

      {/* Media — unlocked or locked */}
      {item.media_url &&
        (mediaUnlocked ? (
          <div
            className="cursor-pointer mx-5 sm:mx-6 mb-4 rounded-xl overflow-hidden"
            onClick={() => onOpenLightbox(item.media_url!)}
          >
            <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn}>
              <img src={item.media_url} alt="" className="w-full max-h-[400px] sm:max-h-[500px] object-cover" loading="lazy" />
            </ContentProtection>
          </div>
        ) : (
          <div
            className="relative cursor-pointer mx-5 sm:mx-6 mb-4 rounded-xl overflow-hidden"
            onClick={() => {
              if (alreadyPurchased && item.media_url) {
                onOpenLightbox(item.media_url);
                return;
              }
              onNavigateTier(postTier !== "public" ? postTier : "feed");
            }}
          >
            <div className="w-full h-[300px] sm:h-[400px] relative">
              <img
                src={item.media_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={blurStyle}
                loading="lazy"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(160deg, ${tierHex}20 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)`,
                }}
              />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Lock className="w-6 h-6" style={{ color: "#fff", opacity: 0.9 }} />
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
              >
                {TIER_META[postTier]?.symbol} {TIER_META[postTier]?.label || "Exclusive"}
              </span>
            </div>
          </div>
        ))}

      {/* Footer — counts */}
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
}
