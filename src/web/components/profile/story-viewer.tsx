"use client";

import { X } from "lucide-react";
import type { Post, ModelInfo } from "@/types/heaven";

interface StoryViewerProps {
  stories: Post[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  model: Pick<ModelInfo, "display_name" | "avatar">;
}

export function StoryViewer({ stories, currentIndex, onClose, onNext, onPrev, model }: StoryViewerProps) {
  const story = stories[currentIndex];
  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: "#000" }}>
      <div className="relative w-full h-full max-w-[430px] mx-auto flex items-center justify-center">
        <img src={story.media_url!} alt="" className="w-full h-full object-cover" style={{ maxHeight: "100vh" }} />
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
              style={{ background: i <= currentIndex ? "#fff" : "rgba(255,255,255,0.3)" }} />
          ))}
        </div>
        {/* Model info */}
        <div className="absolute top-6 left-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden" style={{ border: "1.5px solid rgba(255,255,255,0.5)" }}>
            {model.avatar ? <img src={model.avatar} alt="" className="w-full h-full object-cover" /> :
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--accent)" }}>{model.display_name.charAt(0)}</div>}
          </div>
          <span className="text-xs font-semibold text-white">{model.display_name}</span>
          <span className="text-[10px] text-white/50">{new Date(story.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
        </div>
        {/* Nav — tap left/right halves (below close button) */}
        <div className="absolute inset-0 flex z-[1]">
          <div className="flex-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); onPrev(); }} />
          <div className="flex-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); onNext(); }} />
        </div>
        {/* Close — above nav zones so tap registers */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-6 right-4 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer z-[2]"
          style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)" }}
          aria-label="Fermer la story"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
