"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Settings, User, Users, Zap } from "lucide-react";
import { useModel } from "@/lib/model-context";
import { OsLayout } from "@/components/os-layout";
import { GeneralPanel } from "@/components/cockpit/settings/general-panel";
import { ComptesPanel } from "@/components/cockpit/settings/comptes-panel";
import { DevCenterPanel } from "@/components/cockpit/settings/dev-center-panel";

type TabId = "general" | "comptes" | "dev-center";

type DevSection = "architecture" | "config" | "migrations" | "ops";

const TABS: { id: TabId; label: string; icon: typeof Settings; adminOnly?: boolean }[] = [
  { id: "general", label: "Général", icon: User },
  { id: "comptes", label: "Comptes", icon: Users },
  { id: "dev-center", label: "Dev Center", icon: Zap, adminOnly: true },
];

function SettingsInner() {
  const { authHeaders, isRoot, auth, currentModel } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "";
  const isAgencyAdmin = isRoot || modelSlug === "yumi";
  const searchParams = useSearchParams();

  // Initial tab from ?tab=... query param (supports /agence/settings?tab=dev-center&section=architecture)
  const initialTab = (searchParams.get("tab") as TabId | null);
  const [tab, setTab] = useState<TabId>(initialTab && TABS.some((t) => t.id === initialTab) ? initialTab : "general");

  const devSectionParam = (searchParams.get("section") as DevSection | null) ?? undefined;

  // If deep-link requests dev-center but user is not admin, fall back to general
  useEffect(() => {
    if (tab === "dev-center" && !isAgencyAdmin) {
      setTab("general");
    }
  }, [tab, isAgencyAdmin]);

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAgencyAdmin);

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3 fade-up">
            <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
              <Settings className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>Paramètres</h1>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Profil modèle, comptes, console technique
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="segmented-control fade-up-1">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={tab === t.id ? "active" : ""}
              >
                <t.icon className="w-3.5 h-3.5 inline mr-1.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Panels */}
          <div className="fade-up-2">
            {tab === "general" && (
              <GeneralPanel modelSlug={modelSlug} isRoot={isRoot} authHeaders={authHeaders} />
            )}
            {tab === "comptes" && (
              <ComptesPanel
                isRoot={isRoot}
                isAgencyAdmin={isAgencyAdmin}
                currentModelSlug={modelSlug}
                authHeaders={authHeaders}
              />
            )}
            {tab === "dev-center" && isAgencyAdmin && (
              <DevCenterPanel authHeaders={authHeaders} initialSection={devSectionParam} />
            )}
          </div>
        </div>
      </div>
    </OsLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsInner />
    </Suspense>
  );
}
