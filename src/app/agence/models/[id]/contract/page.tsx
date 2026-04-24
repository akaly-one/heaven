"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { toModelId } from "@/lib/model-utils";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { ContractVersionsList } from "@/components/cockpit/models/contract-versions-list";
import { ContractGenerator } from "@/components/cockpit/models/contract-generator";
import { BusinessDossierForm } from "@/components/cockpit/models/business-dossier-form";
import type {
  ContractIdentityPlan,
  ContractMode,
  ContractPalier,
  ContractStatut,
} from "@/shared/templates/contract-templates";

interface ContractModel {
  model_id: string;
  slug?: string | null;
  display_name?: string | null;
  mode_operation: ContractMode | null;
  identity_plan: ContractIdentityPlan;
  palier_remuneration: ContractPalier;
  statut_initial: ContractStatut | null;
  contract_signed_at?: string | null;
  contract_url?: string | null;
}

/**
 * Agent 7.C — Contract tab (versioning + generator + dossier Mode C).
 */
export default function ModelContractPage() {
  const params = useParams();
  const rawId = String(params.id || "");
  const modelId = toModelId(rawId);
  const { isRoot, auth, authHeaders } = useModel();
  const isAdmin = isRoot || String(auth?.model_slug || "").toLowerCase() === "yumi";

  const [tab, setTab] = useState<"versions" | "generate" | "dossier">("versions");
  const [model, setModel] = useState<ContractModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<number>(0);
  const [refreshToken, setRefreshToken] = useState(0);

  const loadModel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agence/models/${modelId}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur chargement");
        return;
      }
      setModel(data.model as ContractModel);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur reseau");
    } finally {
      setLoading(false);
    }
  }, [modelId, authHeaders]);

  const loadLatestVersion = useCallback(async () => {
    try {
      const res = await fetch(`/api/agence/models/${modelId}/contract`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      const maxV = Array.isArray(data.versions) && data.versions.length > 0
        ? Math.max(...data.versions.map((x: { version: number }) => x.version))
        : 0;
      setLatestVersion(maxV);
    } catch {
      /* ignore */
    }
  }, [modelId, authHeaders]);

  useEffect(() => {
    loadModel();
    loadLatestVersion();
  }, [loadModel, loadLatestVersion]);

  const tabs = [
    { id: "versions", label: "Historique" },
    { id: "generate", label: "Generer" },
    { id: "dossier", label: "Dossier Mode C" },
  ];

  const pseudo = model?.slug || model?.display_name || modelId;

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="flex items-center gap-3 fade-up">
            <Link
              href={`/agence/models/${modelId}/dossier`}
              className="inline-flex items-center gap-1 text-[12px]"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft size={14} />
              Retour dossier
            </Link>
          </div>

          <header className="space-y-1">
            <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              Contrat : {pseudo}
            </h1>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Bucket prive <code>contracts-private</code> · versioning append-only
              (migration 045).
            </p>
          </header>

          <nav className="flex flex-wrap gap-2">
            <NavLink href={`/agence/models/${modelId}/dossier`}>
              Dossier
            </NavLink>
            <NavLink href={`/agence/models/${modelId}/contract`} active>
              Contrat
            </NavLink>
            <NavLink href={`/agence/models/${modelId}/dmca`}>
              Release Form
            </NavLink>
          </nav>

          {loading ? (
            <div
              className="flex items-center gap-2 text-[12px]"
              style={{ color: "var(--text-muted)" }}
            >
              <Loader2 size={14} className="animate-spin" /> Chargement...
            </div>
          ) : error ? (
            <div
              className="rounded-md px-3 py-2 text-[12px]"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
            >
              {error}
            </div>
          ) : !model ? (
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              Modele introuvable.
            </p>
          ) : (
            <>
              <Tabs
                tabs={tabs}
                activeTab={tab}
                onTabChange={(id) => setTab(id as typeof tab)}
              />

              <TabPanel id="versions" activeTab={tab}>
                <ContractVersionsList
                  modelId={modelId}
                  authHeaders={authHeaders}
                  refreshToken={refreshToken}
                />
              </TabPanel>

              <TabPanel id="generate" activeTab={tab}>
                {isAdmin ? (
                  <ContractGenerator
                    modelId={modelId}
                    pseudo={pseudo}
                    mode={model.mode_operation}
                    identityPlan={model.identity_plan}
                    palier={model.palier_remuneration}
                    statutInitial={model.statut_initial}
                    currentVersion={latestVersion}
                    authHeaders={authHeaders}
                    onUploaded={() => {
                      loadLatestVersion();
                      loadModel();
                      setRefreshToken((t) => t + 1);
                    }}
                  />
                ) : (
                  <p
                    className="text-[12px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Generation reservee admin (scope contract:view).
                  </p>
                )}
              </TabPanel>

              <TabPanel id="dossier" activeTab={tab}>
                <BusinessDossierForm
                  modelId={modelId}
                  pseudo={pseudo}
                  isAdmin={isAdmin}
                  authHeaders={authHeaders}
                  onSaved={() => loadModel()}
                />
              </TabPanel>
            </>
          )}
        </div>
      </div>
    </OsLayout>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-[11px] font-medium transition"
      style={{
        background: active ? "var(--accent)" : "var(--surface)",
        color: active ? "white" : "var(--text-muted)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </Link>
  );
}
