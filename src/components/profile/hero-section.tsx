"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";
import type { ModelInfo, Post } from "@/types/heaven";

interface HeroSectionProps {
  model: ModelInfo;
  displayModel: ModelInfo | null;
  posts: Post[];
  uploads: { id: string; dataUrl: string; type: string }[];
  wallPostsCount: number;
  activeStories: Post[];
  onStoryClick: () => void;
  isEditMode: boolean;
  isTierView: boolean;
  contentUnlocked: boolean;
  visitorRegistered: boolean;
  isModelLoggedIn: boolean;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  updateEditField: (field: string, value: unknown) => void;
  editProfile: Partial<ModelInfo>;
  platforms?: Record<string, string>;
}

const PLATFORMS_MAP: Record<string, { color: string; prefix: string }> = {
  instagram: { color: "#C13584", prefix: "https://instagram.com/" },
  snapchat: { color: "#997A00", prefix: "https://snapchat.com/add/" },
  onlyfans: { color: "#008CCF", prefix: "https://onlyfans.com/" },
  fanvue: { color: "#6D28D9", prefix: "https://fanvue.com/" },
  tiktok: { color: "#333", prefix: "https://tiktok.com/@" },
  mym: { color: "#CC2952", prefix: "https://mym.fans/" },
};

export function HeroSection({
  model,
  displayModel,
  posts,
  uploads,
  wallPostsCount,
  activeStories,
  onStoryClick,
  isEditMode,
  isTierView,
  contentUnlocked,
  visitorRegistered,
  isModelLoggedIn,
  onAvatarUpload,
  onBannerUpload,
  updateEditField,
  editProfile,
  platforms,
}: HeroSectionProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const dm = displayModel || model;
  const latestImagePost = posts.find(p => p.media_url);
  const bannerUrl = dm?.banner || latestImagePost?.media_url || null;

  return (
    <div className="relative" style={{
      maxHeight: isTierView ? "0px" : "70vh",
      overflow: "hidden",
      transition: "max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease",
      opacity: isTierView ? 0 : 1,
    }}>
      <div className="min-h-[50vh] sm:min-h-[60vh] md:min-h-[70vh] relative overflow-hidden" style={{
        background: bannerUrl
          ? `url(${bannerUrl}) center/cover no-repeat`
          : "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%)",
      }}>
        {/* Multi-layer gradient overlay */}
        <div className="absolute inset-0" style={{
          background: `
            linear-gradient(to top, var(--bg) 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.2) 60%, transparent 100%),
            radial-gradient(ellipse at 20% 80%, rgba(0,0,0,0.4), transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(0,0,0,0.2), transparent 60%)
          `,
        }} />
        {/* Vignette edges */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)",
        }} />

        {/* Grid blur overlay for unverified visitors */}
        {!contentUnlocked && visitorRegistered && (
          <>
            <div className="absolute inset-0" style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />
            <div className="absolute inset-0 heaven-grid-overlay" />
          </>
        )}

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-5 sm:px-8 md:px-12 pb-10 sm:pb-14 md:pb-16 max-w-6xl mx-auto">
          <div className="flex items-end gap-5 sm:gap-6 md:gap-8">
            {/* Avatar with story ring */}
            <div className="relative shrink-0 profile-stagger-1">
              <div
                className={`rounded-full p-[3px] ${activeStories.length > 0 ? "cursor-pointer" : ""}`}
                style={{
                  background: activeStories.length > 0
                    ? "linear-gradient(135deg, var(--accent), #F43F5E, #D946EF, #F59E0B)"
                    : "var(--bg)",
                }}
                onClick={() => { if (activeStories.length > 0) onStoryClick(); }}
              >
                <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full overflow-hidden"
                  style={{
                    border: "3px solid var(--bg)",
                    background: dm?.avatar ? "transparent" : "linear-gradient(135deg, var(--rose), var(--accent))",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
                  }}>
                  {dm?.avatar ? (
                    <img src={dm.avatar} alt={dm.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-3xl sm:text-4xl font-light text-white" style={{ letterSpacing: "0.05em" }}>
                      {dm?.display_name.charAt(0)}
                    </span>
                  )}
                </div>
              </div>
              {!isEditMode && dm?.online && (
                <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full"
                  style={{ background: "var(--success)", border: "2px solid var(--bg)", boxShadow: "0 0 10px rgba(16,185,129,0.6)" }} />
              )}
            </div>

            {/* Name + bio + stats */}
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="profile-stagger-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light uppercase truncate"
                style={{ color: "#fff", letterSpacing: "0.12em", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>
                {dm?.display_name}
              </h1>
              {dm?.bio && (
                <p className="profile-stagger-3 text-sm sm:text-base mt-2 sm:mt-3 line-clamp-2 leading-relaxed max-w-lg"
                  style={{ color: "rgba(255,255,255,0.7)" }}>
                  {dm.bio}
                </p>
              )}
              {dm?.status_text && !isEditMode && (
                <p className="text-sm sm:text-base mt-2 max-w-md" style={{ color: "rgba(255,255,255,0.8)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                  {dm.status_text}
                </p>
              )}
              <div className="profile-stagger-4 flex items-center gap-6 sm:gap-8 mt-3 sm:mt-4">
                <span className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <span className="font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.9)" }}>{posts.length}</span> posts
                </span>
                <span className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <span className="font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.9)" }}>{wallPostsCount}</span> fans
                </span>
                <span className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <span className="font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.9)" }}>{uploads.length + posts.filter(p => p.media_url).length}</span> media
                </span>
                {/* Platform icons */}
                {platforms && (
                  <div className="hidden sm:flex items-center gap-2 ml-2">
                    {Object.entries(platforms).filter(([, v]) => v).map(([platform, handle]) => {
                      const p = PLATFORMS_MAP[platform];
                      if (!p || !handle) return null;
                      const url = handle.startsWith("http") ? handle : `${p.prefix}${handle}`;
                      return (
                        <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 no-underline opacity-60 hover:opacity-100 transition-opacity" title={`${platform}: @${handle}`}>
                          <div className="w-3.5 h-3.5 rounded-full" style={{ background: p.color }} />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit mode buttons */}
      {isEditMode && (
        <div className="absolute top-14 right-4 z-20 flex gap-2">
          <button onClick={() => bannerInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer text-[10px] font-medium transition-all hover:scale-105"
            style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Camera className="w-3.5 h-3.5" /> Banniere
          </button>
          <button onClick={() => avatarInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer text-[10px] font-medium transition-all hover:scale-105"
            style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Camera className="w-3.5 h-3.5" /> Avatar
          </button>
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={onBannerUpload} />
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarUpload} />
        </div>
      )}

      {/* Edit mode: profile fields */}
      {isEditMode && (
        <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12 -mt-4 mb-4">
          <div className="space-y-3 p-5 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <input
              value={dm?.display_name || ""}
              onChange={e => updateEditField("display_name", e.target.value)}
              className="text-lg font-bold bg-transparent outline-none rounded-lg px-3 py-2 w-full"
              style={{ color: "var(--text)", border: "1px dashed var(--border3)" }}
              placeholder="Display name"
            />
            <input
              value={dm?.status || ""}
              onChange={e => updateEditField("status", e.target.value)}
              className="w-full text-xs bg-transparent outline-none rounded-lg px-3 py-2"
              style={{ color: "var(--text-muted)", border: "1px dashed var(--border3)" }}
              placeholder="Status"
            />
            <input
              value={editProfile.status_text ?? dm?.status_text ?? ""}
              onChange={e => updateEditField("status_text", e.target.value)}
              placeholder="Ton humeur, une promo, une annonce..."
              className="w-full text-sm bg-transparent outline-none rounded-lg px-3 py-2 text-center"
              style={{ color: "var(--text)", border: "1px dashed var(--border3)", background: "rgba(0,0,0,0.15)" }}
              maxLength={200}
            />
            <textarea
              value={dm?.bio || ""}
              onChange={e => updateEditField("bio", e.target.value)}
              className="w-full text-sm leading-relaxed bg-transparent outline-none rounded-lg px-3 py-2 resize-none"
              style={{ color: "var(--text-secondary)", border: "1px dashed var(--border3)" }}
              placeholder="Bio..."
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
}
