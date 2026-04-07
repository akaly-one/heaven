"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { HeavenAuth } from "@/components/auth-guard";
import { toModelId } from "@/lib/model-utils";

interface ModelContextValue {
  currentModel: string | null;
  /** Generic model ID (m1, m2...) derived from currentModel or auth.model_slug */
  modelId: string;
  setCurrentModel: (slug: string | null) => void;
  auth: HeavenAuth | null;
  isRoot: boolean;
  models: { slug: string; display_name: string }[];
  authHeaders: () => Record<string, string>;
}

const ModelContext = createContext<ModelContextValue>({
  currentModel: null,
  modelId: "m1",
  setCurrentModel: () => {},
  auth: null,
  isRoot: false,
  models: [],
  authHeaders: () => ({}),
});

// Read auth from sessionStorage synchronously to avoid loading flash
function getInitialAuth(): HeavenAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("heaven_auth");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<HeavenAuth | null>(() => getInitialAuth());
  const [currentModel, setCurrentModel] = useState<string | null>(() => {
    const a = getInitialAuth();
    if (a?.role === "model" && a.model_slug) return a.model_slug;
    return null;
  });
  const [models, setModels] = useState<{ slug: string; display_name: string }[]>([]);

  // Load active models from API (root only — models don't need the list)
  useEffect(() => {
    if (auth?.role === "root") {
      fetch("/api/models")
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.models?.length) {
            setModels(data.models.map((m: { slug?: string; model_slug?: string; display_name: string }) => ({
              slug: m.slug || m.model_slug,
              display_name: m.display_name,
            })));
            // Auto-select first model if none selected
            if (!currentModel && data.models.length > 0) {
              const first = data.models[0];
              setCurrentModel(first.slug || first.model_slug);
            }
          }
        })
        .catch(() => {
          // No fallback to hardcoded models — if API fails, empty list
        });
    }
  }, [auth?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const isRoot = auth?.role === "root";

  // Generic model ID (m1, m2...) — always derived from slug or auth
  const modelId = useMemo(
    () => toModelId(currentModel || auth?.model_slug || ""),
    [currentModel, auth?.model_slug]
  );

  // Stable ref — never changes
  const authHeaders = useCallback(() => {
    return { "Content-Type": "application/json" };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    currentModel, modelId, setCurrentModel, auth, isRoot, models, authHeaders,
  }), [currentModel, modelId, auth, isRoot, models, authHeaders]);

  return (
    <ModelContext.Provider value={contextValue}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  return useContext(ModelContext);
}
