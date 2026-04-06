"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { HeavenAuth } from "@/components/auth-guard";

interface ModelContextValue {
  currentModel: string | null;
  setCurrentModel: (slug: string | null) => void;
  auth: HeavenAuth | null;
  isRoot: boolean;
  models: { slug: string; display_name: string }[];
  authHeaders: () => Record<string, string>;
}

const ModelContext = createContext<ModelContextValue>({
  currentModel: null,
  setCurrentModel: () => {},
  auth: null,
  isRoot: false,
  models: [],
  authHeaders: () => ({}),
});

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<HeavenAuth | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [models, setModels] = useState<{ slug: string; display_name: string }[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("heaven_auth");
      if (raw) {
        const parsed: HeavenAuth = JSON.parse(raw);
        setAuth(parsed);

        // Models are locked to their own slug — NO fallback to another model
        if (parsed.role === "model" && parsed.model_slug) {
          setCurrentModel(parsed.model_slug);
        }
        // Root starts with no model selected — must pick from switcher
      }
    } catch { /* ignore */ }
  }, []);

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

  const authHeaders = useCallback(() => {
    return { "Content-Type": "application/json" };
  }, []);

  return (
    <ModelContext.Provider value={{ currentModel, setCurrentModel, auth, isRoot, models, authHeaders }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  return useContext(ModelContext);
}
