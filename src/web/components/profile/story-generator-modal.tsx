"use client";

/**
 * StoryGeneratorModal — BRIEF-21 (Session 2026-04-25 evening)
 * ───────────────────────────────────────────────────────────
 * Générateur d'image story téléchargeable (1080×1920) pour Instagram/Snap
 * avec :
 *  1. Image bg : dernière photo upload modèle OU upload local
 *  2. Slider flou (0-20px)
 *  3. Toggle code d'accès (généré via /api/codes, durée + pack/tier)
 *  4. Aperçu canvas temps réel + download PNG
 *
 * Style cohérent avec payment-reference-modal (backdrop blur 28px, fadeUp).
 * Responsive mobile-first : modal full-screen mobile, max-w-2xl desktop.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Camera, Download, Loader2, KeyRound, Image as ImageIcon } from "lucide-react";
import type { PackConfig } from "@/types/heaven";

interface StoryGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  modelSlug: string;
  packs?: PackConfig[];
}

const STORY_W = 1080;
const STORY_H = 1920;
const MAX_UPLOAD_MB = 10;

export function StoryGeneratorModal({ open, onClose, modelSlug, packs = [] }: StoryGeneratorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgSource, setBgSource] = useState<"last" | "local">("last");
  const [blurAmount, setBlurAmount] = useState(0); // 0-20 px
  const [includeCode, setIncludeCode] = useState(false);
  const [codeDays, setCodeDays] = useState(7);
  const [selectedPackId, setSelectedPackId] = useState<string>(packs[0]?.id || "");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingLast, setLoadingLast] = useState(false);

  // Récupère la dernière image upload du modèle au mount
  useEffect(() => {
    if (!open || bgSource !== "last") return;
    let cancelled = false;
    setLoadingLast(true);
    fetch(`/api/uploads?model=${encodeURIComponent(modelSlug)}&limit=1`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const url = data?.uploads?.[0]?.dataUrl || data?.uploads?.[0]?.url || null;
        if (url) setBgImageUrl(url);
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoadingLast(false); });
    return () => { cancelled = true; };
  }, [open, modelSlug, bgSource]);

  // Reset état à la fermeture
  useEffect(() => {
    if (!open) {
      setBgImageUrl(null);
      setBgSource("last");
      setBlurAmount(0);
      setIncludeCode(false);
      setGeneratedCode(null);
      setError(null);
    }
  }, [open]);

  // Upload local
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`Image > ${MAX_UPLOAD_MB} MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBgImageUrl(ev.target?.result as string);
      setBgSource("local");
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // Génération code d'accès
  const handleGenerateCode = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const tier = packs.find((p) => p.id === selectedPackId)?.id || "silver";
      const res = await fetch("/api/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelSlug,
          client: "story-share",
          tier,
          type: "promo",
          duration: codeDays * 24, // heures
          platform: "snapchat",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.code) throw new Error(data?.error || "Erreur génération");
      setGeneratedCode(data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur génération code");
    } finally {
      setGenerating(false);
    }
  }, [modelSlug, selectedPackId, codeDays, packs]);

  // Redessine le canvas à chaque changement
  useEffect(() => {
    if (!open || !canvasRef.current || !bgImageUrl) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = STORY_W;
    canvas.height = STORY_H;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, STORY_W, STORY_H);
      ctx.filter = blurAmount > 0 ? `blur(${blurAmount * 4}px)` : "none";
      // Cover-fit l'image sur 1080×1920
      const ratio = Math.max(STORY_W / img.width, STORY_H / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const x = (STORY_W - w) / 2;
      const y = (STORY_H - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      ctx.filter = "none";
      // Code overlay si activé
      if (includeCode && generatedCode) {
        ctx.fillStyle = "rgba(0,0,0,0.72)";
        ctx.fillRect(0, STORY_H - 280, STORY_W, 280);
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 60px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("CODE D'ACCÈS", STORY_W / 2, STORY_H - 180);
        ctx.font = "bold 96px monospace";
        ctx.fillText(generatedCode, STORY_W / 2, STORY_H - 80);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "32px sans-serif";
        ctx.fillText(`Valide ${codeDays}j`, STORY_W / 2, STORY_H - 30);
      }
    };
    img.onerror = () => {
      // CORS tainted canvas → fallback recommandé via upload local
      setError("Image distante non chargeable (CORS) — upload locale");
    };
    img.src = bgImageUrl;
  }, [open, bgImageUrl, blurAmount, includeCode, generatedCode, codeDays]);

  // Download PNG
  const handleDownload = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    try {
      canvas.toBlob((blob) => {
        if (!blob) { setError("Erreur génération PNG"); setDownloading(false); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `story-${modelSlug}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloading(false);
      }, "image/png", 0.95);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur download");
      setDownloading(false);
    }
  }, [modelSlug]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-0 sm:p-5"
      style={{
        background: "rgba(0,0,0,0.9)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Générateur de story"
    >
      <div
        className="w-full max-w-2xl h-full sm:h-auto sm:max-h-[92vh] overflow-y-auto rounded-none sm:rounded-2xl px-4 sm:px-6 py-5 sm:py-7 relative"
        style={{
          background: "linear-gradient(180deg, rgba(28,28,32,0.98), rgba(18,18,22,0.99))",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          animation: "fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-3 right-3 p-2 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
        >
          <X className="w-5 h-5" style={{ color: "#fff" }} />
        </button>

        <h2 className="text-base sm:text-lg font-bold tracking-wide uppercase mb-4 sm:mb-5 pr-8" style={{ color: "#fff" }}>
          Générer une story
        </h2>

        {/* Preview canvas */}
        <div className="mb-4 sm:mb-5 flex items-center justify-center">
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              aspectRatio: "9 / 16",
              maxHeight: "50vh",
              maxWidth: "100%",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              style={{ display: bgImageUrl ? "block" : "none" }}
            />
            {!bgImageUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4">
                {loadingLast ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
                    <span className="text-xs sm:text-sm" style={{ color: "var(--text-muted)" }}>
                      Chargement dernière image…
                    </span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs sm:text-sm" style={{ color: "var(--text-muted)" }}>
                      Aucune image — upload locale ou réessaye
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Source image toggle */}
        <div className="mb-4 flex items-center gap-2 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => { setBgSource("last"); setBgImageUrl(null); }}
            className="flex-1 py-2 rounded-lg transition-all"
            style={{
              background: bgSource === "last" ? "var(--accent)" : "rgba(255,255,255,0.05)",
              color: bgSource === "last" ? "#fff" : "var(--text-muted)",
              border: "1px solid var(--border)",
              minHeight: 44,
            }}
          >
            Dernière image
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: bgSource === "local" ? "var(--accent)" : "rgba(255,255,255,0.05)",
              color: bgSource === "local" ? "#fff" : "var(--text-muted)",
              border: "1px solid var(--border)",
              minHeight: 44,
            }}
          >
            <Camera className="w-3.5 h-3.5" />
            Upload locale
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Slider flou */}
        <div className="mb-4">
          <label className="flex items-center justify-between mb-1.5 text-xs sm:text-sm" style={{ color: "var(--text-muted)" }}>
            <span>Flou arrière-plan</span>
            <span style={{ color: "#fff" }}>{blurAmount}px</span>
          </label>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={blurAmount}
            onChange={(e) => setBlurAmount(parseInt(e.target.value, 10))}
            className="w-full"
            aria-label="Flou arrière-plan"
            style={{ accentColor: "var(--accent)" }}
          />
        </div>

        {/* Toggle code d'accès */}
        <div className="mb-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
          <label className="flex items-center justify-between cursor-pointer mb-2">
            <span className="text-xs sm:text-sm font-semibold" style={{ color: "#fff" }}>Inclure un code d'accès</span>
            <input
              type="checkbox"
              checked={includeCode}
              onChange={(e) => setIncludeCode(e.target.checked)}
              className="w-5 h-5 cursor-pointer"
              style={{ accentColor: "var(--accent)" }}
            />
          </label>
          {includeCode && (
            <div className="space-y-2 mt-3">
              <div className="flex items-center gap-2">
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>Durée :</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={codeDays}
                  onChange={(e) => setCodeDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-20 px-2 py-1.5 rounded-md text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid var(--border)" }}
                />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>jours</span>
              </div>
              {packs.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>Pack :</label>
                  <select
                    value={selectedPackId}
                    onChange={(e) => setSelectedPackId(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-md text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid var(--border)" }}
                  >
                    {packs.map((p) => (
                      <option key={p.id} value={p.id} style={{ background: "#1a1a1a" }}>
                        {p.name || p.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="button"
                onClick={handleGenerateCode}
                disabled={generating}
                className="w-full py-2 rounded-md text-xs sm:text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{
                  background: "rgba(255,215,0,0.15)",
                  color: "#FFD700",
                  border: "1px solid rgba(255,215,0,0.3)",
                  minHeight: 44,
                }}
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                {generatedCode ? `Code: ${generatedCode}` : "Générer le code"}
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-center mb-3" style={{ color: "#EF4444" }}>{error}</p>
        )}

        {/* Bouton download */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={!bgImageUrl || downloading}
          className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:brightness-110"
          style={{
            background: "linear-gradient(135deg, var(--accent), #A78BFA)",
            color: "#fff",
            boxShadow: "0 4px 20px rgba(230,51,41,0.3)",
            minHeight: 48,
          }}
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Télécharger PNG (1080×1920)
        </button>

        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
