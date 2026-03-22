"use client";

import { useState } from "react";
import { X, Copy, Check, MessageCircle, QrCode } from "lucide-react";

interface GenerateModalProps {
  open: boolean;
  onClose: () => void;
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

const DURATIONS = [
  { label: "7 jours", value: 168 },
  { label: "30 jours", value: 720 },
  { label: "90 jours", value: 2160 },
];

export function GenerateModal({ open, onClose, onGenerate }: GenerateModalProps) {
  const [client, setClient] = useState("");
  const [platform, setPlatform] = useState("snapchat");
  const [tier, setTier] = useState("vip");
  const [duration, setDuration] = useState(168);
  const [type, setType] = useState<"paid" | "promo" | "gift">("paid");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleGenerate = () => {
    const code = onGenerate({ client, platform, tier, duration, type });
    if (code) setGeneratedCode(code);
  };

  const handleCopy = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setGeneratedCode(null);
    setClient("");
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop" onClick={handleClose}>
      <div
        className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            {generatedCode ? "Code Generated" : "Generate Access Code"}
          </h2>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {generatedCode ? (
          /* Success state */
          <div className="px-6 pb-6">
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(16,185,129,0.15)" }}>
                  <Check className="w-6 h-6" style={{ color: "var(--success)" }} />
                </div>
                <p className="code-string text-xl font-bold tracking-widest mb-1" style={{ color: "var(--text)" }}>
                  {generatedCode}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {TIERS.find(t => t.id === tier)?.label} · {DURATIONS.find(d => d.value === duration)?.label || `${duration}h`}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleCopy} className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
                style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent)" }}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
                style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                <MessageCircle className="w-3.5 h-3.5" />WhatsApp
              </button>
              <button className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
                style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
                <QrCode className="w-3.5 h-3.5" />QR
              </button>
            </div>

            <button onClick={handleClose} className="w-full mt-4 py-3 rounded-xl text-sm font-semibold cursor-pointer btn-gradient">
              Done
            </button>
          </div>
        ) : (
          /* Form */
          <div className="px-6 pb-6 space-y-5">
            {/* Tier selection */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>Tier</label>
              <div className="grid grid-cols-4 gap-2">
                {TIERS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTier(t.id)}
                    className="py-2.5 rounded-xl text-center text-xs font-medium cursor-pointer transition-all"
                    style={{
                      background: tier === t.id ? `${t.color}20` : "rgba(255,255,255,0.03)",
                      color: tier === t.id ? t.color : "var(--text-muted)",
                      border: `1px solid ${tier === t.id ? `${t.color}40` : "var(--border2)"}`,
                    }}
                  >
                    <span className="text-lg block mb-0.5">{t.symbol}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>Duration</label>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all"
                    style={{
                      background: duration === d.value ? "var(--accent)" : "rgba(255,255,255,0.03)",
                      color: duration === d.value ? "#fff" : "var(--text-muted)",
                      border: `1px solid ${duration === d.value ? "var(--accent)" : "var(--border2)"}`,
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Client */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>Client</label>
              <input
                value={client}
                onChange={e => setClient(e.target.value)}
                placeholder="Name or username..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
              />
            </div>

            {/* Platform */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>Platform</label>
              <div className="flex gap-2">
                {["snapchat", "instagram", "other"].map(p => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer capitalize"
                    style={{
                      background: platform === p ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                      color: platform === p ? "var(--text)" : "var(--text-muted)",
                      border: `1px solid ${platform === p ? "var(--border3)" : "var(--border2)"}`,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!client.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer btn-gradient disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Generate Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
