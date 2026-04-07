"use client";

import { useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { Download, Share2, X, User, Key, Sparkles, Image } from "lucide-react";

type GeneratorMode = "code" | "promo" | "teaser";

interface StoryGeneratorProps {
  modelName: string;
  modelAvatar?: string;
  accentColor?: string;
  onClose: () => void;
}

export function StoryGenerator({ modelName, modelAvatar, accentColor = "#E63329", onClose }: StoryGeneratorProps) {
  const [mode, setMode] = useState<GeneratorMode>("code");
  const [downloading, setDownloading] = useState(false);

  // Code mode fields
  const [clientName, setClientName] = useState("");
  const [codeText, setCodeText] = useState("");
  const [tierLabel, setTierLabel] = useState("Gold");

  // Promo mode fields
  const [promoCode, setPromoCode] = useState("");
  const [promoText, setPromoText] = useState("Offre exclusive");
  const [promoDiscount, setPromoDiscount] = useState("");

  // Teaser mode fields
  const [teaserTitle, setTeaserTitle] = useState("Nouveau contenu");
  const [teaserDesc, setTeaserDesc] = useState("Disponible maintenant");
  const [teaserImageUrl, setTeaserImageUrl] = useState("");

  const TIER_COLORS: Record<string, string> = {
    Silver: "#C0C0C0", Gold: "#D4AF37", "Feet Lovers": "#E8A87C",
    "VIP Black": "#1C1C1C", "VIP Platinum": "#B8860B",
  };

  const tierColor = TIER_COLORS[tierLabel] || accentColor;

  const buildStoryHTML = useCallback((): string => {
    const bg = mode === "code" ? `linear-gradient(160deg, #0a0a0a, ${tierColor}30, #0a0a0a)`
      : mode === "promo" ? `linear-gradient(160deg, #0a0a0a, ${accentColor}25, #1a0a1e)`
      : `linear-gradient(160deg, #0a0a0a, #1a1a2e, #0a0a0a)`;

    let content = "";

    if (mode === "code") {
      content = `
        <div style="text-align:center;padding:60px 50px;">
          <div style="font-size:28px;color:#fff;opacity:0.5;margin-bottom:40px;letter-spacing:8px;text-transform:uppercase;">ACCÈS EXCLUSIF</div>
          ${modelAvatar ? `<img src="${modelAvatar}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin:0 auto 30px;border:3px solid ${tierColor};display:block;" />` : ""}
          <div style="font-size:48px;font-weight:900;color:#fff;margin-bottom:10px;">${modelName}</div>
          <div style="font-size:22px;color:${tierColor};font-weight:700;margin-bottom:60px;">♦ ${tierLabel}</div>
          <div style="font-size:20px;color:#fff;opacity:0.7;margin-bottom:15px;">Préparé pour</div>
          <div style="font-size:36px;font-weight:800;color:#fff;margin-bottom:60px;">@${clientName || "client"}</div>
          <div style="background:${tierColor};padding:20px 40px;border-radius:16px;display:inline-block;margin-bottom:30px;">
            <div style="font-size:18px;color:#fff;opacity:0.8;margin-bottom:8px;">TON CODE</div>
            <div style="font-size:42px;font-weight:900;color:#fff;letter-spacing:6px;font-family:monospace;">${codeText || "XXXX-XXXX"}</div>
          </div>
          <div style="font-size:16px;color:#fff;opacity:0.4;margin-top:40px;">Entre ce code sur le profil pour débloquer ton contenu</div>
        </div>
      `;
    } else if (mode === "promo") {
      content = `
        <div style="text-align:center;padding:60px 50px;">
          <div style="font-size:28px;color:${accentColor};letter-spacing:6px;text-transform:uppercase;margin-bottom:40px;">🔥 PROMO</div>
          ${modelAvatar ? `<img src="${modelAvatar}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;margin:0 auto 30px;border:3px solid ${accentColor};display:block;" />` : ""}
          <div style="font-size:44px;font-weight:900;color:#fff;margin-bottom:20px;">${modelName}</div>
          <div style="font-size:24px;color:#fff;opacity:0.8;margin-bottom:50px;">${promoText}</div>
          ${promoDiscount ? `<div style="font-size:72px;font-weight:900;color:${accentColor};margin-bottom:40px;">${promoDiscount}</div>` : ""}
          <div style="background:${accentColor};padding:20px 50px;border-radius:16px;display:inline-block;margin-bottom:30px;">
            <div style="font-size:16px;color:#fff;opacity:0.8;margin-bottom:8px;">CODE PROMO</div>
            <div style="font-size:38px;font-weight:900;color:#fff;letter-spacing:4px;font-family:monospace;">${promoCode || "PROMO2026"}</div>
          </div>
          <div style="font-size:16px;color:#fff;opacity:0.4;margin-top:50px;">Offre limitée • Lien en bio</div>
        </div>
      `;
    } else {
      content = `
        <div style="text-align:center;padding:60px 50px;position:relative;">
          ${teaserImageUrl ? `<div style="position:absolute;inset:0;"><img src="${teaserImageUrl}" style="width:100%;height:100%;object-fit:cover;filter:blur(20px) brightness(0.3);transform:scale(1.1);" /></div>` : ""}
          <div style="position:relative;z-index:1;">
            <div style="font-size:28px;color:#fff;opacity:0.5;letter-spacing:8px;text-transform:uppercase;margin-bottom:60px;">✨ NOUVEAU</div>
            ${modelAvatar ? `<img src="${modelAvatar}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;margin:0 auto 30px;border:3px solid ${accentColor};display:block;" />` : ""}
            <div style="font-size:44px;font-weight:900;color:#fff;margin-bottom:15px;">${modelName}</div>
            <div style="font-size:28px;font-weight:700;color:${accentColor};margin-bottom:20px;">${teaserTitle}</div>
            <div style="font-size:20px;color:#fff;opacity:0.7;margin-bottom:80px;">${teaserDesc}</div>
            <div style="background:${accentColor};padding:18px 50px;border-radius:16px;display:inline-block;">
              <div style="font-size:22px;font-weight:800;color:#fff;">Débloquer →</div>
            </div>
            <div style="font-size:16px;color:#fff;opacity:0.4;margin-top:50px;">Lien en bio</div>
          </div>
        </div>
      `;
    }

    return `<div style="width:1080px;height:1920px;background:${bg};display:flex;align-items:center;justify-content:center;font-family:'Inter',system-ui,sans-serif;position:relative;overflow:hidden;">
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 30%, rgba(255,255,255,0.03), transparent 70%);"></div>
      <div style="position:relative;width:100%;z-index:1;">${content}</div>
    </div>`;
  }, [mode, modelName, modelAvatar, accentColor, tierColor, tierLabel, clientName, codeText, promoCode, promoText, promoDiscount, teaserTitle, teaserDesc, teaserImageUrl]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const el = document.createElement("div");
      el.innerHTML = buildStoryHTML();
      el.style.position = "fixed";
      el.style.left = "-9999px";
      el.style.top = "0";
      document.body.appendChild(el);
      el.getBoundingClientRect(); // force layout

      const dataUrl = await toPng(el.firstElementChild as HTMLElement, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        backgroundColor: "#0a0a0a",
      });

      document.body.removeChild(el);

      const link = document.createElement("a");
      link.download = `heaven-${mode}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    }
    setDownloading(false);
  }, [buildStoryHTML, mode]);

  const modes: { id: GeneratorMode; label: string; icon: typeof Key }[] = [
    { id: "code", label: "Code Client", icon: Key },
    { id: "promo", label: "Promo", icon: Sparkles },
    { id: "teaser", label: "Teaser", icon: Image },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <span className="text-sm font-bold" style={{ color: "var(--text)" }}>Générateur Story</span>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: "var(--bg2)", border: "none" }}>
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 px-5 py-3">
          {modes.map(m => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => setMode(m.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all"
                style={{
                  background: mode === m.id ? `${accentColor}15` : "var(--bg2)",
                  color: mode === m.id ? accentColor : "var(--text-muted)",
                  border: `1.5px solid ${mode === m.id ? accentColor : "var(--border)"}`,
                }}>
                <Icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Fields */}
        <div className="px-5 py-3 space-y-3">
          {mode === "code" && (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Nom client (@snap ou @insta)</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="@username"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Code d'accès</label>
                <input value={codeText} onChange={e => setCodeText(e.target.value.toUpperCase())} placeholder="ABC-2026-XXXX"
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-mono uppercase outline-none" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Pack tier</label>
                <select value={tierLabel} onChange={e => setTierLabel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)" }}>
                  {Object.keys(TIER_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </>
          )}
          {mode === "promo" && (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Code promo</label>
                <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} placeholder="PROMO2026"
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-mono uppercase outline-none" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Texte promo</label>
                <input value={promoText} onChange={e => setPromoText(e.target.value)} placeholder="Offre exclusive -30%"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Réduction (optionnel)</label>
                <input value={promoDiscount} onChange={e => setPromoDiscount(e.target.value)} placeholder="-30%"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)" }} />
              </div>
            </>
          )}
          {mode === "teaser" && (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Titre</label>
                <input value={teaserTitle} onChange={e => setTeaserTitle(e.target.value)} placeholder="Nouveau shooting"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Description</label>
                <input value={teaserDesc} onChange={e => setTeaserDesc(e.target.value)} placeholder="Disponible maintenant"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>URL image de fond (optionnel)</label>
                <input value={teaserImageUrl} onChange={e => setTeaserImageUrl(e.target.value)} placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)" }} />
              </div>
            </>
          )}
        </div>

        {/* Preview (scaled down) */}
        <div className="px-5 py-3">
          <div className="rounded-xl overflow-hidden mx-auto" style={{ width: "270px", height: "480px", transform: "scale(1)", transformOrigin: "top center" }}>
            <div dangerouslySetInnerHTML={{ __html: buildStoryHTML() }}
              style={{ transform: "scale(0.25)", transformOrigin: "top left", width: "1080px", height: "1920px" }} />
          </div>
        </div>

        {/* Download */}
        <div className="px-5 py-4 sticky bottom-0" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
          <button onClick={handleDownload} disabled={downloading}
            className="w-full py-3.5 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: accentColor, color: "#fff", border: "none" }}>
            {downloading ? (
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {downloading ? "Génération..." : "Télécharger PNG (1080×1920)"}
          </button>
        </div>
      </div>
    </div>
  );
}
