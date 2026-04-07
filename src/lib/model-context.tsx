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
  ready: boolean; // true once auth has been read from sessionStorage
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

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<HeavenAuth | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [models, setModels] = useState<{ slug: string; display_name: string }[]>([]);
  const [ready, setReady] = useState(false);

  // Read auth from sessionStorage ONCE on mount (client-only, avoids SSR mismatch)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("heaven_auth");
      if (raw) {
        const parsed: HeavenAuth = JSON.parse(raw);
        setAuth(parsed);
        if (parsed.role === "model" && parsed.model_slug) {
          setCurrentModel(parsed.model_slug);
        }
      }
    } catch { /* ignore corrupt storage */ }
    setReady(true);
  }, []);

  // Load active models from API (root only)
  useEffect(() => {
    if (!ready) return;
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
        .catch(() => {});
    }
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
  }), [currentModel, modelId, auth, isRoot, models, authHeaders, ready]);

  return (
    <ModelContext.Provider value={contextValue}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  return useContext(ModelContext);
}
