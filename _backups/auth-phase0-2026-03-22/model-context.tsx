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
        if (parsed.role === "model" && parsed.model_slug) {
          setCurrentModel(parsed.model_slug);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Hardcoded models list (no API call needed for Phase 0)
  useEffect(() => {
    if (auth?.role === "root") {
      setModels([
        { slug: "yumi", display_name: "Yumi" },
        { slug: "ruby", display_name: "Ruby" },
      ]);
    }
  }, [auth?.role]);

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
