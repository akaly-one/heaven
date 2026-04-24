"use client";

/**
 * BotActivityPanel — sidebar droite Dashboard.
 *
 * NB 2026-04-24 : remplace l'ancien OverviewSimulator (obsolète car page Stratégie dédiée).
 * Affiche en temps réel :
 *   1. Dernières interactions agent IA (messages fans → réponses bot)
 *   2. Derniers prospects convertis vers Fanvue (placeholder pour l'instant)
 */

import { useCallback, useEffect, useState } from "react";
import { Bot, MessageCircle, Sparkles, ExternalLink, RefreshCw } from "lucide-react";

interface AiRun {
  id: string;
  conversation_id: string;
  conversation_source: string;
  input_message: string | null;
  output_message: string | null;
  intent_classified: string | null;
  latency_ms: number | null;
  created_at: string;
  safety_blocked: boolean | null;
}

interface Conversion {
  id: string;
  fan_pseudo: string;
  fanvue_url?: string;
  revenue: number;
  converted_at: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}j`;
}

function truncate(s: string | null, max = 60): string {
  if (!s) return "—";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export function BotActivityPanel({ modelSlug }: { modelSlug: string }) {
  const [aiRuns, setAiRuns] = useState<AiRun[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    if (!modelSlug) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/agence/bot-activity?model=${encodeURIComponent(modelSlug)}&limit=5`);
      if (!r.ok) return;
      const d = await r.json();
      setAiRuns(d.ai_runs || []);
      setConversions(d.conversions || []);
      setUpdatedAt(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [modelSlug]);

  useEffect(() => {
    fetchData();
    const poll = setInterval(fetchData, 30_000);
    return () => clearInterval(poll);
  }, [fetchData]);

  return (
    <div className="space-y-3">
      {/* Section 1 : Dernières interactions agent IA */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <Bot className="w-4 h-4" style={{ color: "#8B5CF6" }} />
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text)" }}>
            Agent IA — récent
          </h3>
          <div className="flex-1" />
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1 rounded hover:bg-white/5 cursor-pointer border-none bg-transparent disabled:opacity-50"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {aiRuns.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <MessageCircle className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Aucune interaction agent pour l&apos;instant
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                Les DMs arriveront ici dès qu&apos;Yumi en recevra
              </p>
            </div>
          ) : (
            aiRuns.map(run => (
              <div key={run.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}
                  >
                    <Bot className="w-3 h-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                        {run.conversation_source === "instagram" ? "IG" : "Web"}
                      </span>
                      {run.intent_classified && (
                        <>
                          <span className="text-[9px]" style={{ color: "var(--text-muted)", opacity: 0.5 }}>·</span>
                          <span className="text-[9px] px-1 rounded" style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6" }}>
                            {run.intent_classified}
                          </span>
                        </>
                      )}
                      <span className="text-[9px]" style={{ color: "var(--text-muted)", opacity: 0.5 }}>·</span>
                      <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                        {relativeTime(run.created_at)}
                      </span>
                    </div>
                    {run.input_message && (
                      <p className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>
                        <span style={{ opacity: 0.5 }}>Fan :</span> {truncate(run.input_message, 50)}
                      </p>
                    )}
                    {run.output_message && (
                      <p className="text-[11px]" style={{ color: "var(--text)" }}>
                        <span style={{ color: "#8B5CF6" }}>→</span> {truncate(run.output_message, 70)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <a
          href="/agence/messagerie"
          className="block px-4 py-2 text-center text-[11px] font-medium transition-colors hover:bg-white/[0.04] no-underline border-t"
          style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
        >
          Voir la messagerie complète →
        </a>
      </div>

      {/* Section 2 : Prospects convertis Fanvue */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <Sparkles className="w-4 h-4" style={{ color: "#D4AF37" }} />
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text)" }}>
            Convertis → Fanvue
          </h3>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {conversions.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <ExternalLink className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Aucune conversion suivie pour l&apos;instant
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                Tracking UTM actif dès Phase 8
              </p>
            </div>
          ) : (
            conversions.map(c => (
              <div key={c.id} className="px-4 py-3 flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37" }}
                >
                  <span className="text-[10px] font-bold">
                    {c.fan_pseudo.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                    @{c.fan_pseudo}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {relativeTime(c.converted_at)} · {c.revenue.toFixed(0)}€
                  </p>
                </div>
                {c.fanvue_url && (
                  <a
                    href={c.fanvue_url}
                    target="_blank"
                    rel="noopener"
                    className="p-1 rounded hover:bg-white/5"
                    title="Ouvrir Fanvue"
                  >
                    <ExternalLink className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <p className="text-[9px] text-center" style={{ color: "var(--text-muted)", opacity: 0.4 }}>
        Actualisé {relativeTime(updatedAt.toISOString())} · auto-refresh 30s
      </p>
    </div>
  );
}
