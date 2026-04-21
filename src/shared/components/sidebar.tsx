"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ChevronLeft, ChevronRight,
  Crown, Settings, LogOut,
  MessageCircle, Instagram, Images, Target, Activity,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { HeavenAuth } from "./auth-guard";
import { ThemeToggle } from "./theme-toggle";

// ── Navigation — D-1 Option 1 (sidebar 1:1 pages) ──
// B1 : Architecture retiré du top-level (déplacé dans Settings/Dev Center — Agent 2.C)
// B7 : « Contacts » retiré — Messagerie absorbe le CRM fans.
// B9 : Dashboard = index CP (/agence), couronne = raccourci cliquable.
// Pages dédiées /agence/contenu et /agence/strategie (Phase 2.B les remplira).
// NAV_MAIN : visible à tous les rôles (paloma/ruby/yumi/root).
// Settings inclus car chaque rôle a ses propres tabs :
//  - model (paloma/ruby) : Général + Finances + Agent DM
//  - admin (root/yumi) : Général + Comptes + Dev Center
// Le scoping intra-page est géré dans /agence/settings (visibleTabs filter).
const NAV_MAIN = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/agence", color: "#E63329" },
  { id: "messagerie", label: "Messagerie", icon: MessageCircle, href: "/agence/messagerie", color: "#8B5CF6" },
  { id: "instagram", label: "Instagram", icon: Instagram, href: "/agence/instagram", color: "#E1306C" },
  { id: "contenu", label: "Contenu", icon: Images, href: "/agence/contenu", color: "#D4AF37" },
  { id: "strategie", label: "Stratégie", icon: Target, href: "/agence/strategie", color: "#10B981" },
  { id: "settings", label: "Paramètres", icon: Settings, href: "/agence/settings", color: "#94A3B8" },
] as const;

// Root-only bloc : Ops uniquement (destiné à root + yumi admin).
// Settings migré vers NAV_MAIN ci-dessus (accessible à paloma/ruby pour leurs tabs scopés).
const NAV_ROOT = [
  { id: "ops", label: "Ops", icon: Activity, href: "/agence/ops", color: "#06B6D4", rootOnly: true },
] as const;

// Mobile bottom nav — alignée avec desktop.
const MOBILE_NAV_MAIN = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard, href: "/agence" },
  { id: "messagerie", label: "Messages", icon: MessageCircle, href: "/agence/messagerie" },
  { id: "instagram", label: "Insta", icon: Instagram, href: "/agence/instagram" },
  { id: "contenu", label: "Contenu", icon: Images, href: "/agence/contenu" },
  { id: "strategie", label: "Stratégie", icon: Target, href: "/agence/strategie" },
  { id: "settings", label: "Paramètres", icon: Settings, href: "/agence/settings" },
] as const;

// Mobile root-only : Ops uniquement.
const MOBILE_NAV_ROOT = [
  { id: "ops", label: "Ops", icon: Activity, href: "/agence/ops" },
] as const;

function useAuth(): HeavenAuth | null {
  const [auth, setAuth] = useState<HeavenAuth | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("heaven_auth");
      if (raw) setAuth(JSON.parse(raw));
    } catch {}
  }, []);
  return auth;
}

// ── D-3 : expanded default + toggle persistant via localStorage ──
// Key : heaven_sidebar_expanded (true/false). SSR safe via useEffect hydration.
const SIDEBAR_LS_KEY = "heaven_sidebar_expanded";
const DEFAULT_EXPANDED = true;

function usePersistentExpanded(): [boolean, (next: boolean) => void] {
  // Start collapsed = false (= expanded), puis corrige après hydration si LS diffère.
  // NOTE : on initialise à DEFAULT_EXPANDED pour éviter flash ; un mismatch SSR/CSR
  // peut apparaître si LS contient "false" mais React 18 tolère ce type de mismatch
  // sur un attribut visuel non critique. Pour éviter warning : on hydrate dans useEffect.
  const [expanded, setExpandedState] = useState<boolean>(DEFAULT_EXPANDED);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SIDEBAR_LS_KEY);
      if (raw === "true" || raw === "false") {
        setExpandedState(raw === "true");
      }
    } catch {}
    setHydrated(true);
  }, []);

  const setExpanded = useCallback((next: boolean) => {
    setExpandedState(next);
    try {
      window.localStorage.setItem(SIDEBAR_LS_KEY, String(next));
    } catch {}
  }, []);

  // Avant hydration on garde DEFAULT_EXPANDED (évite flash).
  return [hydrated ? expanded : DEFAULT_EXPANDED, setExpanded];
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const isRoot = auth?.role === "root";
  const [expanded, setExpanded] = usePersistentExpanded();
  const collapsed = !expanded;

  const handleLogout = () => {
    // Clear ALL heaven_* keys from both storages
    [sessionStorage, localStorage].forEach(store => {
      const keysToRemove: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key && key.startsWith("heaven_")) keysToRemove.push(key);
      }
      keysToRemove.forEach(k => store.removeItem(k));
    });
    router.push("/login");
  };

  const visibleRoot = isRoot ? NAV_ROOT : [];

  const renderNavItem = (item: { id: string; label: string; icon: any; href: string; color: string }) => {
    // Active = pathname strict ou prefix (sauf /agence qui doit être exact pour ne pas s'activer partout)
    const isDashboard = item.href === "/agence";
    const isActive = isDashboard
      ? pathname === "/agence"
      : pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <a key={item.id} href={item.href}
        className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all no-underline"
        style={{
          background: isActive ? "rgba(230,51,41,0.10)" : "transparent",
          color: isActive ? "var(--accent)" : "var(--text-muted)",
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget.style.background = "rgba(0,0,0,0.05)"); }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget.style.background = "transparent"); }}>
        <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
        {!collapsed && <span className="text-[13px] font-medium">{item.label}</span>}
      </a>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 h-screen z-40 hidden md:flex flex-col py-4 transition-all duration-200"
        style={{
          width: collapsed ? 56 : 200,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          boxShadow: collapsed ? "none" : "4px 0 24px rgba(0,0,0,0.06)",
        }}>

        {/* Logo — B9 : couronne cliquable → raccourci /agence */}
        <a
          href="/agence"
          aria-label="Accueil dashboard"
          className="flex items-center justify-center mb-5 no-underline"
          style={{ cursor: "pointer" }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-105" style={{ background: "#E63329" }}>
            <Crown className="w-4 h-4" style={{ color: "#fff" }} />
          </div>
          {!collapsed && (
            <span className="ml-2 text-[10px] font-bold tracking-widest" style={{ color: "var(--text-muted)" }}>
              HEAVEN
            </span>
          )}
        </a>

        {/* Model badge */}
        {!collapsed && auth && (
          <div className="px-3 mb-4">
            <div className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center"
              style={{ background: "rgba(230,51,41,0.12)", color: "#E63329" }}>
              {isRoot ? "Admin" : auth.display_name}
            </div>
          </div>
        )}

        {/* Nav — Main (5 pages CP) */}
        <nav className="flex-1 flex flex-col px-2 overflow-y-auto">
          <div className="flex flex-col gap-0.5">
            {NAV_MAIN.map(renderNavItem)}
          </div>

          {/* Nav — Root tools (Ops + Settings) */}
          {visibleRoot.length > 0 && (
            <div className="flex flex-col gap-0.5 mt-4">
              {!collapsed && (
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 mb-1" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                  Admin
                </span>
              )}
              {collapsed && <div className="mx-auto my-1.5 w-5 border-t" style={{ borderColor: "var(--border)" }} />}
              {visibleRoot.map(renderNavItem)}
            </div>
          )}
        </nav>

        {/* Logout */}
        <button onClick={handleLogout}
          className="flex items-center gap-3 mx-2 px-2.5 py-2 rounded-lg transition-all cursor-pointer mb-2"
          style={{ background: "none", border: "none", color: "var(--text-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-xs font-medium">Déconnexion</span>}
        </button>

        {/* Theme toggle */}
        <div className="flex items-center justify-center mb-1">
          <ThemeToggle size="sm" />
        </div>

        {/* Toggle expanded/collapsed — persisté via localStorage */}
        <button
          onClick={() => setExpanded(!expanded)}
          aria-label={collapsed ? "Déplier sidebar" : "Replier sidebar"}
          aria-pressed={!collapsed}
          className="mx-auto w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
          style={{ color: "var(--text-muted)", background: "rgba(0,0,0,0.04)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}>
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Desktop overlay when expanded : click-out referme UNIQUEMENT sans persister.
          On ne touche pas au LS ici pour respecter l'intention « toggle persistant » = toggle manuel bouton.
          Comportement : click-out ferme temporairement ; prochaine session garde la préférence LS. */}
      {!collapsed && (
        <div className="fixed inset-0 z-30 hidden md:block"
          onClick={() => setExpanded(false)}
          style={{ background: "rgba(0,0,0,0.04)" }} />
      )}

      {/* Mobile bottom nav — scroll horizontal pour accommoder 6-8 items sans déformation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-area-bottom"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <div
          className="flex items-center gap-0.5 py-1.5 overflow-x-auto scroll-smooth snap-x snap-mandatory px-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {MOBILE_NAV_MAIN.map((item) => {
            const isDashboard = item.href === "/agence";
            const active = isDashboard
              ? pathname === "/agence"
              : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <a key={item.id} href={item.href}
                className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg no-underline transition-colors flex-shrink-0 snap-start"
                style={{
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  background: active ? "rgba(230,51,41,0.08)" : "transparent",
                  minWidth: 58,
                }}>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold leading-none whitespace-nowrap">{item.label}</span>
              </a>
            );
          })}
          {/* Root tools inline */}
          {isRoot && MOBILE_NAV_ROOT.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <a key={item.id} href={item.href}
                className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg no-underline transition-colors flex-shrink-0 snap-start"
                style={{
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  background: active ? "rgba(230,51,41,0.08)" : "transparent",
                  minWidth: 58,
                }}>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold leading-none whitespace-nowrap">{item.label}</span>
              </a>
            );
          })}
          {/* Logout */}
          <button onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors cursor-pointer flex-shrink-0 snap-start"
            style={{ color: "var(--text-muted)", background: "none", border: "none", minWidth: 58 }}>
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-semibold leading-none whitespace-nowrap">Quitter</span>
          </button>
        </div>
      </nav>
    </>
  );
}
