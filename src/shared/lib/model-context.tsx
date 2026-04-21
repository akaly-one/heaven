"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { HeavenAuth } from "@/components/auth-guard";
import { toModelId, updateModelMap } from "@/lib/model-utils";

interface ModelContextValue {
  currentModel: string | null;
  modelId: string;
  setCurrentModel: (slug: string | null) => void;
  auth: HeavenAuth | null;
  isRoot: boolean;
  models: { slug: string; display_name: string }[];
  authHeaders: () => Record<string, string>;
  ready: boolean;
}

const ModelContext = createContext<ModelContextValue>({
  currentModel: null,
  modelId: "m1",
  setCurrentModel: () => {},
  auth: null,
  isRoot: false,
  models: [],
  authHeaders: () => ({}),
  ready: false,
});

// Single atomic state to avoid split-render issues
interface AuthState {
  auth: HeavenAuth | null;
  currentModel: string | null;
  ready: boolean;
}

// Clé localStorage pour persister la sélection root via RootCpSelector.
// Règle NB (2026-04-21) : root n'a pas de CP attribué, donc sa "vue" est un
// override volontaire, pas un défaut automatique.
const ROOT_VIEWING_CP_LS_KEY = "heaven_root_viewing_cp";

function readSessionAuth(): AuthState {
  try {
    const raw = sessionStorage.getItem("heaven_auth");
    if (raw) {
      const parsed: HeavenAuth = JSON.parse(raw);
      // Role=model : son propre modèle, non-overridable.
      if (parsed.role === "model" && parsed.model_slug) {
        return { auth: parsed, currentModel: parsed.model_slug, ready: true };
      }
      // Role=root : lire sélection persistée dans localStorage si existe,
      // sinon null (root sans CP sélectionné → skeleton vide partout).
      if (parsed.role === "root") {
        let persisted: string | null = null;
        try { persisted = localStorage.getItem(ROOT_VIEWING_CP_LS_KEY); } catch { /* noop */ }
        return { auth: parsed, currentModel: persisted, ready: true };
      }
      return { auth: parsed, currentModel: null, ready: true };
    }
  } catch { /* corrupt */ }
  return { auth: null, currentModel: null, ready: true };
}

export function ModelProvider({ children }: { children: React.ReactNode }) {
  // Start not-ready; single atomic update guarantees auth+model+ready sync
  const [state, setState] = useState<AuthState>({ auth: null, currentModel: null, ready: false });
  const [models, setModels] = useState<{ slug: string; display_name: string }[]>([]);
  const initialized = useRef(false);

  // Read sessionStorage on mount — single setState with all values
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setState(readSessionAuth());
  }, []);

  // Re-read sessionStorage when login writes auth (fixes first-visit load bug)
  useEffect(() => {
    const handler = () => setState(readSessionAuth());
    window.addEventListener("heaven:auth-changed", handler);
    return () => window.removeEventListener("heaven:auth-changed", handler);
  }, []);

  const { auth, currentModel, ready } = state;

  // Allow external model switching (root). Persist choice in localStorage.
  const setCurrentModel = useCallback((slug: string | null) => {
    setState(prev => ({ ...prev, currentModel: slug }));
    try {
      if (slug) localStorage.setItem(ROOT_VIEWING_CP_LS_KEY, slug);
      else localStorage.removeItem(ROOT_VIEWING_CP_LS_KEY);
    } catch { /* noop */ }
  }, []);

  // Load active models from API (root only)
  // Règle NB (2026-04-21) : PAS d'auto-selection du premier modèle pour root.
  // Root doit explicitement choisir via RootCpSelector. Sans sélection → null
  // (skeleton vide partout, pas de fuite des données Yumi/Paloma/Ruby).
  useEffect(() => {
    if (!ready || auth?.role !== "root") return;
    fetch("/api/models")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.models?.length) {
          setModels(data.models.map((m: { slug?: string; model_slug?: string; display_name: string }) => ({
            slug: m.slug || m.model_slug,
            display_name: m.display_name,
          })));
          const mapEntries = data.models
            .filter((m: any) => m.model_id && (m.slug || m.model_slug))
            .map((m: any) => ({ slug: m.slug || m.model_slug, model_id: m.model_id }));
          if (mapEntries.length > 0) updateModelMap(mapEntries);
          // PAS de setCurrentModel automatique — attendu que root choisisse via selector
          // (persistance localStorage `heaven_root_viewing_cp` déjà lue au mount).
        }
      })
      .catch(() => {});
  }, [ready, auth?.role]);

  const isRoot = auth?.role === "root";

  // Cloisonnement : pas de fallback m1 silencieux quand aucun slug résolu.
  // Root sans selection via RootCpSelector → modelId = "" (skeleton vide).
  const modelId = useMemo(() => {
    const slug = currentModel || auth?.model_slug || null;
    return slug ? toModelId(slug) : "";
  }, [currentModel, auth?.model_slug]);

  const authHeaders = useCallback(() => {
    return { "Content-Type": "application/json" };
  }, []);

  const contextValue = useMemo(() => ({
    currentModel, modelId, setCurrentModel, auth, isRoot, models, authHeaders, ready,
  }), [currentModel, modelId, setCurrentModel, auth, isRoot, models, authHeaders, ready]);

  return (
    <ModelContext.Provider value={contextValue}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  return useContext(ModelContext);
}
