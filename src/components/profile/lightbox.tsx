"use client";

import { X } from "lucide-react";
import { ContentProtection } from "@/components/content-protection";

interface LightboxProps {
  src: string | null;
  onClose: () => void;
  username?: string;
  protectionEnabled?: boolean;
}

export function Lightbox({ src, onClose, username = "", protectionEnabled = false }: LightboxProps) {
  if (!src) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.95)" }}
      onClick={onClose}>
      <button className="absolute top-5 right-5 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:bg-white/20"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }} onClick={onClose}>
        <X className="w-5 h-5 text-white" />
      </button>
      <ContentProtection username={username} enabled={protectionEnabled}>
        <img src={src} alt="" className="max-w-[92vw] max-h-[88vh] object-contain" style={{ borderRadius: "var(--radius)" }} onClick={e => e.stopPropagation()} />
      </ContentProtection>
    </div>
  );
}
