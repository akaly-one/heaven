"use client";

// ══════════════════════════════════════════════════════════════════════════
//  AccountModulesToggle — checkboxes des 5 modules activables per-compte
//
//  Agent 10.A Phase 10 : affiche et permet d'activer/desactiver les 5
//  modules cockpit pour un compte donne :
//    - agent_dm  (conversations IA)
//    - finance   (commission + revenue)
//    - ops       (monitoring + metrics)
//    - strategie (panel Strategy)
//    - dmca      (Release Form workflow)
//
//  Chaque checkbox → PATCH /api/agence/accounts/[code]/modules
//  Loader pendant update, toast success/erreur via callback.
// ══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import {
  MessageSquare, DollarSign, Activity, Target, Shield, Loader2, Check,
} from "lucide-react";

export type ModuleKey = "agent_dm" | "finance" | "ops" | "strategie" | "dmca";

export interface ModuleState {
  enabled: boolean;
  activated_at?: string | null;
  activated_by?: string | null;
}

export type ActivableModules = Partial<Record<ModuleKey, ModuleState>>;

interface Props {
  accountCode: string;
  accountDisplayName: string;
  modules: ActivableModules;
  canEdit: boolean;
  authHeaders: () => HeadersInit;
  onToggled?: (next: ActivableModules) => void;
  onError?: (msg: string) => void;
}

const MODULE_DEFINITIONS: {
  key: ModuleKey;
  label: string;
  description: string;
  icon: typeof MessageSquare;
  color: string;
}[] = [
  { key: "agent_dm", label: "Agent DM", description: "Conversations IA, replies, drafts", icon: MessageSquare, color: "#A882FF" },
  { key: "finance", label: "Finance", description: "Commission & revenue tracking", icon: DollarSign, color: "#10B981" },
  { key: "ops", label: "Ops", description: "Monitoring & metrics", icon: Activity, color: "#F59E0B" },
  { key: "strategie", label: "Stratégie", description: "Panel Strategy + objectifs", icon: Target, color: "#E84393" },
  { key: "dmca", label: "DMCA", description: "Release Form workflow", icon: Shield, color: "#EF4444" },
];

export function AccountModulesToggle({
  accountCode,
  accountDisplayName,
  modules,
  canEdit,
  authHeaders,
  onToggled,
  onError,
}: Props) {
  const [local, setLocal] = useState<ActivableModules>(modules);
  const [saving, setSaving] = useState<ModuleKey | null>(null);
  const [justSaved, setJustSaved] = useState<ModuleKey | null>(null);

  const toggle = async (key: ModuleKey) => {
    if (!canEdit) return;
    if (saving) return;
    const current = local[key]?.enabled ?? false;
    const next = !current;

    setSaving(key);
    // Optimistic update
    const optimistic: ActivableModules = {
      ...local,
      [key]: { ...(local[key] ?? {}), enabled: next, activated_at: next ? new Date().toISOString() : null },
    };
    setLocal(optimistic);

    try {
      const r = await fetch(`/api/agence/accounts/${accountCode}/modules`, {
        method: "PATCH",
        headers: { ...(authHeaders() as Record<string, string>), "Content-Type": "application/json" },
        body: JSON.stringify({ module: key, enabled: next }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        // Revert
        setLocal(local);
        onError?.(d.error || "Erreur activation module");
        return;
      }
      if (d.activable_modules) {
        setLocal(d.activable_modules);
        onToggled?.(d.activable_modules);
      } else {
        onToggled?.(optimistic);
      }
      setJustSaved(key);
      setTimeout(() => setJustSaved(null), 1500);
    } catch {
      setLocal(local);
      onError?.("Erreur réseau");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        Modules de <span className="font-semibold" style={{ color: "var(--text)" }}>{accountDisplayName}</span>
      </p>
      <div className="grid grid-cols-1 gap-2">
        {MODULE_DEFINITIONS.map((mod) => {
          const state = local[mod.key];
          const enabled = state?.enabled ?? false;
          const Icon = mod.icon;
          const isSaving = saving === mod.key;
          const isSaved = justSaved === mod.key;

          return (
            <label
              key={mod.key}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${canEdit && !isSaving ? "cursor-pointer hover:scale-[1.01]" : "cursor-not-allowed"}`}
              style={{
                background: enabled ? `${mod.color}10` : "var(--bg3)",
                border: `1px solid ${enabled ? `${mod.color}30` : "var(--border2)"}`,
                opacity: canEdit ? 1 : 0.7,
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: enabled ? `${mod.color}20` : "var(--bg)",
                  color: enabled ? mod.color : "var(--text-muted)",
                }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: enabled ? mod.color : "var(--text)" }}>
                  {mod.label}
                </p>
                <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                  {mod.description}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: mod.color }} />}
                {isSaved && !isSaving && <Check className="w-3.5 h-3.5" style={{ color: "#10B981" }} />}
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={!canEdit || isSaving}
                  onChange={() => toggle(mod.key)}
                  className="cursor-pointer"
                  style={{ accentColor: mod.color, width: 16, height: 16 }}
                />
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
