"use client";

/**
 * HomePanel — Phase 2 Agent 2.B
 *
 * Dashboard home tab content extracted from `src/app/agence/page.tsx`
 * (monolithe P0-7). Rendu pur : reçoit l'état + les handlers en props
 * depuis le shell parent pour garder les sources de vérité au même endroit.
 *
 * Composition :
 * - Widget Instagram stats live (InstagramStatsWidget)
 * - Layout 2 colonnes : Feed (gauche) + Overview (sticky desktop, toggleable mobile)
 * - Composer inline (texte + photo + tier + feed/story)
 * - Timeline des posts + messages du mur
 */

import { Newspaper, Camera, Image as ImageIcon, Send, Trash2, Pin, Lock, Heart, MessageCircle, Eye, X, ChevronDown } from "lucide-react";
// NB 2026-04-24 : InstagramStatsWidget retiré — stats IG fusionnées dans AgenceHeader.
// NB 2026-04-24 : OverviewSimulator retiré — obsolète (page Stratégie dédiée existe).
// Remplacé par BotActivityPanel (récap agent IA + prospects convertis).
import { BotActivityPanel } from "@/components/cockpit/dashboard/bot-activity-panel";
import { KpiStrip } from "@/components/cockpit/dashboard/kpi-strip";
import type { AccessCode, ClientInfo, FeedPost, PackConfig, WallPost } from "@/types/heaven";
import { isFreeSlot } from "@/lib/tier-utils";
import { toModelId } from "@/lib/model-utils";

const surface = "bg-white/[0.03] border border-white/[0.06] rounded-xl";
const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export interface HomePanelProps {
  /* — Model & display — */
  modelSlug: string;
  modelInfo: { avatar?: string; online?: boolean; display_name?: string; status?: string } | null;
  /* — Overview metrics — */
  revenue: number;
  activeCodes: AccessCode[];
  modelCodes: AccessCode[];
  packs: PackConfig[];
  clients: ClientInfo[];
  uniqueClients: number;
  retentionRate: number;
  stories: FeedPost[];
  /* — Feed & wall — */
  feedPosts: FeedPost[];
  wallPosts: WallPost[];
  /* — Composer state (controlled from parent) — */
  newPostContent: string;
  setNewPostContent: (v: string) => void;
  newPostTier: string;
  setNewPostTier: (v: string) => void;
  newPostImage: string | null;
  setNewPostImage: (v: string | null) => void;
  newPostType: "feed" | "story";
  setNewPostType: (v: "feed" | "story") => void;
  posting: boolean;
  tierOptions: { id: string; label: string; color: string }[];
  /* — UI state — */
  showMobileOverview: boolean;
  setShowMobileOverview: (fn: (prev: boolean) => boolean) => void;
  deleteConfirm: string | null;
  setDeleteConfirm: (v: string | null) => void;
  /* — Actions — */
  onCreatePost: () => void;
  onDeletePost: (postId: string) => void;
  onPostImageChange: (file: File) => void;
}

export function HomePanel(props: HomePanelProps) {
  const {
    modelSlug, modelInfo,
    revenue, activeCodes, modelCodes, packs, clients, uniqueClients, retentionRate, stories,
    feedPosts, wallPosts,
    newPostContent, setNewPostContent, newPostTier, setNewPostTier, newPostImage, setNewPostImage,
    newPostType, setNewPostType, posting, tierOptions,
    showMobileOverview, setShowMobileOverview,
    deleteConfirm, setDeleteConfirm,
    onCreatePost, onDeletePost, onPostImageChange,
  } = props;

  const modelId = toModelId(modelSlug);

  return (
    <div className="space-y-4">
      {/* KPI strip repliable — NB 2026-04-24 : toggle pour faire remonter le feed si besoin */}
      <div>
        <button
          onClick={() => setShowMobileOverview(prev => !prev)}
          className="w-full flex items-center justify-between px-4 py-2 rounded-xl cursor-pointer transition-all mb-2"
          style={{ background: "var(--w03)", border: "1px solid var(--w06)" }}
          aria-expanded={showMobileOverview}
          title={showMobileOverview ? "Masquer les KPIs" : "Afficher les KPIs"}
        >
          <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>
            {showMobileOverview ? "Masquer KPIs" : "Afficher KPIs"}
          </span>
          <ChevronDown
            className="w-3.5 h-3.5 transition-transform"
            style={{ color: "var(--text-muted)", transform: showMobileOverview ? "rotate(180deg)" : "rotate(0)" }}
          />
        </button>
        {showMobileOverview && <KpiStrip modelId={modelId} period={30} />}
      </div>

      {/* Two-column layout: Feed (left) + BotActivity (right sticky) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
        {/* ── LEFT COLUMN: Feed ── */}
        <div className="space-y-4 min-w-0">

          {/* ── Composer Card ── */}
          <div className={`${surface} overflow-hidden`}>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden"
                  style={{ background: modelInfo?.avatar ? "transparent" : "linear-gradient(135deg, #E63329, #E84393)", color: "#fff" }}>
                  {modelInfo?.avatar ? <img src={modelInfo.avatar} alt="" className="w-full h-full object-cover" /> : modelSlug.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)}
                    placeholder="Partager quelque chose avec tes abonnés..."
                    rows={2}
                    className="w-full bg-transparent text-sm outline-none resize-none text-white placeholder:text-white/25 leading-relaxed" />

                  {newPostImage && !posting && (
                    <div className="relative mt-2 rounded-xl overflow-hidden border border-white/[0.08] max-h-[300px]">
                      <img src={newPostImage} alt="" className="w-full object-cover max-h-[300px]" draggable={false} />
                      <button onClick={() => setNewPostImage(null)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border-none transition-transform hover:scale-110"
                        style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {posting && newPostImage && (
                    <div className="h-1 rounded-full overflow-hidden bg-white/[0.06] mt-2">
                      <div className="h-full rounded-full bg-[#D4AF37]" style={{ animation: "uploadProg 2s ease-in-out infinite" }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom bar — actions */}
            <div className="border-t border-white/[0.06]">
              {(newPostContent.trim() || newPostImage) && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {tierOptions.filter(t => t.id !== "p0").map(t => {
                      const selected = newPostTier === t.id;
                      return (
                        <button key={t.id} onClick={() => setNewPostTier(selected ? "p0" : t.id)}
                          className="px-2 py-1 rounded-md text-[10px] font-semibold cursor-pointer shrink-0 transition-all border-none"
                          style={{
                            background: selected ? t.color : "transparent",
                            color: selected ? "#fff" : "var(--w25)",
                            outline: `1px solid ${selected ? t.color : "var(--w06)"}`,
                          }}>
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={onCreatePost} disabled={(!newPostContent.trim() && !newPostImage) || posting}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:brightness-110 disabled:opacity-20 border-none shrink-0 ml-2"
                    style={{ background: "#D4AF37", color: "var(--bg)" }}>
                    <Send className="w-3.5 h-3.5" />
                    {posting ? "..." : "Publier"}
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-2">
                <div className="flex items-center rounded-lg overflow-hidden border border-white/[0.08]">
                  {(["feed", "story"] as const).map(type => (
                    <button key={type} onClick={() => setNewPostType(type)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium cursor-pointer transition-colors border-none"
                      style={{ background: newPostType === type ? "rgba(230,51,41,0.15)" : "transparent", color: newPostType === type ? "#E63329" : "var(--w3)" }}>
                      {type === "feed" ? <Newspaper className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                      {type === "feed" ? "Feed" : "Story"}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer border border-white/[0.08] text-white/30 hover:text-white/60 hover:border-white/[0.15] transition-colors">
                  <ImageIcon className="w-3 h-3" /> Photo
                  <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onPostImageChange(file);
                    e.target.value = "";
                  }} />
                </label>
              </div>
            </div>
          </div>

          {/* ── Feed Timeline ── */}
          {feedPosts.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="w-8 h-8 mx-auto mb-3 text-white/10" />
              <p className="text-sm text-white/25">Aucun post pour le moment</p>
              <p className="text-xs text-white/15 mt-1">Publie ton premier contenu ci-dessus</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedPosts.map(post => {
                const tierColor = tierOptions.find(t => t.id === post.tier_required)?.color;
                const tierLabel = tierOptions.find(t => t.id === post.tier_required)?.label;
                const isLocked = !isFreeSlot(post.tier_required);
                const isStory = (post as FeedPost & { post_type?: string }).post_type === "story";
                return (
                  <div key={post.id} className={`${surface} overflow-hidden`}>
                    <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
                        style={{ background: modelInfo?.avatar ? "transparent" : "linear-gradient(135deg, #E63329, #E84393)", color: "#fff" }}>
                        {modelInfo?.avatar ? <img src={modelInfo.avatar} alt="" className="w-full h-full object-cover" /> : modelSlug.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{modelInfo?.display_name || modelSlug.toUpperCase()}</span>
                          {isStory && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>Story</span>}
                          {isLocked && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${tierColor}20`, color: tierColor }}>{tierLabel}</span>}
                          {post.pinned && <Pin className="w-3 h-3 text-[#D4AF37]" />}
                        </div>
                        <span className="text-[11px] text-white/25">{relativeTime(post.created_at)}</span>
                      </div>
                      {deleteConfirm === post.id ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => onDeletePost(post.id)} className="text-[10px] font-semibold text-red-400 cursor-pointer bg-transparent border-none">Supprimer</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-[10px] text-white/30 cursor-pointer bg-transparent border-none">Non</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(post.id)} className="cursor-pointer bg-transparent border-none text-white/15 hover:text-red-400 transition-colors p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {post.content && (
                      <div className="px-4 pb-2">
                        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      </div>
                    )}

                    {post.media_url && (
                      <div className="relative">
                        <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover" loading="lazy" />
                        {isLocked && (
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
                            <Lock className="w-3 h-3" style={{ color: tierColor }} />
                            <span className="text-[10px] font-bold" style={{ color: tierColor }}>{tierLabel}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-6 px-4 py-2.5 border-t border-white/[0.04]">
                      <div className="flex items-center gap-1.5 text-white/30">
                        <Heart className="w-4 h-4" fill={(post.likes_count || 0) > 0 ? "currentColor" : "none"} style={(post.likes_count || 0) > 0 ? { color: "#F43F5E" } : {}} />
                        <span className="text-xs tabular-nums">{post.likes_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-white/30">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs tabular-nums">{post.comments_count || 0}</span>
                      </div>
                      <div className="flex-1" />
                      {isLocked && (
                        <span className="text-[10px] text-white/20 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Reserve {tierLabel}
                        </span>
                      )}
                      {!isLocked && (
                        <span className="text-[10px] text-white/20 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Public
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Wall Messages section ── */}
          {(() => {
            const clientMessages = wallPosts.filter(w => !w.content?.includes("#post-") && w.pseudo !== "SYSTEM");
            if (clientMessages.length === 0) return null;
            return (
              <div>
                <div className="flex items-center gap-2 mb-3 mt-2">
                  <span className="text-xs uppercase tracking-wider text-white/30 font-semibold">Messages du mur</span>
                  <span className="text-[10px] text-white/20">{clientMessages.length}</span>
                </div>
                <div className="space-y-2">
                  {clientMessages.slice(0, 10).map(w => (
                    <div key={w.id} className={`${surface} px-4 py-3 flex items-start gap-3`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37" }}>
                        {(w.pseudo || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white/70">@{w.pseudo}</span>
                          <span className="text-[10px] text-white/20">{relativeTime(w.created_at)}</span>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{w.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── RIGHT COLUMN: Bot activity (sticky desktop) ── */}
        <div className="hidden lg:block sticky top-4">
          <BotActivityPanel modelSlug={modelSlug} />
        </div>

        {/* Mobile: Bot activity inline en bas du feed */}
        <div className="lg:hidden">
          <BotActivityPanel modelSlug={modelSlug} />
        </div>
      </div>
    </div>
  );
}

export default HomePanel;
