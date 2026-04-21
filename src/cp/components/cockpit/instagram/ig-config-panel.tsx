"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Shield,
  Bot,
  CheckCircle2,
  XCircle,
  Eye,
  Save,
  RefreshCw,
  User,
  AlertCircle,
} from "lucide-react";

type DefaultMode = "agent" | "human" | "shadow";

interface IgConfig {
  ig_handle?: string;
  ig_business_id?: string;
  token_status?: string;
  token_masked?: string;
  token_expires_at?: string | null;
  is_active?: boolean;
  default_mode?: DefaultMode;
  system_prompt?: string;
  ai_model?: string;
  max_history?: number;
}

interface ProfileStats {
  username?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

const DEFAULT_PROMPT = "";

export function InstagramConfigPanel() {
  const [config, setConfig] = useState<IgConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [testStatus, setTestStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [testResult, setTestResult] = useState<ProfileStats | null>(null);

  // Editable fields (local state)
  const [isActive, setIsActive] = useState(false);
  const [defaultMode, setDefaultMode] = useState<DefaultMode>("agent");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [aiModel, setAiModel] = useState("anthropic/claude-sonnet-4.6");
  const [maxHistory, setMaxHistory] = useState(20);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/instagram/config");
      if (res.status === 404) {
        setError("not_configured");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: IgConfig = await res.json();
      setConfig(data);
      setIsActive(!!data.is_active);
      setDefaultMode((data.default_mode as DefaultMode) || "agent");
      setSystemPrompt(data.system_prompt || DEFAULT_PROMPT);
      setAiModel(data.ai_model || "anthropic/claude-sonnet-4.6");
      setMaxHistory(
        typeof data.max_history === "number" ? data.max_history : 20
      );
    } catch {
      setError("fetch_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const body = {
        is_active: isActive,
        default_mode: defaultMode,
        system_prompt: systemPrompt,
        ai_model: aiModel,
        max_history: maxHistory,
      };
      const res = await fetch("/api/instagram/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaveStatus("success");
      window.setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      window.setTimeout(() => setSaveStatus("idle"), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestStatus("idle");
    setTestResult(null);
    try {
      const res = await fetch("/api/instagram/profile-stats");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ProfileStats = await res.json();
      setTestResult(data);
      setTestStatus("success");
    } catch {
      setTestStatus("error");
    } finally {
      setTesting(false);
      window.setTimeout(() => setTestStatus("idle"), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{
            borderColor: "var(--border2)",
            borderTopColor: "#E1306C",
          }}
        />
      </div>
    );
  }

  if (error === "not_configured" || error === "fetch_failed") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(131,58,180,0.15), rgba(225,48,108,0.15), rgba(247,119,55,0.15))",
          }}
        >
          <Settings
            className="w-6 h-6"
            style={{ color: "var(--text-muted)" }}
          />
        </div>
        <p
          className="text-sm font-medium mb-1"
          style={{ color: "var(--text)" }}
        >
          {error === "not_configured"
            ? "Connexion Instagram en cours de configuration"
            : "Impossible de charger la configuration"}
        </p>
        <p
          className="text-[11px] max-w-md"
          style={{ color: "var(--text-muted)" }}
        >
          {error === "not_configured"
            ? "La configuration sera disponible une fois l'API Instagram activée."
            : "Réessaie dans quelques instants ou vérifie les logs backend."}
        </p>
        <button
          onClick={fetchConfig}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-none outline-none"
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border2)",
            color: "var(--text)",
          }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Réessayer
        </button>
      </div>
    );
  }

  const promptChars = systemPrompt.length;

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-4 gap-4">
      {/* Section 1 — Connexion */}
      <section
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <header
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
            }}
          >
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2
              className="text-sm font-bold"
              style={{ color: "var(--text)" }}
            >
              Connexion Instagram
            </h2>
            <p
              className="text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              Informations du compte connecté (lecture seule)
            </p>
          </div>
        </header>

        <div className="p-4 space-y-3">
          <InfoRow
            label="Handle"
            value={
              config?.ig_handle
                ? `@${config.ig_handle.replace(/^@/, "")}`
                : "—"
            }
          />
          <InfoRow
            label="Business ID"
            value={config?.ig_business_id || "—"}
            mono
          />
          <InfoRow
            label="Token"
            value={config?.token_masked || "—"}
            mono
          />
          <InfoRow
            label="Statut token"
            valueNode={
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
                style={{
                  background:
                    config?.token_status === "expired"
                      ? "rgba(220,38,38,0.12)"
                      : "rgba(34,197,94,0.12)",
                  color:
                    config?.token_status === "expired"
                      ? "#DC2626"
                      : "#22C55E",
                }}
              >
                {config?.token_status === "expired" ? (
                  <>
                    <XCircle className="w-3 h-3" />
                    Expiré
                  </>
                ) : config?.token_expires_at ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Valide · expire{" "}
                    {new Date(
                      config.token_expires_at
                    ).toLocaleDateString("fr-FR")}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Permanent
                  </>
                )}
              </span>
            }
          />

          {/* Test connection */}
          <div
            className="pt-3 mt-1"
            style={{ borderTop: "1px solid var(--border2)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p
                  className="text-xs font-medium"
                  style={{ color: "var(--text)" }}
                >
                  Test de connexion
                </p>
                <p
                  className="text-[10px] mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Appelle /api/instagram/profile-stats
                </p>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-none outline-none"
                style={{
                  background: "var(--bg2)",
                  border: "1px solid var(--border2)",
                  color: "var(--text)",
                  opacity: testing ? 0.5 : 1,
                }}
              >
                <Eye className={`w-3.5 h-3.5 ${testing ? "animate-pulse" : ""}`} />
                {testing ? "Test en cours..." : "Tester"}
              </button>
            </div>

            {testStatus === "success" && testResult && (
              <div
                className="mt-3 px-3 py-2 rounded-lg text-[11px] flex items-start gap-2"
                style={{
                  background: "rgba(34,197,94,0.10)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  color: "#22C55E",
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Connexion OK · @{testResult.username} ·{" "}
                  {testResult.followers_count ?? 0} followers ·{" "}
                  {testResult.media_count ?? 0} posts
                </span>
              </div>
            )}
            {testStatus === "error" && (
              <div
                className="mt-3 px-3 py-2 rounded-lg text-[11px] flex items-start gap-2"
                style={{
                  background: "rgba(220,38,38,0.10)",
                  border: "1px solid rgba(220,38,38,0.25)",
                  color: "#DC2626",
                }}
              >
                <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>Échec du test. Vérifie le token.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 2 — Agent IA */}
      <section
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <header
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
            }}
          >
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2
              className="text-sm font-bold"
              style={{ color: "var(--text)" }}
            >
              Agent IA
            </h2>
            <p
              className="text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              Configuration du comportement de l'agent
            </p>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Agent activé */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
              style={{ accentColor: "#E1306C" }}
            />
            <div>
              <p
                className="text-xs font-medium"
                style={{ color: "var(--text)" }}
              >
                Agent activé
              </p>
              <p
                className="text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                Lorsque désactivé, tous les messages basculent en mode Humain
              </p>
            </div>
          </label>

          {/* Mode par défaut */}
          <div>
            <p
              className="text-xs font-medium mb-2"
              style={{ color: "var(--text)" }}
            >
              Mode par défaut
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    value: "agent",
                    label: "Agent",
                    icon: Bot,
                    desc: "L'IA répond automatiquement",
                    color: "#818CF8",
                  },
                  {
                    value: "human",
                    label: "Humain",
                    icon: User,
                    desc: "Réponse manuelle uniquement",
                    color: "#22C55E",
                  },
                  {
                    value: "shadow",
                    label: "Shadow",
                    icon: Eye,
                    desc: "L'IA suggère, l'humain valide",
                    color: "#F59E0B",
                  },
                ] as const
              ).map((opt) => {
                const active = defaultMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setDefaultMode(opt.value as DefaultMode)}
                    className="flex flex-col items-start text-left gap-1 p-2.5 rounded-lg cursor-pointer border outline-none transition-all"
                    style={{
                      background: active
                        ? `${opt.color}15`
                        : "var(--bg2)",
                      borderColor: active ? opt.color : "var(--border2)",
                      borderWidth: 1,
                      borderStyle: "solid",
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <opt.icon
                        className="w-3.5 h-3.5"
                        style={{
                          color: active ? opt.color : "var(--text-muted)",
                        }}
                      />
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: active ? opt.color : "var(--text)",
                        }}
                      >
                        {opt.label}
                      </span>
                    </div>
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* System prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--text)" }}
              >
                Prompt système
              </p>
              <span
                className="text-[10px] tabular-nums"
                style={{ color: "var(--text-muted)" }}
              >
                {promptChars} caractères
              </span>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={10}
              placeholder="Tu es Yumi, créatrice de contenu..."
              className="w-full rounded-lg px-3 py-2 text-xs resize-y outline-none leading-relaxed"
              style={{
                background: "var(--bg2)",
                border: "1px solid var(--border2)",
                color: "var(--text)",
                minHeight: 180,
                fontFamily: "ui-monospace, monospace",
              }}
            />
          </div>

          {/* AI model + max history */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: "var(--text)" }}
              >
                Modèle IA
              </label>
              <input
                type="text"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                placeholder="anthropic/claude-sonnet-4.6"
                className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                style={{
                  background: "var(--bg2)",
                  border: "1px solid var(--border2)",
                  color: "var(--text)",
                  fontFamily: "ui-monospace, monospace",
                }}
              />
              <p
                className="text-[10px] mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Suggestion : anthropic/claude-sonnet-4.6
              </p>
            </div>
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: "var(--text)" }}
              >
                Historique max (messages)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxHistory}
                onChange={(e) =>
                  setMaxHistory(
                    Math.max(
                      1,
                      Math.min(50, parseInt(e.target.value) || 1)
                    )
                  )
                }
                className="w-full rounded-lg px-3 py-2 text-xs outline-none tabular-nums"
                style={{
                  background: "var(--bg2)",
                  border: "1px solid var(--border2)",
                  color: "var(--text)",
                }}
              />
              <p
                className="text-[10px] mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Entre 1 et 50 messages gardés en contexte
              </p>
            </div>
          </div>

          {/* Save */}
          <div
            className="flex items-center justify-end gap-3 pt-3"
            style={{ borderTop: "1px solid var(--border2)" }}
          >
            {saveStatus === "success" && (
              <span
                className="flex items-center gap-1 text-[11px]"
                style={{ color: "#22C55E" }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Enregistré
              </span>
            )}
            {saveStatus === "error" && (
              <span
                className="flex items-center gap-1 text-[11px]"
                style={{ color: "#DC2626" }}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Erreur, réessaie
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer border-none outline-none"
              style={{
                background:
                  "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
                color: "#fff",
                opacity: saving ? 0.5 : 1,
              }}
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ──

function InfoRow({
  label,
  value,
  valueNode,
  mono,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className="text-[11px] font-medium flex-shrink-0"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <span
        className="text-xs text-right truncate min-w-0"
        style={{
          color: "var(--text)",
          fontFamily: mono ? "ui-monospace, monospace" : undefined,
        }}
      >
        {valueNode ?? value}
      </span>
    </div>
  );
}
