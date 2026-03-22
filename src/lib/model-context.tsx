"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { HeavenAuth } from "@/components/auth-guard";

interface ModelContextValue {
  /** Current selected model slug (null = all models for root) */
  currentModel: string | null;
  /** Set model (root only) */
  setCurrentModel: (slug: string | null) => void;
  /** Auth info */
  auth: HeavenAuth | null;
  /** Is root admin */
  isRoot: boolean;
  /** List of available models */
  models: { slug: string; display_name: string }[];
  /** Fetch headers with auth info */
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

  // Fetch available models for root
  useEffect(() => {
    if (auth?.role !== "root") return;

    fetch("/api/accounts", {
      headers: { "x-heaven-role": "root" },
    })
      .then(r => r.json())
      .then(d => {
        if (d.accounts) {
          const modelAccounts = d.accounts
            .filter((a: { role: string; model_slug: string }) => a.role === "model" && a.model_slug)
            .map((a: { model_slug: string; display_name: string }) => ({
              slug: a.model_slug,
              display_name: a.display_name,
            }));
          setModels(modelAccounts);
        }
      })
      .catch(() => {});
  }, [auth?.role]);

  const isRoot = auth?.role === "root";

  const authHeaders = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (auth) {
      h["x-heaven-role"] = auth.role;
      if (currentModel) h["x-heaven-model"] = currentModel;
      else if (auth.model_slug) h["x-heaven-model"] = auth.model_slug;
    }
    return h;
  }, [auth, currentModel]);

  return (
    <ModelContext.Provider value={{ currentModel, setCurrentModel, auth, isRoot, models, authHeaders }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  return useContext(ModelContext);
}
