"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Story {
  id: string;
  media_url: string;
  content?: string;
  created_at: string;
  tier_required?: string;
}

interface StoriesBarProps {
  stories: Story[];
  modelName: string;
  modelAvatar?: string;
  isModelLoggedIn?: boolean;
  onAddStory?: () => void;
}

export function StoriesBar({ stories, modelName, modelAvatar, isModelLoggedIn, onAddStory }: StoriesBarProps) {
  const [viewingIdx, setViewingIdx] = useState<number | null>(null);

  if (stories.length === 0 && !isModelLoggedIn) return null;

  return (
    <>
      {/* Stories circles */}
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-2 px-1">
        {/* Add story button (model only) */}
        {isModelLoggedIn && (
          <button onClick={onAddStory}
            className="shrink-0 w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105"
            style={{ border: "2px dashed var(--border3)", background: "var(--bg2)" }}>
            <span className="text-xl" style={{ color: "var(--text-muted)" }}>+</span>
          </button>
        )}
        {stories.map((story, i) => (
          <button key={story.id} onClick={() => setViewingIdx(i)}
            className="shrink-0 w-16 h-16 rounded-full overflow-hidden cursor-pointer transition-all hover:scale-105 p-[2px]"
            style={{ background: "linear-gradient(135deg, var(--accent), #F43F5E, #D946EF)" }}>
            <img src={story.media_url} alt="" className="w-full h-full rounded-full object-cover"
              style={{ border: "2px solid var(--bg)" }} />
          </button>
        ))}
      </div>

      {/* Fullscreen story viewer */}
      {viewingIdx !== null && stories[viewingIdx] && (() => {
        const story = stories[viewingIdx];
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center"
            style={{ background: "#000" }}>
            {/* Story image — 9:16 aspect, centered */}
            <div className="relative w-full h-full max-w-[430px] mx-auto flex items-center justify-center">
              <img src={story.media_url} alt=""
                className="w-full h-full object-cover"
                style={{ maxHeight: "100vh" }} />

              {/* Caption */}
              {story.content && (
                <div className="absolute bottom-20 left-4 right-4">
                  <p className="text-sm font-medium text-white text-center px-4 py-2 rounded-xl"
                    style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
                    {story.content}
                  </p>
                </div>
              )}

              {/* Progress bar */}
              <div className="absolute top-2 left-2 right-2 flex gap-1">
                {stories.map((_, i) => (
                  <div key={i} className="flex-1 h-[2px] rounded-full"
                    style={{ background: i <= viewingIdx ? "#fff" : "rgba(255,255,255,0.3)" }} />
                ))}
              </div>

              {/* Model info */}
              <div className="absolute top-6 left-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden" style={{ border: "1.5px solid rgba(255,255,255,0.5)" }}>
                  {modelAvatar ? <img src={modelAvatar} alt="" className="w-full h-full object-cover" /> :
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--accent)" }}>{modelName.charAt(0)}</div>}
                </div>
                <span className="text-xs font-semibold text-white">{modelName}</span>
                <span className="text-[10px] text-white/50">{new Date(story.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
              </div>

              {/* Close */}
              <button onClick={() => setViewingIdx(null)}
                className="absolute top-6 right-4 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(255,255,255,0.1)", border: "none" }}>
                <X className="w-4 h-4 text-white" />
              </button>

              {/* Nav — tap left/right */}
              <div className="absolute inset-0 flex">
                <div className="flex-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); setViewingIdx(Math.max(0, viewingIdx - 1)); }} />
                <div className="flex-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); setViewingIdx(viewingIdx < stories.length - 1 ? viewingIdx + 1 : null); }} />
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
