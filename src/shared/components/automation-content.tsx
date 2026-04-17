"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot, Instagram, MessageSquare, Shield, Zap, Check, Circle,
  CheckCircle, ChevronDown, ChevronUp, ExternalLink, Copy,
  Activity, Clock, TrendingUp, AlertTriangle, Settings,
  Send, Eye, Brain, Plug, ArrowRight, Sparkles,
} from "lucide-react";

// ══════════════════════════════════════════════
//  AUTOMATION CONTENT — Instagram DM Agent
//  Reusable: standalone page + tab in simulateur
// ══════════════════════════════════════════════

interface AutomationState {
  completedSteps: string[];
  metaAppId: string;
  metaAppSecret: string;
  pageAccessToken: string;
  igAccountId: string;
  webhookVerifyToken: string;
  agentPersona: string;
  agentTone: "friendly" | "professional" | "flirty" | "custom";
  agentRules: string[];
  autoReplyEnabled: boolean;
  autoReplyDelay: number;
  n8nWebhookUrl: string;
  n8nWorkflowId: string;
  updatedAt: string;
}

function defaultState(): AutomationState {
  return {
    completedSteps: [],
    metaAppId: "",
    metaAppSecret: "",
    pageAccessToken: "",
    igAccountId: "",
    webhookVerifyToken: `heaven_${Math.random().toString(36).slice(2, 10)}`,
    agentPersona: "",
    agentTone: "friendly",
    agentRules: [
      "Ne jamais envoyer de contenu explicite dans les DMs",
      "Rediriger vers les liens de paiement pour le contenu premium",
      "Repondre en francais par defaut, anglais si le client ecrit en anglais",
      "Ne jamais partager d'informations personnelles du modele",
      "Etre accueillant et engageant sans etre trop insistant",
    ],
    autoReplyEnabled: false,
    autoReplyDelay: 3,
    n8nWebhookUrl: "",
    n8nWorkflowId: "",
    updatedAt: new Date().toISOString(),
  };
}

function loadState(key: string): AutomationState {
  if (typeof window === "undefined") return defaultState();
  try {
    // Try per-profile key first
    let raw = localStorage.getItem(key);
    if (!raw) {
      // Migrate from old shared key
      const oldRaw = localStorage.getItem("heaven_automation_v1");
      if (oldRaw) {
        localStorage.setItem(key, oldRaw);
        raw = oldRaw;
      }
    }
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultState();
}

function saveState(key: string, s: AutomationState) {
  localStorage.setItem(key, JSON.stringify({ ...s, updatedAt: new Date().toISOString() }));
}

// Setup steps
interface SetupStep {
  id: string;
  phase: "connect" | "configure" | "deploy" | "monitor";
  label: string;
  desc: string;
  icon: typeof Bot;
  color: string;
  estimatedTime: string;
}

const SETUP_STEPS: SetupStep[] = [
  { id: "ig-pro", phase: "connect", label: "Compte Instagram Pro", desc: "Passer en compte Business ou Creator", icon: Instagram, color: "#E040FB", estimatedTime: "5 min" },
  { id: "fb-page", phase: "connect", label: "Page Facebook liee", desc: "Lier une Page Facebook au compte Instagram", icon: ExternalLink, color: "#1877F2", estimatedTime: "5 min" },
  { id: "meta-app", phase: "connect", label: "App Facebook Developer", desc: "Creer une App sur developers.facebook.com", icon: Plug, color: "#0668E1", estimatedTime: "15 min" },
  { id: "permissions", phase: "connect", label: "Permissions Messaging", desc: "Demander instagram_manage_messages + pages_messaging", icon: Shield, color: "#F59E0B", estimatedTime: "2-5 jours (review Meta)" },
  { id: "token", phase: "connect", label: "Token d'acces", desc: "Generer un token longue duree via Graph API Explorer", icon: Zap, color: "#10B981", estimatedTime: "10 min" },
  { id: "persona", phase: "configure", label: "Persona de l'agent", desc: "Definir le ton, le style et les limites de l'agent IA", icon: Brain, color: "#7C3AED", estimatedTime: "15 min" },
  { id: "rules", phase: "configure", label: "Regles de securite", desc: "Configurer les regles de reponse et les interdictions", icon: Shield, color: "#EF4444", estimatedTime: "10 min" },
  { id: "catalog", phase: "configure", label: "Catalogue produits", desc: "Connecter les packs (VIP, Gold, Diamond, Platinum) a l'agent", icon: Settings, color: "#C9A84C", estimatedTime: "5 min" },
  { id: "n8n-workflow", phase: "deploy", label: "Workflow n8n", desc: "Creer le workflow webhook → Claude → Instagram Send", icon: Activity, color: "#FF6D5A", estimatedTime: "30 min" },
  { id: "webhook", phase: "deploy", label: "Webhook Instagram", desc: "Configurer le webhook pour recevoir les DMs entrants", icon: Zap, color: "#10B981", estimatedTime: "10 min" },
  { id: "test", phase: "deploy", label: "Test end-to-end", desc: "Envoyer un DM test et verifier la reponse automatique", icon: Send, color: "#60A5FA", estimatedTime: "5 min" },
  { id: "go-live", phase: "monitor", label: "Activation", desc: "Activer les reponses automatiques en production", icon: Sparkles, color: "#10B981", estimatedTime: "1 min" },
];

const PHASE_META: Record<string, { label: string; color: string; icon: typeof Bot; desc: string }> = {
  connect: { label: "Connexion Meta", color: "#1877F2", icon: Plug, desc: "Lier Instagram a l'infrastructure" },
  configure: { label: "Configuration Agent", color: "#7C3AED", icon: Brain, desc: "Personnaliser le comportement IA" },
  deploy: { label: "Deploiement", color: "#FF6D5A", icon: Zap, desc: "Mettre en place le workflow" },
  monitor: { label: "Production", color: "#10B981", icon: Activity, desc: "Activer et surveiller" },
};

const TONE_OPTIONS: { id: AutomationState["agentTone"]; label: string; desc: string }[] = [
  { id: "friendly", label: "Amical", desc: "Chaleureux, decontracte, emojis legers" },
  { id: "professional", label: "Pro", desc: "Poli, structure, business" },
  { id: "flirty", label: "Seducteur", desc: "Charme, taquineries, mystere" },
  { id: "custom", label: "Custom", desc: "Ton personnalise via le persona" },
];

// ══════════ EXPORTED COMPONENT ══════════

interface AutomationContentProps {
  modelName: string;
  storageKey?: string;
  compact?: boolean;
}

export function AutomationContent({ modelName, storageKey = "heaven_automation_v1", compact = false }: AutomationContentProps) {
  const [state, setState] = useState<AutomationState>(() => loadState(storageKey));
  const [expandedPhase, setExpandedPhase] = useState<string | null>("connect");
  const [newRule, setNewRule] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { saveState(storageKey, state); }, [state, storageKey]);

  const toggleStep = useCallback((stepId: string) => {
    setState(prev => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(stepId)
        ? prev.completedSteps.filter(s => s !== stepId)
        : [...prev.completedSteps, stepId],
    }));
  }, []);

  const updateField = useCallback(<K extends keyof AutomationState>(key: K, val: AutomationState[K]) => {
    setState(prev => ({ ...prev, [key]: val }));
  }, []);

  const addRule = useCallback(() => {
    if (!newRule.trim()) return;
    setState(prev => ({ ...prev, agentRules: [...prev.agentRules, newRule.trim()] }));
    setNewRule("");
  }, [newRule]);

  const removeRule = useCallback((idx: number) => {
    setState(prev => ({ ...prev, agentRules: prev.agentRules.filter((_, i) => i !== idx) }));
  }, []);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const totalSteps = SETUP_STEPS.length;
  const completedCount = state.completedSteps.length;
  const progress = Math.round((completedCount / totalSteps) * 100);
  const isLive = state.autoReplyEnabled && state.completedSteps.includes("go-live");

  const spacing = compact ? "space-y-3" : "space-y-5";
  const outerPadding = compact ? "" : "min-h-screen p-4 md:p-8 pb-28 md:pb-8";

  return (
    <div className={outerPadding}>
      <div className={`max-w-4xl mx-auto ${spacing}`}>

        {/* Header — full mode only */}
        {!compact && (
          <div className="flex items-center gap-3 fade-up">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #E040FB, #1877F2)", boxShadow: "0 0 20px rgba(224,64,251,0.2)" }}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Agent DM</h1>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {modelName} — Reponses automatiques Instagram
              </p>
            </div>
            <LiveBadge isLive={isLive} />
          </div>
        )}

        {/* Compact: inline status bar instead of full header + summary cards */}
        {compact ? (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <Bot className="w-4 h-4" style={{ color: "#E040FB" }} />
            <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{modelName}</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg2)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${progress}%`,
                background: progress === 100 ? "#10B981" : "linear-gradient(90deg, #1877F2, #E040FB)",
              }} />
            </div>
            <span className="text-[10px] font-bold" style={{ color: progress === 100 ? "#10B981" : "#60A5FA" }}>
              {completedCount}/{totalSteps}
            </span>
            <LiveBadge isLive={isLive} />
          </div>
        ) : (
          <>
            {/* Summary cards — full mode */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 fade-up">
              {[
                { label: "Setup", value: `${progress}%`, color: progress === 100 ? "#10B981" : "#60A5FA", icon: Settings },
                { label: "Etapes", value: `${completedCount}/${totalSteps}`, color: "#E040FB", icon: CheckCircle },
                { label: "Agent", value: state.agentPersona ? "Configure" : "A faire", color: state.agentPersona ? "#10B981" : "#F59E0B", icon: Brain },
                { label: "Status", value: isLive ? "Actif" : "Inactif", color: isLive ? "#10B981" : "#64748B", icon: Activity },
              ].map(card => (
                <div key={card.label} className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <card.icon className="w-3 h-3" style={{ color: card.color }} />
                    <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{card.label}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: card.color }}>{card.value}</span>
                </div>
              ))}
            </div>

            {/* Progress bar — full mode */}
            <div className="rounded-xl p-3 fade-up" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>Progression setup</span>
                <span className="text-[10px] font-bold" style={{ color: progress === 100 ? "#10B981" : "#60A5FA" }}>
                  {progress}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg2)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${progress}%`,
                  background: progress === 100 ? "#10B981" : "linear-gradient(90deg, #1877F2, #E040FB)",
                }} />
              </div>
            </div>
          </>
        )}

        {/* Phase blocks */}
        <div className="flex md:grid md:grid-cols-2 gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:snap-none"
          style={{ scrollbarWidth: "none" }}>
          {(["connect", "configure", "deploy", "monitor"] as const).map(phase => {
            const meta = PHASE_META[phase];
            const phaseSteps = SETUP_STEPS.filter(s => s.phase === phase);
            const phaseDone = phaseSteps.filter(s => state.completedSteps.includes(s.id)).length;
            const phaseComplete = phaseDone === phaseSteps.length;
            const isExpanded = expandedPhase === phase;

            return (
              <div key={phase} className="min-w-[280px] md:min-w-0 snap-start rounded-xl overflow-hidden flex flex-col"
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${phaseComplete ? "rgba(16,185,129,0.2)" : "var(--border)"}`,
                }}>
                <button onClick={() => setExpandedPhase(isExpanded ? null : phase)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:opacity-80 transition-all text-left"
                  style={{ background: "none", border: "none" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${meta.color}15` }}>
                    <meta.icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold block" style={{ color: meta.color }}>{meta.label}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{meta.desc}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                    style={{
                      background: phaseComplete ? "rgba(16,185,129,0.1)" : `${meta.color}10`,
                      color: phaseComplete ? "#10B981" : meta.color,
                    }}>
                    {phaseDone}/{phaseSteps.length}
                  </span>
                  {isExpanded ? <ChevronUp className="w-3 h-3 shrink-0" style={{ color: "var(--text-muted)" }} />
                    : <ChevronDown className="w-3 h-3 shrink-0" style={{ color: "var(--text-muted)" }} />}
                </button>
                <div className="h-0.5" style={{ background: "var(--bg2)" }}>
                  <div className="h-full transition-all" style={{
                    width: `${(phaseDone / phaseSteps.length) * 100}%`,
                    background: phaseComplete ? "#10B981" : meta.color,
                  }} />
                </div>
                {isExpanded && (
                  <div className="p-2 space-y-1">
                    {phaseSteps.map(step => {
                      const done = state.completedSteps.includes(step.id);
                      return (
                        <button key={step.id} onClick={() => toggleStep(step.id)}
                          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all hover:opacity-80 text-left"
                          style={{ background: done ? "rgba(16,185,129,0.05)" : "transparent" }}>
                          {done
                            ? <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#10B981" }} />
                            : <Circle className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--border3)" }} />}
                          <step.icon className="w-3 h-3 shrink-0" style={{ color: done ? "#10B981" : step.color }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-medium block" style={{
                              color: done ? "#10B981" : "var(--text)",
                              textDecoration: done ? "line-through" : "none",
                            }}>{step.label}</span>
                            <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>{step.desc}</span>
                          </div>
                          <span className="text-[10px] px-1 py-0.5 rounded shrink-0" style={{ background: "var(--bg2)", color: "var(--text-muted)" }}>
                            {step.estimatedTime}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ═══ CONFIGURATION PANELS ═══ */}

        {/* Meta API Config */}
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <Instagram className="w-4 h-4" style={{ color: "#E040FB" }} />
            <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Configuration Meta / Instagram</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ConfigField label="App ID" value={state.metaAppId} onChange={v => updateField("metaAppId", v)} placeholder="123456789..." />
              <ConfigField label="App Secret" value={state.metaAppSecret} onChange={v => updateField("metaAppSecret", v)} placeholder="abc123..." secret />
              <ConfigField label="Page Access Token" value={state.pageAccessToken} onChange={v => updateField("pageAccessToken", v)} placeholder="EAAx..." secret />
              <ConfigField label="IG Account ID" value={state.igAccountId} onChange={v => updateField("igAccountId", v)} placeholder="17841..." />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--bg2)" }}>
              <span className="text-[10px] font-medium shrink-0" style={{ color: "var(--text-muted)" }}>Webhook Verify Token:</span>
              <code className="text-[10px] font-mono flex-1" style={{ color: "#E040FB" }}>{state.webhookVerifyToken}</code>
              <button onClick={() => copyToClipboard(state.webhookVerifyToken, "verify")}
                className="p-1 rounded cursor-pointer hover:opacity-70" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                {copied === "verify" ? <Check className="w-3 h-3" style={{ color: "#10B981" }} /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(24,119,242,0.05)", border: "1px solid rgba(24,119,242,0.1)" }}>
              <ExternalLink className="w-3 h-3 shrink-0" style={{ color: "#1877F2" }} />
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Aller sur <strong style={{ color: "#1877F2" }}>developers.facebook.com</strong> pour creer l&apos;App et obtenir les tokens
              </span>
            </div>
          </div>
        </div>

        {/* Agent Persona Config */}
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <Brain className="w-4 h-4" style={{ color: "#7C3AED" }} />
            <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Persona de l&apos;agent — {modelName}</span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <span className="text-[10px] font-semibold block mb-2" style={{ color: "var(--text-muted)" }}>Ton de communication</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {TONE_OPTIONS.map(tone => {
                  const active = state.agentTone === tone.id;
                  return (
                    <button key={tone.id} onClick={() => updateField("agentTone", tone.id)}
                      className="p-2.5 rounded-xl text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background: active ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${active ? "rgba(124,58,237,0.3)" : "var(--border)"}`,
                      }}>
                      <p className="text-[10px] font-bold" style={{ color: active ? "#7C3AED" : "var(--text)" }}>{tone.label}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{tone.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold block mb-1.5" style={{ color: "var(--text-muted)" }}>
                Instructions personnalisees (system prompt)
              </span>
              <textarea
                value={state.agentPersona}
                onChange={e => updateField("agentPersona", e.target.value)}
                placeholder={`Tu es l'assistante de ${modelName}. Tu reponds aux DMs Instagram de ses fans...`}
                rows={4}
                className="w-full rounded-xl px-3 py-2.5 text-[11px] resize-none"
                style={{ background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
              />
            </div>

            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "var(--bg2)" }}>
              <div className="flex-1">
                <span className="text-[10px] font-semibold block" style={{ color: "var(--text)" }}>Reponse automatique</span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>L&apos;agent repond sans validation manuelle</span>
              </div>
              <button onClick={() => updateField("autoReplyEnabled", !state.autoReplyEnabled)}
                className="w-10 h-5 rounded-full relative cursor-pointer transition-all"
                style={{ background: state.autoReplyEnabled ? "#10B981" : "var(--border)", border: "none" }}>
                <div className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
                  style={{ left: state.autoReplyEnabled ? 22 : 2, background: "#fff" }} />
              </button>
            </div>

            {state.autoReplyEnabled && (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "var(--bg2)" }}>
                <Clock className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>Delai avant reponse:</span>
                <input type="range" min={1} max={30} step={1} value={state.autoReplyDelay}
                  onChange={e => updateField("autoReplyDelay", Number(e.target.value))}
                  className="flex-1" style={{ accentColor: "#7C3AED" }} />
                <span className="text-[10px] font-bold w-8 text-right" style={{ color: "#7C3AED" }}>{state.autoReplyDelay}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Security Rules */}
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <Shield className="w-4 h-4" style={{ color: "#EF4444" }} />
            <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Regles de securite</span>
            <span className="text-[10px] font-medium ml-auto px-1.5 py-0.5 rounded-md" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
              {state.agentRules.length} regles
            </span>
          </div>
          <div className="p-4 space-y-2">
            {state.agentRules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg group" style={{ background: "var(--bg2)" }}>
                <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: "#F59E0B" }} />
                <span className="text-[10px] flex-1" style={{ color: "var(--text)" }}>{rule}</span>
                <button onClick={() => removeRule(i)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded cursor-pointer transition-opacity"
                  style={{ background: "none", border: "none", color: "#EF4444" }}>
                  <span className="text-[10px] font-bold">x</span>
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input value={newRule} onChange={e => setNewRule(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addRule()}
                placeholder="Ajouter une regle..."
                className="flex-1 rounded-lg px-3 py-2 text-[10px]"
                style={{ background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }} />
              <button onClick={addRule}
                className="px-3 py-2 rounded-lg text-[10px] font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "none" }}>
                Ajouter
              </button>
            </div>
          </div>
        </div>

        {/* n8n Workflow Config */}
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <Activity className="w-4 h-4" style={{ color: "#FF6D5A" }} />
            <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Workflow n8n</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ConfigField label="Webhook URL (n8n)" value={state.n8nWebhookUrl} onChange={v => updateField("n8nWebhookUrl", v)} placeholder="https://n8n.example.com/webhook/..." />
              <ConfigField label="Workflow ID" value={state.n8nWorkflowId} onChange={v => updateField("n8nWorkflowId", v)} placeholder="123" />
            </div>
            <div className="rounded-xl p-3" style={{ background: "var(--bg2)" }}>
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>
                Architecture du flux
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: "DM Instagram", color: "#E040FB", icon: MessageSquare },
                  { label: "Webhook Meta", color: "#1877F2", icon: Zap },
                  { label: "n8n Workflow", color: "#FF6D5A", icon: Activity },
                  { label: "Claude API", color: "#7C3AED", icon: Brain },
                  { label: "Reponse DM", color: "#10B981", icon: Send },
                  { label: "Log Supabase", color: "#3ECF8E", icon: Eye },
                ].map((node, i, arr) => (
                  <div key={node.label} className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: `${node.color}10`, border: `1px solid ${node.color}20` }}>
                      <node.icon className="w-2.5 h-2.5" style={{ color: node.color }} />
                      <span className="text-[10px] font-semibold" style={{ color: node.color }}>{node.label}</span>
                    </div>
                    {i < arr.length - 1 && <ArrowRight className="w-3 h-3" style={{ color: "var(--border3)" }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Stats */}
        {isLive && (
          <div className="rounded-xl p-4" style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.04), rgba(96,165,250,0.04))",
            border: "1px solid rgba(16,185,129,0.1)",
          }}>
            <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "#10B981" }}>
              <Activity className="w-4 h-4" /> Statistiques temps reel
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Messages recus", value: "—", icon: MessageSquare, color: "#E040FB" },
                { label: "Reponses auto", value: "—", icon: Send, color: "#10B981" },
                { label: "Temps moyen", value: "—", icon: Clock, color: "#F59E0B" },
                { label: "Conversions", value: "—", icon: TrendingUp, color: "#7C3AED" },
              ].map(stat => (
                <div key={stat.label} className="text-center p-2 rounded-lg" style={{ background: "var(--surface)" }}>
                  <stat.icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: stat.color }} />
                  <span className="text-sm font-bold block" style={{ color: stat.color }}>{stat.value}</span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ═══ Sub-components ═══

function LiveBadge({ isLive }: { isLive: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{
        background: isLive ? "rgba(16,185,129,0.1)" : "rgba(100,116,139,0.1)",
        border: `1px solid ${isLive ? "rgba(16,185,129,0.2)" : "rgba(100,116,139,0.2)"}`,
      }}>
      <div className="w-2 h-2 rounded-full" style={{
        background: isLive ? "#10B981" : "#64748B",
        boxShadow: isLive ? "0 0 6px #10B981" : "none",
      }} />
      <span className="text-[11px] font-bold" style={{ color: isLive ? "#10B981" : "#64748B" }}>
        {isLive ? "LIVE" : "OFFLINE"}
      </span>
    </div>
  );
}

function ConfigField({ label, value, onChange, placeholder, secret }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; secret?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
      <div className="relative">
        <input
          type={secret && !show ? "password" : "text"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg px-3 py-2 text-[10px] pr-8"
          style={{ background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
        />
        {secret && (
          <button onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
            style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
            <Eye className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
