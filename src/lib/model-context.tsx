"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { HeavenAuth } from "@/components/auth-guard";
import { toModelId } from "@/lib/model-utils";

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

function readSessionAuth(): AuthState {
  try {
    const raw = sessionStorage.getItem("heaven_auth");
    if (raw) {
      const parsed: HeavenAuth = JSON.parse(raw);
      const model = (parsed.role === "model" && parsed.model_slug) ? parsed.model_slug : null;
      return { auth: parsed, currentModel: model, ready: true };
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

  const { auth, currentModel, ready } = state;

  // Allow external model switching (root)
  const setCurrentModel = useCallback((slug: string | null) => {
    setState(prev => ({ ...prev, currentModel: slug }));
  }, []);

  // Load active models from API (root only)
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
          if (!currentModel && data.models.length > 0) {
            const first = data.models[0];
            setCurrentModel(first.slug || first.model_slug);
          }
        }
      })
      .catch(() => {});
  }, [ready, auth?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const isRoot = auth?.role === "root";

  const modelId = useMemo(
    () => toModelId(currentModel || auth?.model_slug || ""),
    [currentModel, auth?.model_slug]
  );

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
