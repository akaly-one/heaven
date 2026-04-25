"use client";

/**
 * HeavenAdminHeader — BRIEF-18 Phase 2
 * ────────────────────────────────────
 * Header admin unifié pour root (m0) + modèles (m1=Yumi, m2=Paloma, m3=Ruby...).
 *
 * Comportement context-aware :
 * - "cockpit"        → render <AgenceHeader> existant (zero régression)
 * - "messagerie"     → render <Header> CP existant
 * - "stats"          → render <Header> CP existant
 * - "settings"       → render <Header> CP existant
 * - "profile-public" → render header léger custom (cas /m/[slug] avec admin connecté)
 *
 * Le contexte "profile-public" est le NOUVEAU cas où NB veut un header admin
 * cohérent partout : quand l'admin navigue sur /m/[slug] depuis le CP ou via
 * lien direct, il voit le même header (pas le HeaderBar visiteur).
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useModel } from "@/lib/model-context";
import { RootCpSelector } from "@/components/cockpit/root-cp-selector";
import {
  AgenceHeader,
  type AgenceHeaderProps,
} from "@/components/cockpit/dashboard/agence-header";

export type HeavenAdminContext =
  | "cockpit"
  | "profile-public"
  | "messagerie"
  | "stats"
  | "settings";

export interface HeavenAdminHeaderProps {
  context?: HeavenAdminContext;
  /** Slug modèle actif (utilisé en context="profile-public") */
  modelSlug?: string;
  /** Props passées à <AgenceHeader> en context="cockpit" */
  agenceProps?: AgenceHeaderProps;
  /** Slot pour boutons additionnels (édit photo/banner sur /m/[slug] admin) */
  extraActions?: ReactNode;
}

export function HeavenAdminHeader(props: HeavenAdminHeaderProps) {
  const ctx = props.context ?? "profile-public";

  // ── Context "cockpit" : delegate vers <AgenceHeader> existant ──
  if (ctx === "cockpit" && props.agenceProps) {
    return <AgenceHeader {...props.agenceProps} />;
  }

  // ── Context "profile-public" : header léger admin sur /m/[slug] ──
  // Les autres contexts (messagerie, stats, settings) sont déjà couverts par
  // le <Header> legacy embarqué dans <OsLayout> ; on les laisse intacts pour
  // Phase 2 (zero régression). Phase 3 unifiera tout sous ce composant.
  return <ProfilePublicAdminHeader {...props} />;
}

// ════════════════════════════════════════════════════════════════════════════
// Sous-composant : header admin léger pour /m/[slug] quand admin connecté
// ════════════════════════════════════════════════════════════════════════════

function ProfilePublicAdminHeader({ modelSlug, extraActions }: HeavenAdminHeaderProps) {
  const { auth, isRoot } = useModel();
  const displayName = auth?.display_name || modelSlug?.toUpperCase() || "HEAVEN";

  const handleLogout = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("heaven_auth");
      sessionStorage.removeItem("heaven_auth");
      window.dispatchEvent(new Event("heaven:auth-changed"));
      window.location.href = "/agence";
    } catch {
      window.location.href = "/agence";
    }
  };

  return (
    <div
      className="sticky top-0 left-0 right-0 z-40 px-3 sm:px-5 md:px-8 lg:px-12 py-2"
      style={{
        background: "color-mix(in srgb, var(--bg) 90%, transparent)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* LEFT : Retour CP + Logo + Selector si root */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <Link
            href="/agence"
            aria-label="Retour cockpit"
            className="text-sm font-bold no-underline shrink-0 transition-opacity hover:opacity-80"
            style={{ color: "var(--accent)" }}
          >
            ←
          </Link>
          <span
            className="text-xs sm:text-sm font-bold tracking-wide uppercase truncate"
            style={{ color: "var(--text)", letterSpacing: "0.08em" }}
          >
            {isRoot ? <RootCpSelector variant="inline" fallbackLabel={displayName} /> : displayName}
          </span>
          <span
            className="hidden sm:inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0"
            style={{
              background: "rgba(212,175,55,0.12)",
              color: "var(--accent)",
              border: "1px solid rgba(212,175,55,0.25)",
            }}
            title="Mode admin actif"
          >
            ADMIN
          </span>
        </div>

        {/* CENTER : extraActions (édit photo/banner/save/cancel/preview) */}
        <div className="flex-1 flex items-center justify-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
          {extraActions}
        </div>

        {/* RIGHT : Avatar + Logout (position fixe — même endroit que login client) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleLogout}
            aria-label="Déconnexion"
            title="Déconnexion"
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all hover:brightness-110 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
