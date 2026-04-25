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

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, User } from "lucide-react";
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
  const { auth, isRoot, currentModel } = useModel();
  const displayName = auth?.display_name || modelSlug?.toUpperCase() || "HEAVEN";

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
        {/* LEFT : Logo + UserNameDropdown (pseudo cliquable → menu Voir CP/Profil) */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          {isRoot && (
            <RootCpSelector variant="inline" fallbackLabel={displayName} />
          )}
          {!isRoot && (
            <UserNameDropdown
              displayName={displayName}
              modelSlug={modelSlug || currentModel || auth?.model_slug || undefined}
            />
          )}
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

        {/* RIGHT : (espace réservé pour notifications/messages future Phase 3) */}
        <div className="flex items-center gap-1 shrink-0" />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// UserNameDropdown — pseudo cliquable avec menu "Voir CP" / "Voir Profil" / Logout
// NB 2026-04-25 : "manque un bouton important c'est voir cp quand la modele est
// connecté et se trouve en profil ou inversement et ca doit etre un sous bouton
// qui apparait en apuyant sur le pseado en header"
// ════════════════════════════════════════════════════════════════════════════

interface UserNameDropdownProps {
  displayName: string;
  /** Slug pour construire le lien /m/[slug]. Si omis, "Voir Profil" est masqué. */
  modelSlug?: string;
}

function UserNameDropdown({ displayName, modelSlug }: UserNameDropdownProps) {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Détecte le contexte courant pour décider quelle option proposer
  const onProfile = pathname.startsWith("/m/");
  const onCockpit = pathname.startsWith("/agence");
  const profileHref = modelSlug ? `/m/${modelSlug.toLowerCase()}` : null;

  // Click outside → fermeture
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Echap → fermeture
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 text-xs sm:text-sm font-bold tracking-wide uppercase truncate cursor-pointer bg-transparent border-none p-0 transition-opacity hover:opacity-80"
        style={{ color: "var(--text)", letterSpacing: "0.08em" }}
      >
        {displayName}
        <ChevronDown
          className="w-3 h-3 opacity-50 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 mt-2 min-w-[180px] rounded-xl py-1 z-50"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            animation: "fadeUp 0.15s ease-out",
          }}
        >
          {/* Voir CP — visible si on n'est PAS dans /agence */}
          {!onCockpit && (
            <Link
              href="/agence"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium no-underline transition-colors hover:bg-white/[0.04]"
              style={{ color: "var(--text)" }}
            >
              <LayoutDashboard className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              <span>Voir le CP</span>
            </Link>
          )}

          {/* Voir Profil — visible si on n'est PAS dans /m/[slug] et qu'on a un slug */}
          {!onProfile && profileHref && (
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium no-underline transition-colors hover:bg-white/[0.04]"
              style={{ color: "var(--text)" }}
            >
              <User className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              <span>Voir le profil public</span>
            </Link>
          )}

          {/* Séparateur */}
          {(!onCockpit || (!onProfile && profileHref)) && (
            <div className="my-1 mx-3" style={{ borderTop: "1px solid var(--border)" }} />
          )}

          {/* Logout */}
          <button
            role="menuitem"
            onClick={() => { setOpen(false); handleLogout(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium cursor-pointer bg-transparent border-none transition-colors hover:bg-white/[0.04]"
            style={{ color: "var(--text-muted)" }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
