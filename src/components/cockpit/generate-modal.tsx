"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Link2, Send } from "lucide-react";

interface GenerateModalProps {
  open: boolean;
  onClose: () => void;
  modelSlug: string;
  prefillClient?: string;
  onGenerate: (data: {
    client: string;
    platform: string;
    tier: string;
    duration: number;
    type: "paid" | "promo" | "gift";
  }) => string | null;
}

const TIERS = [
  { id: "vip", label: "VIP", symbol: "♥", color: "var(--tier-vip)" },
  { id: "gold", label: "Gold", symbol: "★", color: "var(--tier-gold)" },
  { id: "diamond", label: "Diamond", symbol: "♦", color: "var(--tier-diamond)" },
  { id: "platinum", label: "Platinum", symbol: "♛", color: "var(--tier-platinum)" },
];

// Duration is now a slider 1-30 days

export function GenerateModal({ open, onClose, onGenerate, modelSlug, prefillClient = "" }: GenerateModalProps) {
  const [client, setClient] = useState("");
  const [platform, setPlatform] = useState("snapchat");
  const [tier, setTier] = useState("vip");
  const [durationDays, setDurationDays] = useState(7);
  const [type, setType] = useState<"paid" | "promo" | "gift">("paid");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => { if (prefillClient) setClient(prefillClient); }, [prefillClient]);

  if (!open) return null;

  const accessLink = generatedCode
    ? `${origin}/m/${modelSlug}?access=${encodeURIComponent(generatedCode)}`
    : "";

  const handleGenerate = () => {
    const code = onGenerate({ client, platform, tier, duration: durationDays * 24, type });
    if (code) setGeneratedCode(code);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(accessLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setGeneratedCode(null);
    setClient("");
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center sheet-backdrop" onClick={handleClose}>
      <div
        className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border2)", maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            {generatedCode ? "Lien d'accès généré" : "Générer un accès"}
          </h2>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {generatedCode ? (
          <div className="px-6 pb-6">
            <div className="py-5 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(16,185,129,0.15)" }}>
                <Check className="w-6 h-6" style={{ color: "var(--success)" }} />
              </div>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                {TIERS.find(t => t.id === tier)?.label} · {durationDays}j · {client}
              </p>
              {/* Link preview */}
              <div className="mt-3 p-3 rounded-xl text-left" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Link2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                  <span className="text-[10px] font-medium" style={{ color: "var(--accent)" }}>Lien d'accès</span>
                </div>
                <p className="text-[11px] break-all leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {accessLink}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {/* Code display */}
              <div className="p-3 rounded-xl text-center" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Code</p>
                <p className="text-lg font-black font-mono tracking-widest" style={{ color: "var(--text)" }}>{generatedCode}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { navigator.clipboard.writeText(generatedCode || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform"
                  style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border)" }}>
                  <Copy className="w-3.5 h-3.5" /> Code
                </button>
                <button onClick={handleCopyLink}
                  className="py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer btn-gradient hover:scale-[1.01] active:scale-[0.99] transition-transform">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                  {copied ? "Copié !" : "Lien"}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                    handleCopyLink();
                    const username = client.trim().replace(/^@/, "");
                    // Snapchat deep link: opens chat with user directly
                    const snapUrl = platform === "snapchat" && username
                      ? `https://www.snapchat.com/add/${encodeURIComponent(username)}`
                      : `https://www.snapchat.com/`;
                    window.open(snapUrl, "_blank");
                  }}
                  className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-medium cursor-pointer hover:scale-105 active:scale-95 transition-transform ${platform === "snapchat" ? "ring-1 ring-[#997A00]/40" : ""}`}
                  style={{ background: "rgba(153,122,0,0.08)", color: "#997A00", border: "1px solid rgba(153,122,0,0.2)" }}>
                  <Send className="w-3.5 h-3.5" /> Snap
                  {platform === "snapchat" && client.trim() && <span className="text-[10px] opacity-70">@{client.trim().replace(/^@/, "").slice(0, 10)}</span>}
                </button>
                <button onClick={() => {
                    handleCopyLink();
                    const username = client.trim().replace(/^@/, "");
                    // Instagram deep link: opens DM with user directly
                    const instaUrl = platform === "instagram" && username
                      ? `https://ig.me/m/${encodeURIComponent(username)}`
                      : `https://www.instagram.com/${username ? encodeURIComponent(username) + "/" : ""}`;
                    window.open(instaUrl, "_blank");
                  }}
                  className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-medium cursor-pointer hover:scale-105 active:scale-95 transition-transform ${platform === "instagram" ? "ring-1 ring-[#E1306C]/40" : ""}`}
                  style={{ background: "rgba(225,48,108,0.08)", color: "#E1306C", border: "1px solid rgba(225,48,108,0.2)" }}>
                  <Send className="w-3.5 h-3.5" /> Insta
                  {platform === "instagram" && client.trim() && <span className="text-[10px] opacity-70">@{client.trim().replace(/^@/, "").slice(0, 10)}</span>}
                </button>
              </div>
              <button onClick={handleClose} className="w-full py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-20 md:pb-6 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(85vh - 80px)" }}>
            {/* Tier */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>Pack</label>
              <div className="flex gap-3 justify-center">
                {TIERS.map(t => (
                  <button key={t.id} onClick={() => setTier(t.id)}
                    className="w-14 h-14 rounded-xl text-2xl cursor-pointer transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                    style={{
                      background: `${t.color}15`,
                      color: t.color,
                      border: tier === t.id ? `3px solid ${t.color}` : "3px solid transparent",
                      boxShadow: tier === t.id ? `0 0 16px ${t.color}30` : "none",
                    }}>
                    {t.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration — slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Duree</label>
                <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>{durationDays}j</span>
              </div>
              <input type="range" min={1} max={30} value={durationDays} onChange={e => setDurationDays(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, var(--accent) ${(durationDays / 30) * 100}%, var(--border) ${(durationDays / 30) * 100}%)` }} />
              <div className="flex justify-between text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>
                <span>1j</span><span>7j</span><span>15j</span><span>30j</span>
              </div>
            </div>

            {/* Client + Platform inline */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>Client</label>
              <div className="flex items-center gap-2">
                {/* Platform dots — click to switch */}
                {[
                  { id: "snapchat", color: "#997A00" },
                  { id: "instagram", color: "#C13584" },
                ].map(p => (
                  <button key={p.id} onClick={() => setPlatform(p.id)}
                    className="w-8 h-8 rounded-full cursor-pointer transition-all hover:scale-110 active:scale-95 shrink-0 flex items-center justify-center"
                    style={{
                      background: platform === p.id ? p.color : `${p.color}20`,
                      border: `2px solid ${platform === p.id ? p.color : "transparent"}`,
                    }}>
                    {platform === p.id && <span className="w-2 h-2 rounded-full bg-white" />}
                  </button>
                ))}
                <input value={client} onChange={e => setClient(e.target.value)}
                  placeholder={platform === "snapchat" ? "pseudo snap..." : "pseudo insta..."}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
              </div>
            </div>

            <button onClick={handleGenerate} disabled={!client.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer btn-gradient disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] transition-transform">
              Générer le lien d'accès
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
