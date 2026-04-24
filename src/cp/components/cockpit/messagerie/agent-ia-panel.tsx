"use client";

/**
 * AgentIAPanel — réglages agent IA dédié messagerie (NB 2026-04-24).
 *
 * Sections :
 *  - Status (provider Groq, runs 24h)
 *  - Persona éditeur (base_prompt, emojis favoris, fermetures favorites)
 *  - Actif/inactif
 *  - Playground test (message → réponse Groq)
 *  - Logs des 15 derniers runs (input/output, source, latency)
 */

import { useCallback, useEffect, useState } from "react";
import { Bot, Sparkles, Zap, Send, CheckCircle2, AlertTriangle, Loader2, Save, Radio, UserRound, EyeOff, GraduationCap } from "lucide-react";
import { useModel } from "@/lib/model-context";
import { MODE_LABELS, type AgentMode } from "@/lib/ai-agent/modes";

interface Persona {
  id: string;
  model_slug: string;
  version: number;
  is_active: boolean;
  mode: AgentMode;
  base_prompt: string;
  default_provider: string;
  trait_warmth: number | null;
  trait_flirt: number | null;
  favorite_emojis: string | null;
  favorite_endings: string | null;
  updated_at: string;
}

interface AIRun {
  id: string;
  conversation_source: string;
  provider_id: string;
  input_message: string | null;
  output_message: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  latency_ms: number | null;
  safety_blocked: boolean | null;
  error_message: string | null;
  created_at: string;
}

interface Settings {
  persona: Persona | null;
  recent_runs: AIRun[];
  provider_status: {
    groq_configured: boolean;
    runs_last_24h: number;
  };
}

export function AgentIAPanel() {
  const { currentModel, auth } = useModel();
  const slug = currentModel || auth?.model_slug || "yumi";

  const [data, setData] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Editable state (mirrors persona)
  const [basePrompt, setBasePrompt] = useState("");
  const [emojis, setEmojis] = useState("");
  const [endings, setEndings] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [mode, setMode] = useState<AgentMode>("auto");

  // Test playground
  const [testInput, setTestInput] = useState("Hey, tu fais quoi ?");
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testMeta, setTestMeta] = useState<{ latency_ms?: number; tokens_in?: number; tokens_out?: number; provider?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agence/ai/settings?model_slug=${encodeURIComponent(slug)}`, { credentials: "include" });
      if (!res.ok) return;
      const d = (await res.json()) as Settings;
      setData(d);
      if (d.persona) {
        setBasePrompt(d.persona.base_prompt || "");
        setEmojis(d.persona.favorite_emojis || "");
        setEndings(d.persona.favorite_endings || "");
        setIsActive(!!d.persona.is_active);
        setMode((d.persona.mode || "auto") as AgentMode);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/agence/ai/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_slug: slug,
          base_prompt: basePrompt,
          favorite_emojis: emojis,
          favorite_endings: endings,
          is_active: isActive,
          mode,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setSaveMessage("Enregistré");
        setTimeout(() => setSaveMessage(null), 2000);
        load();
      } else {
        setSaveMessage(`Erreur : ${d.error || "inconnu"}`);
      }
    } catch (e) {
      setSaveMessage(`Erreur : ${String(e).slice(0, 120)}`);
    } finally {
      setSaving(false);
    }
  }, [slug, basePrompt, emojis, endings, isActive, mode, load]);

  const runTest = useCallback(async () => {
    if (!testInput.trim()) return;
    setTestLoading(true);
    setTestError(null);
    setTestOutput(null);
    setTestMeta(null);
    try {
      const res = await fetch("/api/agence/ai/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_slug: slug, message: testInput.trim() }),
      });
      const d = await res.json();
      if (res.ok) {
        setTestOutput(d.reply);
        setTestMeta({ latency_ms: d.latency_ms, tokens_in: d.tokens_in, tokens_out: d.tokens_out, provider: d.provider });
      } else {
        setTestError(d.error === "groq_not_configured"
          ? "GROQ_API_KEY non défini côté serveur"
          : `${d.error || "failed"}${d.detail ? ` · ${d.detail.slice(0, 120)}` : ""}`);
      }
    } catch (e) {
      setTestError(String(e).slice(0, 200));
    } finally {
      setTestLoading(false);
    }
  }, [slug, testInput]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  const status = data?.provider_status;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.22), rgba(100,100,255,0.14))" }}>
          <Bot className="w-4.5 h-4.5" style={{ color: "#A78BFA" }} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Agent IA — {slug}</h2>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Configuration persona, rôle, ton — Groq Llama 3.3 70B
          </p>
        </div>
      </div>

      {/* ── Status strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatusCard
          label="Provider"
          value={status?.groq_configured ? "Groq OK" : "Non configuré"}
          icon={Zap}
          color={status?.groq_configured ? "#22C55E" : "#EF4444"}
        />
        <StatusCard
          label="Persona"
          value={data?.persona ? `v${data.persona.version}` : "—"}
          icon={Sparkles}
          color="#A78BFA"
        />
        <StatusCard
          label="Runs 24h"
          value={String(status?.runs_last_24h ?? 0)}
          icon={Bot}
          color="#5B8DEF"
        />
        <StatusCard
          label="État"
          value={data?.persona?.is_active ? "Actif" : "Inactif"}
          icon={CheckCircle2}
          color={data?.persona?.is_active ? "#22C55E" : "#F59E0B"}
        />
      </div>

      {/* ── Mode selector ── */}
      <section className="rounded-xl p-4 space-y-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text)" }}>
            Mode d&apos;opération
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{
              background: `${MODE_LABELS[mode].color}20`,
              color: MODE_LABELS[mode].color,
            }}>
            {MODE_LABELS[mode].short}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(["auto", "user", "shadow", "learning"] as AgentMode[]).map((m) => {
            const meta = MODE_LABELS[m];
            const Icon = m === "auto" ? Radio : m === "user" ? UserRound : m === "shadow" ? EyeOff : GraduationCap;
            const selected = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="flex flex-col items-start gap-1.5 p-2.5 rounded-lg text-left cursor-pointer transition-all"
                style={{
                  background: selected ? `${meta.color}15` : "var(--bg2)",
                  border: `1.5px solid ${selected ? meta.color : "var(--border2)"}`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" style={{ color: selected ? meta.color : "var(--text-muted)" }} />
                  <span className="text-[11px] font-bold" style={{ color: selected ? meta.color : "var(--text)" }}>
                    {meta.label}
                  </span>
                </div>
                <p className="text-[10px] leading-snug" style={{ color: "var(--text-muted)" }}>
                  {meta.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Persona editor ── */}
      <section className="rounded-xl p-4 space-y-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text)" }}>
            Persona
          </h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {isActive ? "Actif" : "En pause"}
            </span>
          </label>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Prompt système (personnalité, ton, cadre)
          </label>
          <textarea
            value={basePrompt}
            onChange={e => setBasePrompt(e.target.value)}
            rows={8}
            className="w-full mt-1 px-3 py-2 rounded-lg text-xs leading-relaxed outline-none"
            style={{
              background: "var(--bg2)",
              color: "var(--text)",
              border: "1px solid var(--border2)",
              fontFamily: "ui-monospace, Menlo, monospace",
            }}
            placeholder="Tu es Yumi, créatrice de contenu..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Emojis favoris
            </label>
            <input
              value={emojis}
              onChange={e => setEmojis(e.target.value)}
              placeholder="💜🌸✨💋"
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border2)" }}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Fermetures signature
            </label>
            <input
              value={endings}
              onChange={e => setEndings(e.target.value)}
              placeholder="mon cœur, bébé, chéri"
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border2)" }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {saveMessage && (
            <span className="text-[11px]" style={{ color: saveMessage === "Enregistré" ? "#22C55E" : "#EF4444" }}>
              {saveMessage}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #A78BFA, #7C4DFF)",
              color: "#fff",
              boxShadow: "0 2px 10px rgba(167,139,250,0.3)",
            }}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {saving ? "…" : "Enregistrer"}
          </button>
        </div>
      </section>

      {/* ── Playground test ── */}
      <section className="rounded-xl p-4 space-y-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text)" }}>
          Playground — test sans envoyer
        </h3>
        <div className="flex gap-2">
          <input
            value={testInput}
            onChange={e => setTestInput(e.target.value)}
            placeholder="Message d'un fan à tester…"
            onKeyDown={e => { if (e.key === "Enter") runTest(); }}
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border2)" }}
          />
          <button
            onClick={runTest}
            disabled={testLoading || !testInput.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
            style={{ background: "#A78BFA", color: "#fff" }}
          >
            {testLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Tester
          </button>
        </div>
        {testError && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg text-[11px]"
            style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{testError}</span>
          </div>
        )}
        {testOutput && (
          <div className="p-3 rounded-lg text-sm"
            style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border2)" }}>
            <div className="mb-1">{testOutput}</div>
            {testMeta && (
              <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {testMeta.latency_ms}ms · {testMeta.tokens_in}→{testMeta.tokens_out} tokens · {testMeta.provider}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Recent runs ── */}
      <section className="rounded-xl p-4 space-y-2"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text)" }}>
          15 derniers runs
        </h3>
        {(!data?.recent_runs || data.recent_runs.length === 0) ? (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Aucun run encore enregistré.</p>
        ) : (
          <div className="space-y-2">
            {data.recent_runs.map(run => (
              <RunRow key={run.id} run={run} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}) {
  return (
    <div className="rounded-xl p-3 space-y-1"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3" style={{ color }} />
        <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
      </div>
      <div className="text-sm font-bold" style={{ color: "var(--text)" }}>{value}</div>
    </div>
  );
}

function RunRow({ run }: { run: AIRun }) {
  const badgeColor =
    run.conversation_source === "instagram" ? "#E1306C" :
    run.conversation_source === "web" ? "#D4AF37" :
    run.conversation_source === "test" ? "#A78BFA" : "#6B7280";
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg text-[11px]"
      style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}>
      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0"
        style={{ background: `${badgeColor}22`, color: badgeColor }}>
        {run.conversation_source}
      </span>
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ color: "var(--text-muted)" }}>
          <span style={{ color: "var(--text)", opacity: 0.7 }}>→</span> {run.input_message || "—"}
        </div>
        <div className="truncate" style={{ color: "var(--text)" }}>
          <span style={{ color: "var(--text-muted)" }}>↩</span> {run.output_message || (run.error_message ? `⚠ ${run.error_message}` : "—")}
        </div>
        <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          {run.latency_ms ?? 0}ms · {run.tokens_in ?? 0}→{run.tokens_out ?? 0} · {new Date(run.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
        </div>
      </div>
    </div>
  );
}
