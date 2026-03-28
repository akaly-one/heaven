"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, X, Send, ChevronLeft, Check, CheckCircle,
  PenSquare, Key, Calendar,
} from "lucide-react";
import { useModel } from "@/lib/model-context";
import { getHeavenFlows, type PilotFlow } from "@/lib/pilot-flows";

// ══════════════════════════════════════════════
//  PILOT — Agent admin Heaven OS
//  Guided flows for content creation & codes
// ══════════════════════════════════════════════

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  PenSquare, Key, Calendar,
};

interface PilotMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  actions?: { id: string; label: string; value: string }[];
}

type FlowState = "idle" | "actionSelect" | "flowing" | "review" | "saving" | "done";

const ACCENT = "#C9A84C";

interface PilotAssistantProps {
  cpId: string;
  position?: "bottom-right" | "bottom-left";
}

export function PilotAssistant({ cpId, position = "bottom-right" }: PilotAssistantProps) {
  const router = useRouter();
  const { currentModel, authHeaders } = useModel();
  const modelSlug = currentModel || "yumi";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<PilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [currentFlow, setCurrentFlow] = useState<PilotFlow | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const flows = getHeavenFlows();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function addBot(content: string, actions?: PilotMessage["actions"]) {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, {
        id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        role: "bot", content, actions,
      }]);
    }, 250 + Math.random() * 200);
  }

  function addUser(content: string) {
    setMessages(prev => [...prev, {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      role: "user", content,
    }]);
  }

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
    if (messages.length === 0) {
      const flowActions = flows.map(f => ({
        id: `flow_${f.id}`, label: `+ ${f.label}`, value: `flow_${f.id}`,
      }));
      const navActions = [
        { id: "go_sim", label: "Simulateur", value: "go_sim" },
        { id: "go_auto", label: "Automation", value: "go_auto" },
      ];
      setMessages([{
        id: "greeting", role: "bot",
        content: `Salut ! PILOT ici.\n\nProfil actif : **${modelSlug.toUpperCase()}**\n\nQue veux-tu faire ?`,
        actions: [...flowActions, ...navActions],
      }]);
      setFlowState("actionSelect");
    }
  }

  function startFlow(flow: PilotFlow) {
    setCurrentFlow(flow);
    setStepIndex(0);
    setAnswers({});
    setFlowState("flowing");
    const step = flow.steps[0];
    addBot(`${flow.label}\n\n${step.question}`,
      step.options?.map(o => ({ id: o, label: o, value: o }))
    );
  }

  function answerStep(value: string) {
    if (!currentFlow) return;
    const step = currentFlow.steps[stepIndex];
    const newAnswers = { ...answers, [step.id]: value };
    setAnswers(newAnswers);

    const nextIndex = stepIndex + 1;
    if (nextIndex < currentFlow.steps.length) {
      setStepIndex(nextIndex);
      const next = currentFlow.steps[nextIndex];
      addBot(next.question, next.options?.map(o => ({ id: o, label: o, value: o })));
    } else {
      setFlowState("review");
      const summary = currentFlow.steps
        .map(s => `• ${s.question.replace(" ?", "").replace("?", "")} : **${newAnswers[s.id] || "—"}**`)
        .join("\n");
      addBot(`Recapitulatif :\n\n${summary}\n\nOn confirme ?`, [
        { id: "confirm", label: "Confirmer", value: "confirm_create" },
        { id: "cancel", label: "Annuler", value: "cancel_flow" },
      ]);
    }
  }

  async function confirmCreate() {
    if (!currentFlow) return;
    setFlowState("saving");

    try {
      if (currentFlow.action === "api" && currentFlow.apiEndpoint) {
        const body = currentFlow.buildBody(answers, modelSlug);
        const res = await fetch(currentFlow.apiEndpoint, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Erreur" }));
          throw new Error(err.error || "Erreur creation");
        }
      } else {
        // Callback-type flow: save to localStorage
        const entity = currentFlow.buildBody(answers, modelSlug);
        const key = `heaven_pilot_${currentFlow.id}_${modelSlug}`;
        let existing: Record<string, unknown>[] = [];
        try {
          const raw = localStorage.getItem(key);
          if (raw) existing = JSON.parse(raw);
          if (!Array.isArray(existing)) existing = [];
        } catch { existing = []; }
        existing.unshift(entity);
        localStorage.setItem(key, JSON.stringify(existing));
      }

      setFlowState("done");
      addBot(`Cree avec succes !\n\n${currentFlow.label} pour ${modelSlug.toUpperCase()}.`, [
        { id: "another", label: "Autre action", value: "reset" },
        { id: "close", label: "Fermer", value: "close" },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      addBot(`Erreur : ${msg}\n\nReessaye ou annule.`, [
        { id: "retry", label: "Reessayer", value: "confirm_create" },
        { id: "cancel", label: "Annuler", value: "cancel_flow" },
      ]);
      setFlowState("review");
    }
    setCurrentFlow(null);
  }

  const processInput = useCallback((text: string) => {
    const t = text.toLowerCase().trim();

    // Flow triggers
    if (t.startsWith("flow_")) {
      const flowId = t.replace("flow_", "");
      const flow = flows.find(f => f.id === flowId);
      if (flow) { startFlow(flow); return; }
    }

    // Flow step answers
    if (flowState === "flowing" && currentFlow) { answerStep(text); return; }

    // Confirm/cancel
    if (t === "confirm_create") { confirmCreate(); return; }
    if (t === "cancel_flow") {
      setFlowState("actionSelect");
      setCurrentFlow(null);
      addBot("Annule. Que veux-tu faire ?", flows.map(f => ({
        id: `flow_${f.id}`, label: `+ ${f.label}`, value: `flow_${f.id}`,
      })));
      return;
    }

    if (t === "reset") { setFlowState("actionSelect"); handleOpen(); return; }
    if (t === "close") { setOpen(false); return; }

    // Navigation
    if (t === "go_sim" || t.includes("simulateur") || t.includes("strategie")) { router.push("/agence/simulateur"); return; }
    if (t === "go_auto" || t.includes("automation")) { router.push("/agence/automation"); return; }
    if (t.includes("dashboard") || t.includes("accueil")) { router.push("/agence"); return; }

    // Menu
    if (t === "menu" || t === "aide" || t === "help") {
      addBot("Que veux-tu faire ?", flows.map(f => ({
        id: `flow_${f.id}`, label: `+ ${f.label}`, value: `flow_${f.id}`,
      })));
      return;
    }

    // Fallback
    addBot("Je peux t'aider a :\n\n+ Creer un post\n+ Generer un code d'acces\n+ Planifier du contenu\n→ Naviguer (simulateur, automation)\n\nTape 'aide' pour les options.", flows.map(f => ({
      id: `flow_${f.id}`, label: `+ ${f.label}`, value: `flow_${f.id}`,
    })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowState, currentFlow, stepIndex, answers, flows, modelSlug]);

  function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");
    addUser(msg);
    setTimeout(() => processInput(msg), 100);
  }

  function handleActionClick(value: string, label: string) {
    addUser(label);
    setTimeout(() => processInput(value), 100);
  }

  // ── FAB ──
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="fixed z-40 w-12 h-12 rounded-full items-center justify-center shadow-2xl transition-all hover:scale-110 cursor-pointer hidden md:flex"
        style={{
          background: `linear-gradient(135deg, ${ACCENT}, #E8C76A)`,
          [position === "bottom-right" ? "right" : "left"]: 24,
          bottom: 24,
          boxShadow: `0 0 20px rgba(201,168,76,0.3), 0 4px 12px rgba(0,0,0,0.3)`,
        }}
      >
        <Sparkles className="w-5 h-5" style={{ color: "#06060B" }} />
      </button>
    );
  }

  // ── Panel ──
  const stepIndicator = flowState === "flowing" && currentFlow
    ? `Etape ${stepIndex + 1}/${currentFlow.steps.length}` : null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      <div
        className="fixed z-50 flex flex-col overflow-hidden
          inset-x-0 bottom-0 h-[70vh] rounded-t-2xl
          md:inset-auto md:bottom-20 md:h-[520px] md:w-[380px] md:rounded-2xl md:max-w-[calc(100vw-2rem)]"
        style={{
          [position === "bottom-right" ? "right" : "left"]: typeof window !== "undefined" && window.innerWidth >= 768 ? 24 : undefined,
          background: "var(--surface)",
          border: "1px solid var(--border2)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 0 40px rgba(201,168,76,0.08)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border2)" }}>
          {flowState === "flowing" && (
            <button onClick={() => {
              setFlowState("actionSelect");
              setCurrentFlow(null);
              addBot("Annule. Que veux-tu faire ?", flows.map(f => ({
                id: `flow_${f.id}`, label: `+ ${f.label}`, value: `flow_${f.id}`,
              })));
            }} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
              style={{ background: "var(--bg3)" }}>
              <ChevronLeft className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, #E8C76A)` }}>
            <Sparkles className="w-4 h-4" style={{ color: "#06060B" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>
              PILOT {stepIndicator && <span className="font-normal" style={{ color: "var(--text-muted)" }}>— {stepIndicator}</span>}
            </h3>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {currentFlow ? currentFlow.label : `Assistant — ${modelSlug.toUpperCase()}`}
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ background: "var(--bg3)" }}>
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Progress bar */}
        {flowState === "flowing" && currentFlow && (
          <div className="h-1 shrink-0" style={{ background: "var(--bg3)" }}>
            <div className="h-full transition-all duration-500" style={{
              width: `${((stepIndex + 1) / currentFlow.steps.length) * 100}%`,
              background: `linear-gradient(90deg, ${currentFlow.color}, ${currentFlow.color}80)`,
            }} />
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollBehavior: "smooth" }}>
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[85%] space-y-2">
                <div className="px-3 py-2.5 rounded-xl text-[11px] leading-relaxed whitespace-pre-line"
                  style={{
                    background: msg.role === "user"
                      ? `linear-gradient(135deg, ${ACCENT}, #E8C76A)`
                      : "var(--bg3)",
                    color: msg.role === "user" ? "#06060B" : "var(--text)",
                    borderBottomRightRadius: msg.role === "user" ? 4 : 12,
                    borderBottomLeftRadius: msg.role === "bot" ? 4 : 12,
                  }}>
                  {msg.content}
                </div>
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.actions.map(action => {
                      const isFlow = action.value.startsWith("flow_");
                      const matchFlow = isFlow ? flows.find(f => f.id === action.value.replace("flow_", "")) : null;
                      const FlowIcon = matchFlow ? ICON_MAP[matchFlow.iconName] : null;
                      return (
                        <button key={action.id}
                          onClick={() => handleActionClick(action.value, action.label)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97]"
                          style={{
                            background: isFlow ? `${matchFlow?.color || ACCENT}15` : "var(--bg3)",
                            color: isFlow ? matchFlow?.color || ACCENT : "var(--text-muted)",
                            border: `1px solid ${isFlow ? `${matchFlow?.color || ACCENT}25` : "var(--border2)"}`,
                          }}>
                          {FlowIcon && <FlowIcon className="w-3 h-3" style={{ color: matchFlow?.color }} />}
                          {action.value === "confirm_create" && <Check className="w-3 h-3" />}
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-xl flex gap-1" style={{ background: "var(--bg3)" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: ACCENT, animationDelay: `${i * 100}ms`, animationDuration: "0.6s" }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 py-3" style={{ borderTop: "1px solid var(--border2)" }}>
          {flowState === "flowing" && currentFlow && !currentFlow.steps[stepIndex].options ? (
            <div className="flex gap-2">
              <input ref={inputRef}
                type={currentFlow.steps[stepIndex].type === "number" ? "number" : "text"}
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && input.trim()) {
                    const val = input.trim(); setInput(""); addUser(val);
                    setTimeout(() => answerStep(val), 100);
                  }
                }}
                placeholder={currentFlow.steps[stepIndex].placeholder || "Ta reponse..."}
                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
              />
              <button onClick={() => {
                if (input.trim()) { const val = input.trim(); setInput(""); addUser(val); setTimeout(() => answerStep(val), 100); }
              }} className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer shrink-0"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #E8C76A)` }}>
                <Send className="w-4 h-4" style={{ color: "#06060B" }} />
              </button>
            </div>
          ) : flowState === "done" ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Action terminee</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
                placeholder="Commande ou question..."
                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
              />
              <button onClick={() => handleSend()}
                className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer shrink-0"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #E8C76A)` }}>
                <Send className="w-4 h-4" style={{ color: "#06060B" }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
