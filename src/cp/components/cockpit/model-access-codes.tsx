"use client";

import { useEffect, useState } from "react";
import { Key, Save, X, Edit3, RefreshCw, Hash, AlertCircle, CheckCircle2 } from "lucide-react";

interface ModelProfile {
  id: string;
  name: string;
  handle: string;
  personalCode: string;
  loginAliases?: string[];
  status: string;
}

/**
 * Yumii Agency admin panel — rotate model personal codes + login aliases.
 * Visible only to root admin. Syncs with agence_model_profiles via SQWENSY.
 */
export function ModelAccessCodes({ authHeaders }: { authHeaders: () => HeadersInit }) {
  const [profiles, setProfiles] = useState<ModelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editAliases, setEditAliases] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agence/model-profiles", { headers: authHeaders() });
      const data = await res.json();
      if (data.profiles) {
        const normalized = data.profiles.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          handle: p.handle as string,
          personalCode: (p.personalCode ?? p.personal_code) as string,
          loginAliases: ((p.loginAliases ?? p.login_aliases) as string[] | undefined) ?? [],
          status: p.status as string,
        }));
        setProfiles(normalized);
      }
    } catch {
      setToast({ kind: "err", msg: "Impossible de charger les profils" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (p: ModelProfile) => {
    setEditingId(p.id);
    setEditCode(p.personalCode);
    setEditAliases((p.loginAliases ?? []).join(", "));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCode("");
    setEditAliases("");
  };

  const save = async (id: string) => {
    if (!editCode.trim()) {
      setToast({ kind: "err", msg: "Le code ne peut pas être vide" });
      return;
    }
    setSaving(true);
    try {
      const aliases = editAliases
        .split(",")
        .map((a) => a.trim().replace(/^@/, "").toLowerCase())
        .filter(Boolean);

      const res = await fetch(`/api/agence/model-profiles?id=${id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          personal_code: editCode.trim(),
          login_aliases: aliases,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur serveur");
      }

      setToast({ kind: "ok", msg: "Code mis à jour" });
      cancelEdit();
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      setToast({ kind: "err", msg });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const regenerateCode = (name: string): string => {
    const prefix = name.toUpperCase().replace(/\s+/g, "").slice(0, 6);
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${num}`;
  };

  if (loading) {
    return (
      <div className="p-6 text-sm opacity-70 flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" /> Chargement des profils…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Key className="w-4 h-4" style={{ color: "#C9A84C" }} />
            Codes d&apos;accès modèles
          </h3>
          <p className="text-xs opacity-70 mt-1">
            Gestion des codes personnels et alias de login (source de vérité : Main DB).
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="text-xs px-3 py-1.5 rounded-md border opacity-80 hover:opacity-100 flex items-center gap-1.5"
          style={{ borderColor: "rgba(201,168,76,0.3)" }}
        >
          <RefreshCw className="w-3 h-3" /> Rafraîchir
        </button>
      </div>

      {toast && (
        <div
          className={`text-xs px-3 py-2 rounded flex items-center gap-2 ${
            toast.kind === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {toast.kind === "ok" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.msg}
        </div>
      )}

      <div className="space-y-3">
        {profiles.map((p) => {
          const isEditing = editingId === p.id;
          return (
            <div
              key={p.id}
              className="rounded-lg p-4 border"
              style={{
                background: "rgba(20,20,24,0.5)",
                borderColor: isEditing ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{p.name}</span>
                    <span className="text-xs opacity-60">{p.handle}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider"
                      style={{
                        background: p.status === "active" ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.12)",
                        color: p.status === "active" ? "#4ade80" : "#94a3b8",
                      }}
                    >
                      {p.status}
                    </span>
                  </div>

                  {!isEditing ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <Hash className="w-3 h-3 opacity-50" />
                        <span className="opacity-60">Code :</span>
                        <code
                          className="px-2 py-0.5 rounded font-mono text-[11px]"
                          style={{ background: "rgba(201,168,76,0.08)", color: "#E6C974" }}
                        >
                          {p.personalCode}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="opacity-60">Alias :</span>
                        <span className="opacity-80">
                          {(p.loginAliases ?? []).length > 0
                            ? p.loginAliases!.join(", ")
                            : "—"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider opacity-60">
                          Code d&apos;accès
                        </label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value)}
                            className="flex-1 px-3 py-2 rounded text-xs font-mono"
                            style={{
                              background: "rgba(0,0,0,0.3)",
                              border: "1px solid rgba(201,168,76,0.2)",
                              color: "#E6C974",
                            }}
                            placeholder="YUMI-2847"
                          />
                          <button
                            type="button"
                            onClick={() => setEditCode(regenerateCode(p.name))}
                            className="text-xs px-2 py-1 rounded opacity-70 hover:opacity-100"
                            style={{ border: "1px solid rgba(201,168,76,0.25)" }}
                            title="Générer un nouveau code"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider opacity-60">
                          Alias login (virgule entre)
                        </label>
                        <input
                          type="text"
                          value={editAliases}
                          onChange={(e) => setEditAliases(e.target.value)}
                          className="w-full mt-1 px-3 py-2 rounded text-xs"
                          style={{
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(201,168,76,0.2)",
                          }}
                          placeholder={p.handle ? `${p.handle}, alias2, alias3` : "handle, alias, alias"}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="text-xs px-3 py-1.5 rounded flex items-center gap-1.5 hover:opacity-100 opacity-80"
                      style={{
                        background: "rgba(201,168,76,0.08)",
                        color: "#E6C974",
                        border: "1px solid rgba(201,168,76,0.25)",
                      }}
                    >
                      <Edit3 className="w-3 h-3" /> Modifier
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => save(p.id)}
                        disabled={saving}
                        className="text-xs px-3 py-1.5 rounded flex items-center gap-1.5 disabled:opacity-40"
                        style={{
                          background: "linear-gradient(135deg, #E6C974, #C9A84C)",
                          color: "#0A0A0C",
                          fontWeight: 600,
                        }}
                      >
                        <Save className="w-3 h-3" /> Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-xs px-2 py-1.5 rounded opacity-70 hover:opacity-100"
                        style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {profiles.length === 0 && (
          <div className="text-sm opacity-60 text-center py-8">
            Aucun profil modèle trouvé.
          </div>
        )}
      </div>

      <div className="text-[10px] opacity-50 mt-4 pl-4 border-l" style={{ borderColor: "rgba(201,168,76,0.3)" }}>
        Les modifications sont immédiatement actives pour le login. Le login page lit la DB avec un cache de 60s.
      </div>
    </div>
  );
}
