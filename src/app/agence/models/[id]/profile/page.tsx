"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, User, Shield, FileSignature } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { toModelId } from "@/lib/model-utils";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { IdentityPlanPanel } from "@/components/cockpit/models/identity-plan-panel";
import { PalierRemunerationPanel } from "@/components/cockpit/models/palier-remuneration-panel";
import { StatutInitialCard } from "@/components/cockpit/models/statut-initial-card";

type IdentityPlan = "discovery" | "shadow";
type Palier = "P1" | "P2" | "P3" | "P4";
type Mode = "A" | "B" | "C";
type Statut = "salariee" | "etudiante" | "chomage" | "sans_activite" | "pensionnee";

interface ModelProfile {
  model_id: string;
  slug?: string | null;
  display_name?: string | null;
  mode_operation: Mode | null;
  identity_plan: IdentityPlan;
  palier_remuneration: Palier;
  fiscal_voie: string | null;
  statut_initial: Statut | null;
  statut_initial_verified: boolean;
  release_form_status?: string | null;
  contract_signed_at?: string | null;
  revenue_monthly_avg_3m?: number | null;
}

interface LatestCommission {
  palier_escalation_triggered?: boolean;
  part_modele?: number | null;
  part_sqwensy?: number | null;
  net_distribuable?: number | null;
}

/**
 * Agent 7.C — Model Profile page (tabs Profile, Contrat, Release Form, Dossier).
 *
 * Tab principale "general" : Plan Identite + Palier + Statut initial.
 * Les autres tabs renvoient vers les sous-pages dediees ou ouvrent une
 * sous-section interne.
 */
export default function ModelProfilePage() {
  const params = useParams();
  const rawId = String(params.id || "");
  const modelId = toModelId(rawId);
  const { isRoot, auth, authHeaders } = useModel();
  const isAdmin = isRoot || String(auth?.model_slug || "").toLowerCase() === "yumi";

  const [tab, setTab] = useState<"general" | "plan" | "palier" | "statut">("general");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ModelProfile | null>(null);
  const [commission, setCommission] = useState<LatestCommission | null>(null);

  const load = useCallback(async () => {
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
      setProfile(data.model as ModelProfile);
      setCommission(data.latest_commission || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur reseau");
    } finally {
      setLoading(false);
    }
  }, [modelId, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const pseudo = profile?.slug || profile?.display_name || modelId;

  const tabs = useMemo(
    () => [
      { id: "general", label: "General", icon: User },
      { id: "plan", label: "Plan Identite", icon: Shield },
      { id: "palier", label: "Palier", icon: FileSignature },
      { id: "statut", label: "Statut", icon: User },
    ],
    []
  );

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-3 fade-up">
            <Link
              href="/agence/clients"
              className="inline-flex items-center gap-1 text-[12px]"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft size={14} />
              Retour clients
            </Link>
          </div>

          {/* Header */}
          <header className="space-y-1">
            <h1
              className="text-lg font-bold"
              style={{ color: "var(--text)" }}
            >
              Modele : {pseudo}
            </h1>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Mode={profile?.mode_operation ?? "—"} · Plan=
              {profile?.identity_plan ?? "—"} · Palier=
              {profile?.palier_remuneration ?? "—"} · Release=
              {profile?.release_form_status ?? "—"}
            </p>
          </header>

          {/* Top-level navigation */}
          <nav className="flex flex-wrap gap-2">
            <NavLink href={`/agence/models/${modelId}/profile`} active>
              Profile
            </NavLink>
            <NavLink href={`/agence/models/${modelId}/contract`}>
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
              <Loader2 size={14} className="animate-spin" />
              Chargement...
            </div>
          ) : error ? (
            <div
              className="rounded-md px-3 py-2 text-[12px]"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
            >
              {error}
            </div>
          ) : !profile ? (
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

              <TabPanel id="general" activeTab={tab}>
                <div className="space-y-6">
                  <IdentityPlanPanel
                    modelId={modelId}
                    currentPlan={profile.identity_plan}
                    isAdmin={isAdmin}
                    authHeaders={authHeaders}
                    onUpdate={() => load()}
                  />
                  <PalierRemunerationPanel
                    modelId={modelId}
                    mode={profile.mode_operation}
                    currentPalier={profile.palier_remuneration}
                    revenueMonthlyAvg3m={profile.revenue_monthly_avg_3m ?? 0}
                    isEscalationTriggered={
                      Boolean(commission?.palier_escalation_triggered)
                    }
                    isAdmin={isAdmin}
                    authHeaders={authHeaders}
                    onEscalate={() => load()}
                  />
                  <StatutInitialCard
                    modelId={modelId}
                    currentStatut={profile.statut_initial}
                    verified={profile.statut_initial_verified}
                    isAdmin={isAdmin}
                    authHeaders={authHeaders}
                    onUpdate={() => load()}
                  />
                </div>
              </TabPanel>

              <TabPanel id="plan" activeTab={tab}>
                <IdentityPlanPanel
                  modelId={modelId}
                  currentPlan={profile.identity_plan}
                  isAdmin={isAdmin}
                  authHeaders={authHeaders}
                  onUpdate={() => load()}
                />
              </TabPanel>

              <TabPanel id="palier" activeTab={tab}>
                <PalierRemunerationPanel
                  modelId={modelId}
                  mode={profile.mode_operation}
                  currentPalier={profile.palier_remuneration}
                  revenueMonthlyAvg3m={profile.revenue_monthly_avg_3m ?? 0}
                  isEscalationTriggered={Boolean(
                    commission?.palier_escalation_triggered
                  )}
                  isAdmin={isAdmin}
                  authHeaders={authHeaders}
                  onEscalate={() => load()}
                />
              </TabPanel>

              <TabPanel id="statut" activeTab={tab}>
                <StatutInitialCard
                  modelId={modelId}
                  currentStatut={profile.statut_initial}
                  verified={profile.statut_initial_verified}
                  isAdmin={isAdmin}
                  authHeaders={authHeaders}
                  onUpdate={() => load()}
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
