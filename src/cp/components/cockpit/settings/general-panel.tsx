"use client";

import { useEffect, useState } from "react";
import { User, Globe, Bell, Save, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { toModelId } from "@/lib/model-utils";

interface Props {
  modelSlug: string;
  isRoot: boolean;
  authHeaders: () => HeadersInit;
}

interface ModelInfo {
  slug: string;
  display_name: string;
  bio?: string | null;
  handle?: string | null;
  language?: string | null;
  timezone?: string | null;
  notifications_enabled?: boolean | null;
}

const LANGUAGES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

const TIMEZONES = [
  { value: "Europe/Brussels", label: "Brussels (UTC+1)" },
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "Europe/London", label: "London (UTC)" },
  { value: "America/New_York", label: "New York (UTC-5)" },
  { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
];

/**
 * Tab Général — profil modèle + préférences.
 * Brief B2 : sous-tab "Packs" supprimée (les packs se gèrent dans Dashboard + Contenu).
 */
export function GeneralPanel({ modelSlug, isRoot, authHeaders }: Props) {
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // NB 2026-04-24 : root brut (modelSlug vide) = CP maître m0 "ROOT" — fetch depuis
  // la DB (table agence_models row slug='root', model_id='m0'). Migration 050.
  const effectiveSlug = modelSlug || (isRoot ? "root" : "");

  const load = async () => {
    if (!effectiveSlug) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/models/${encodeURIComponent(toModelId(effectiveSlug) || effectiveSlug)}`, {
        headers: authHeaders(),
      });
      if (r.ok) {
        const d = await r.json();
        const m = d.model || d;
        const isRootSlug = effectiveSlug === "root" || toModelId(effectiveSlug) === "m0";
        // ROOT m0 : override défauts DB — display toujours "ROOT", bio spécimen fixe.
        setInfo({
          slug: effectiveSlug,
          display_name: isRootSlug ? "ROOT" : (m.display_name || m.name || ""),
          bio: isRootSlug ? "CP maître (m0) — vue spécimen/template. Sélectionne un CP dans le header pour charger les vraies données." : (m.bio ?? ""),
          handle: isRootSlug ? "root" : (m.handle ?? ""),
          language: m.language ?? "fr",
          timezone: m.timezone ?? "Europe/Brussels",
          notifications_enabled: isRootSlug ? false : (m.notifications_enabled ?? true),
        });
      } else {
        // Fallback minimal — ROOT spécial si migration 050 pas encore appliquée
        const isRootSlug = effectiveSlug === "root";
        setInfo({
          slug: effectiveSlug,
          display_name: isRootSlug ? "ROOT" : effectiveSlug.toUpperCase(),
          bio: isRootSlug ? "CP maître (m0) — vue spécimen/template. Appliquer migration 050_seed_root_m0.sql pour persistence DB." : "",
          handle: isRootSlug ? "root" : "",
          language: "fr",
          timezone: "Europe/Brussels",
          notifications_enabled: !isRootSlug,
        });
      }
    } catch {
      setToast({ kind: "err", msg: "Impossible de charger le profil" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [effectiveSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!info) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/models/${encodeURIComponent(toModelId(effectiveSlug) || effectiveSlug)}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: info.display_name,
          bio: info.bio,
          handle: info.handle,
          language: info.language,
          timezone: info.timezone,
          notifications_enabled: info.notifications_enabled,
        }),
      });
      if (!r.ok) throw new Error("save_failed");
      setToast({ kind: "ok", msg: "Profil enregistré" });
    } catch {
      setToast({ kind: "err", msg: "Erreur d'enregistrement" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="card-premium p-6 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <RefreshCw className="w-4 h-4 animate-spin" /> Chargement du profil…
      </div>
    );
  }

  if (!info) {
    return (
      <div className="card-premium p-6 text-xs" style={{ color: "var(--text-muted)" }}>
        Aucun profil modèle associé à cette session.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className="text-xs px-3 py-2 rounded flex items-center gap-2"
          style={{
            background: toast.kind === "ok" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            color: toast.kind === "ok" ? "#10B981" : "#EF4444",
          }}
        >
          {toast.kind === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Profil */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Informations profil</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Nom affiché</label>
            <input
              value={info.display_name}
              onChange={(e) => setInfo({ ...info, display_name: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Pseudo / handle</label>
            <input
              value={info.handle ?? ""}
              onChange={(e) => setInfo({ ...info, handle: e.target.value })}
              placeholder="@pseudo_instagram"
              className="w-full mt-1 px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Bio</label>
            <textarea
              value={info.bio ?? ""}
              onChange={(e) => setInfo({ ...info, bio: e.target.value })}
              rows={3}
              className="w-full mt-1 px-3 py-2 rounded-lg text-xs outline-none resize-none"
              style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
            />
          </div>
        </div>
      </div>

      {/* Préférences */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Préférences</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Langue</label>
            <select
              value={info.language ?? "fr"}
              onChange={(e) => setInfo({ ...info, language: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
              style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
            >
              {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Timezone</label>
            <select
              value={info.timezone ?? "Europe/Brussels"}
              onChange={(e) => setInfo({ ...info, timezone: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
              style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
            >
              {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Notifications</h2>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={info.notifications_enabled ?? true}
            onChange={(e) => setInfo({ ...info, notifications_enabled: e.target.checked })}
            className="rounded cursor-pointer"
            style={{ accentColor: "var(--accent)" }}
          />
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text)" }}>Activer les notifications</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Email + push pour nouveaux messages, paiements, alertes sécurité</p>
          </div>
        </label>
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-2 btn-gradient hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-50"
      >
        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}
