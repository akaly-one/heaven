"use client";

import { useEffect, useState } from "react";
import { toModelId } from "@/lib/model-utils";
import {
  TIER_CATALOG,
  BONUS_CATALOG,
  BADGE_OPTIONS,
  buildEmptyPack,
  type Pack,
  type TierId,
} from "@/config/pack-schema";
import {
  Plus, Trash2, Save, CheckCircle2, AlertCircle, X, GripVertical,
  Eye, EyeOff, Package, RefreshCw,
} from "lucide-react";

interface Props {
  modelSlug: string;
  authHeaders: () => HeadersInit;
}

export function PacksEditor({ modelSlug, authHeaders }: Props) {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/packs?model=${modelSlug}`, { headers: authHeaders() });
      const d = await r.json();
      if (d.packs) {
        setPacks(
          d.packs
            .map((p: Record<string, unknown>) => ({
              ...p,
              features: Array.isArray(p.features) ? p.features : [],
              bonuses: typeof p.bonuses === "object" && p.bonuses ? p.bonuses : {},
            }))
            .sort((a: Pack, b: Pack) => (a.sort_order || 0) - (b.sort_order || 0))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (modelSlug) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelSlug]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/packs", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          model: toModelId(modelSlug),
          packs: packs.map((p, i) => ({ ...p, id: p.pack_id, sort_order: i })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur serveur");
      }
      setToast({ kind: "ok", msg: "Packs sauvegardés" });
      await load();
    } catch (e) {
      setToast({ kind: "err", msg: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const updatePack = (idx: number, patch: Partial<Pack>) => {
    setPacks((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const addPack = (tierId: TierId) => {
    if (packs.some((p) => p.pack_id === tierId)) {
      setToast({ kind: "err", msg: "Ce tier existe déjà" });
      setTimeout(() => setToast(null), 2000);
      return;
    }
    const empty = buildEmptyPack(toModelId(modelSlug), tierId);
    setPacks((prev) => [...prev, { ...empty, id: `new-${Date.now()}` } as unknown as Pack]);
    setExpandedId(tierId);
  };

  const deletePack = (idx: number) => {
    if (!confirm("Supprimer ce pack ?")) return;
    setPacks((prev) => prev.filter((_, i) => i !== idx));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...packs];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setPacks(next);
  };

  const addFeature = (idx: number) => {
    const text = prompt("Nouvelle inclusion :");
    if (!text || !text.trim()) return;
    updatePack(idx, { features: [...packs[idx].features, text.trim()] });
  };

  const removeFeature = (idx: number, fi: number) => {
    updatePack(idx, { features: packs[idx].features.filter((_, i) => i !== fi) });
  };

  const toggleBonus = (idx: number, bonusId: string, value: unknown) => {
    updatePack(idx, { bonuses: { ...packs[idx].bonuses, [bonusId]: value } });
  };

  const availableTiers = TIER_CATALOG.filter(
    (t) => !packs.some((p) => p.pack_id === t.id)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: "#C9A84C" }} />
            Packs & Tiers
          </h3>
          <p className="text-xs opacity-70 mt-1">
            Édite prix, inclusions, bonus. Modifs live côté public après save.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded inline-flex items-center gap-1"
            style={{ border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Reload
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="text-xs px-3 py-1.5 rounded font-semibold inline-flex items-center gap-1 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #E6C974, #C9A84C)",
              color: "#0A0A0C",
            }}
          >
            <Save className="w-3 h-3" /> {saving ? "..." : "Enregistrer"}
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded text-xs ${
            toast.kind === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {toast.kind === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="space-y-2.5">
        {packs.map((pack, idx) => {
          const tier = TIER_CATALOG.find((t) => t.id === pack.pack_id);
          const expanded = expandedId === pack.pack_id;
          return (
            <div
              key={pack.pack_id}
              className="rounded-lg overflow-hidden"
              style={{
                background: "rgba(20,20,24,0.4)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-3 p-3">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="opacity-30 hover:opacity-80 disabled:opacity-10 cursor-pointer"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </button>
                <div className="w-1 self-stretch rounded-full" style={{ background: pack.color || tier?.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{pack.name || "Sans nom"}</span>
                    {pack.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(201,168,76,0.15)", color: "#E6C974" }}>
                        {BADGE_OPTIONS.find((b) => b.id === pack.badge)?.label || pack.badge}
                      </span>
                    )}
                    {!pack.active && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                        masqué
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] opacity-60 mt-0.5 flex items-center gap-2">
                    <span><strong style={{ color: "#E6C974" }}>{pack.price}€</strong></span>
                    <span>·</span>
                    <span>{pack.features.length} inclusions</span>
                    <span>·</span>
                    <span>
                      {Object.values(pack.bonuses || {}).filter((v) => v && v !== 0 && v !== "").length} bonus
                    </span>
                    <span className="opacity-50">·</span>
                    <span className="opacity-50 text-[10px]">{pack.pack_id}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updatePack(idx, { active: !pack.active })}
                  className="opacity-60 hover:opacity-100"
                  title={pack.active ? "Masquer" : "Afficher"}
                >
                  {pack.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : pack.pack_id)}
                  className="text-[11px] px-2.5 py-1 rounded"
                  style={{
                    background: expanded ? "rgba(201,168,76,0.18)" : "rgba(255,255,255,0.05)",
                    color: expanded ? "#E6C974" : "var(--text)",
                  }}
                >
                  {expanded ? "Fermer" : "Éditer"}
                </button>
              </div>

              {expanded && (
                <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  {/* Header fields */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider opacity-60">En-tête</label>
                    <div className="grid grid-cols-12 gap-2 mt-1.5">
                      <input
                        type="text"
                        value={pack.name}
                        onChange={(e) => updatePack(idx, { name: e.target.value })}
                        placeholder="Nom"
                        className="col-span-5 px-2.5 py-1.5 rounded text-xs"
                        style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                      <div className="col-span-3 relative">
                        <input
                          type="number"
                          value={pack.price}
                          onChange={(e) => updatePack(idx, { price: Number(e.target.value) || 0 })}
                          className="w-full px-2.5 py-1.5 pr-6 rounded text-xs"
                          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-60">€</span>
                      </div>
                      <input
                        type="color"
                        value={pack.color || "#C9A84C"}
                        onChange={(e) => updatePack(idx, { color: e.target.value })}
                        className="col-span-1 h-[30px] rounded cursor-pointer"
                        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                      <select
                        value={pack.badge || ""}
                        onChange={(e) => updatePack(idx, { badge: e.target.value || null })}
                        className="col-span-3 px-2.5 py-1.5 rounded text-xs"
                        style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        {BADGE_OPTIONS.map((b) => (
                          <option key={b.id} value={b.id}>{b.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-wider opacity-60">
                        Inclusions ({pack.features.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => addFeature(idx)}
                        className="text-[10px] px-2 py-0.5 rounded inline-flex items-center gap-1"
                        style={{ background: "rgba(201,168,76,0.1)", color: "#E6C974" }}
                      >
                        <Plus className="w-2.5 h-2.5" /> Ajouter
                      </button>
                    </div>
                    <div className="mt-1.5 space-y-1">
                      {pack.features.map((f, fi) => (
                        <div
                          key={fi}
                          className="flex items-center gap-2 px-2.5 py-1 rounded text-xs"
                          style={{ background: "rgba(0,0,0,0.2)" }}
                        >
                          <span className="opacity-40 text-[10px]">•</span>
                          <input
                            type="text"
                            value={f}
                            onChange={(e) => {
                              const next = [...pack.features];
                              next[fi] = e.target.value;
                              updatePack(idx, { features: next });
                            }}
                            className="flex-1 bg-transparent outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeFeature(idx, fi)}
                            className="opacity-40 hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {pack.features.length === 0 && (
                        <p className="text-[10px] opacity-50 italic">Aucune inclusion</p>
                      )}
                    </div>
                  </div>

                  {/* Bonuses */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider opacity-60">
                      Bonus ({BONUS_CATALOG.length} dispos)
                    </label>
                    <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {BONUS_CATALOG.map((b) => {
                        const val = pack.bonuses[b.id];
                        const active = b.type === "boolean" ? !!val : (b.type === "number" ? (val as number) > 0 : !!val);
                        return (
                          <div
                            key={b.id}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded"
                            style={{
                              background: active ? "rgba(201,168,76,0.08)" : "rgba(0,0,0,0.2)",
                              border: "1px solid " + (active ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.04)"),
                            }}
                          >
                            <span className="text-xs">{b.icon}</span>
                            <span className="flex-1 text-[11px]">{b.label}</span>
                            {b.type === "boolean" ? (
                              <button
                                type="button"
                                onClick={() => toggleBonus(idx, b.id, !val)}
                                className="w-7 h-3.5 rounded-full relative transition-all"
                                style={{ background: val ? "#C9A84C" : "rgba(255,255,255,0.1)" }}
                              >
                                <div
                                  className="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all"
                                  style={{ left: val ? "14px" : "2px" }}
                                />
                              </button>
                            ) : b.type === "number" ? (
                              <input
                                type="number"
                                value={(val as number) || 0}
                                onChange={(e) => toggleBonus(idx, b.id, Number(e.target.value) || 0)}
                                className="w-14 px-1.5 py-0.5 rounded text-[11px] text-right"
                                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
                              />
                            ) : (
                              <input
                                type="text"
                                value={(val as string) || ""}
                                onChange={(e) => toggleBonus(idx, b.id, e.target.value)}
                                className="w-24 px-1.5 py-0.5 rounded text-[11px]"
                                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider opacity-60">Paiement</label>
                    <input
                      type="url"
                      value={pack.revolut_url || ""}
                      onChange={(e) => updatePack(idx, { revolut_url: e.target.value || null })}
                      placeholder="https://revolut.me/… (optionnel)"
                      className="w-full mt-1.5 px-2.5 py-1.5 rounded text-xs"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                  </div>

                  <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <button
                      type="button"
                      onClick={() => deletePack(idx)}
                      className="text-[10px] px-2.5 py-1 rounded inline-flex items-center gap-1"
                      style={{ background: "rgba(220,38,38,0.1)", color: "#F87171" }}
                    >
                      <Trash2 className="w-2.5 h-2.5" /> Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!loading && packs.length === 0 && (
          <div className="text-center py-8 opacity-50 text-sm">Aucun pack — crée le premier ci-dessous</div>
        )}
      </div>

      {availableTiers.length > 0 && (
        <div
          className="rounded-lg p-3"
          style={{ background: "rgba(201,168,76,0.04)", border: "1px dashed rgba(201,168,76,0.25)" }}
        >
          <p className="text-[11px] opacity-70 mb-2">Ajouter un pack — tiers disponibles :</p>
          <div className="flex flex-wrap gap-1.5">
            {availableTiers.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => addPack(t.id)}
                className="text-[11px] px-2.5 py-1 rounded inline-flex items-center gap-1.5"
                style={{
                  background: t.color + "20",
                  color: t.color,
                  border: `1px solid ${t.color}40`,
                }}
              >
                <Plus className="w-2.5 h-2.5" />
                {t.label}
                <span className="opacity-60 text-[9px]">{t.defaultPrice}€</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
