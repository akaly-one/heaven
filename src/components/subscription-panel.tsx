"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Crown, Clock, Package, History, KeyRound, ShoppingBag, Check, Loader2, AlertTriangle } from "lucide-react";
import { TIER_CONFIG } from "@/constants/tiers";
import type { AccessCode, PackConfig, UploadedContent, VisitorPlatform } from "@/types/heaven";

interface Purchase {
  id: string;
  upload_id: string;
  price: number;
  created_at: string;
}

interface SubscriptionPanelProps {
  slug: string;
  clientId: string;
  activeCode: AccessCode | null;
  packs: PackConfig[];
  unlockedTier: string | null;
  uploads: UploadedContent[];
  visitorPlatform: VisitorPlatform | null;
  visitorHandle: string;
  onCodeValidated: (code: AccessCode) => void;
  onClose: () => void;
}

function formatTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expire";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function tierIncludes(unlockedTier: string, contentTier: string): boolean {
  const hierarchy = ["silver", "gold", "feet", "black", "platinum"];
  const ui = hierarchy.indexOf(unlockedTier);
  const ci = hierarchy.indexOf(contentTier);
  if (ui === -1 || ci === -1) return false;
  return ui >= ci;
}

export function SubscriptionPanel({
  slug,
  clientId,
  activeCode,
  packs,
  unlockedTier,
  uploads,
  onCodeValidated,
  onClose,
}: SubscriptionPanelProps) {
  const [codeInput, setCodeInput] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);

  // Fetch purchase history
  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/credits/purchase?client_id=${clientId}`)
      .then(r => r.json())
      .then(d => setPurchases(d.purchases || []))
      .catch(() => {})
      .finally(() => setPurchasesLoading(false));
  }, [clientId]);

  const validateCode = useCallback(async () => {
    if (!codeInput.trim()) return;
    setCodeLoading(true);
    setCodeError(null);
    setCodeSuccess(false);
    try {
      const res = await fetch("/api/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", code: codeInput.trim(), model: slug }),
      });
      const data = await res.json();
      if (data.code?.tier) {
        setCodeSuccess(true);
        onCodeValidated(data.code);
        setCodeInput("");
      } else {
        setCodeError(data.error || "Code invalide");
      }
    } catch {
      setCodeError("Erreur reseau");
    }
    setCodeLoading(false);
  }, [codeInput, slug, onCodeValidated]);

  const tier = unlockedTier || "free";
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const isActive = activeCode && new Date(activeCode.expiresAt).getTime() > Date.now();
  const isExpired = activeCode && new Date(activeCode.expiresAt).getTime() <= Date.now();

  // Content access stats
  const tieredUploads = uploads.filter(u => u.visibility === "pack");
  const accessibleCount = unlockedTier
    ? tieredUploads.filter(u => tierIncludes(unlockedTier, u.tier)).length
    : 0;

  // Find matching pack for renewal
  const activePack = packs.find(p => p.id === activeCode?.pack || p.name.toLowerCase().includes(tier));

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border2)" }}>
          <h2 className="text-[15px] font-bold" style={{ color: "var(--text)" }}>Mon abonnement</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110"
            style={{ background: "var(--bg3)" }}>
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* ── Section 1: Active subscription ── */}
          <div className="rounded-xl p-4" style={{ background: isActive ? `${config.hex}08` : "var(--bg2)", border: `1px solid ${isActive ? `${config.hex}20` : "var(--border2)"}` }}>
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4" style={{ color: config.hex }} />
              <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>Abonnement actif</span>
            </div>

            {isActive && activeCode ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-lg text-[11px] font-bold uppercase"
                    style={{ background: config.bg, color: config.hex }}>
                    {config.symbol} {config.label}
                  </span>
                  {activeCode.pack && (
                    <span className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
                      Pack {activeCode.pack}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--text-muted)" }}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimeLeft(activeCode.expiresAt)} restants</span>
                </div>
                {/* Pack features */}
                {activePack?.features && activePack.features.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {activePack.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                        <Check className="w-3 h-3" style={{ color: config.hex }} />
                        {f}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : isExpired ? (
              <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--warning)" }}>
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Ton abonnement a expire</span>
              </div>
            ) : (
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>Aucun abonnement actif</p>
            )}
          </div>

          {/* ── Section 2: Content access ── */}
          <div className="rounded-xl p-4" style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>Acces contenu</span>
            </div>
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              {unlockedTier ? (
                <><span className="font-semibold" style={{ color: config.hex }}>{accessibleCount}</span> contenus accessibles sur {tieredUploads.length} total</>
              ) : (
                <>Aucun contenu premium debloque</>
              )}
            </p>
          </div>

          {/* ── Section 3: Enter a code ── */}
          <div className="rounded-xl p-4" style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}>
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>Entrer un code</span>
            </div>
            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={e => setCodeInput(e.target.value.toUpperCase())}
                placeholder="CODE-XXXX"
                className="flex-1 px-3 py-2.5 rounded-xl text-[12px] font-mono outline-none"
                style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
                maxLength={20}
                onKeyDown={e => { if (e.key === "Enter") validateCode(); }}
              />
              <button onClick={validateCode} disabled={codeLoading || !codeInput.trim()}
                className="px-4 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer btn-gradient disabled:opacity-30 shrink-0">
                {codeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Valider"}
              </button>
            </div>
            {codeError && <p className="text-[11px] mt-2 font-medium" style={{ color: "var(--danger)" }}>{codeError}</p>}
            {codeSuccess && <p className="text-[11px] mt-2 font-medium" style={{ color: "var(--success)" }}>Code valide ! Contenu debloque.</p>}
          </div>

          {/* ── Section 4: Purchase history ── */}
          <div className="rounded-xl p-4" style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>Historique achats</span>
            </div>
            {purchasesLoading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            ) : purchases.length === 0 ? (
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>Aucun achat pour le moment</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {purchases.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-[11px]">
                    <span style={{ color: "var(--text-secondary)" }}>
                      {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                    <span className="font-semibold" style={{ color: "var(--text)" }}>
                      -{p.price} credits
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 5: Upgrade / Renew CTA ── */}
          {(isExpired || !isActive) && packs.filter(p => p.active).length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}>
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>
                  {isExpired ? "Renouveler" : "Choisir un pack"}
                </span>
              </div>
              <div className="space-y-2">
                {packs.filter(p => p.active).map(pack => {
                  const tc = TIER_CONFIG[pack.id] || TIER_CONFIG.vip;
                  const link = pack.stripe_link || pack.wise_url;
                  return (
                    <a
                      key={pack.id}
                      href={link || "#"}
                      target={link ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                      style={{ background: `${tc.hex}08`, border: `1px solid ${tc.hex}20` }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase" style={{ color: tc.hex }}>
                          {tc.symbol} {pack.name}
                        </span>
                      </div>
                      <span className="text-[12px] font-bold" style={{ color: tc.hex }}>
                        {pack.price}€
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
