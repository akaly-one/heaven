"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard, MessageCircle, Users, Image, ChevronLeft, ChevronRight,
  Crown, Settings, Target, LogOut, Workflow, DollarSign,
  FileText, Calculator, Zap, Network,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { HeavenAuth } from "./auth-guard";

// ── Navigation ──
const NAV_MAIN = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/agence", color: "#E63329" },
  { id: "messages", label: "Messages", icon: MessageCircle, href: "/agence/messages", color: "#F43F5E" },
  { id: "clients", label: "Clients", icon: Users, href: "/agence/clients", color: "#F59E0B" },
  { id: "pipeline", label: "Pipeline", icon: Workflow, href: "/agence/pipeline", color: "#6366F1" },
  { id: "media", label: "Media", icon: Image, href: "/agence/media", color: "#8B5CF6" },
  { id: "strategie", label: "Strategie", icon: Target, href: "/agence/strategie", color: "#10B981" },
  { id: "cms", label: "CMS", icon: FileText, href: "/agence/cms", color: "#0EA5E9" },
] as const;

const NAV_TOOLS = [
  { id: "simulateur", label: "Simulateur", icon: Calculator, href: "/agence/simulateur", color: "#F97316" },
  { id: "finances", label: "Finances", icon: DollarSign, href: "/agence/finances", color: "#22C55E", rootOnly: true },
  { id: "automation", label: "Automation", icon: Zap, href: "/agence/automation", color: "#EAB308", rootOnly: true },
  { id: "architecture", label: "Architecture", icon: Network, href: "/agence/architecture", color: "#64748B", rootOnly: true },
  { id: "settings", label: "Settings", icon: Settings, href: "/agence/settings", color: "#94A3B8", rootOnly: true },
] as const;

const NAV_ITEMS = [...NAV_MAIN, ...NAV_TOOLS];

// Mobile bottom nav — 5 most important items only
const MOBILE_NAV = [
  { id: "messages", label: "Messages", icon: MessageCircle, href: "/agence/messages" },
  { id: "clients", label: "Clients", icon: Users, href: "/agence/clients" },
  { id: "dashboard", label: "Home", icon: LayoutDashboard, href: "/agence" },
  { id: "pipeline", label: "Pipeline", icon: Workflow, href: "/agence/pipeline" },
  { id: "media", label: "Media", icon: Image, href: "/agence/media" },
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const isRoot = auth?.role === "root";
  const isAdmin = (auth?.scope || ["*"]).includes("*");
  const [collapsed, setCollapsed] = useState(true);

  const handleLogout = () => {
    sessionStorage.removeItem("heaven_auth");
    router.push("/login");
  };

  const filterItems = (items: readonly { id: string; label: string; icon: any; href: string; color: string; rootOnly?: boolean }[]) =>
    items.filter(item => {
      if (item.rootOnly && !isRoot) return false;
      return isAdmin || auth?.role === "model";
    });

  const visibleMain = filterItems(NAV_MAIN);
  const visibleTools = filterItems(NAV_TOOLS);

  const renderNavItem = (item: { id: string; label: string; icon: any; href: string; color: string }) => {
    const isActive = pathname === item.href || (item.href !== "/agence" && pathname.startsWith(item.href));
    const isDashActive = item.href === "/agence" && pathname === "/agence";
    const active = isActive || isDashActive;
    return (
      <a key={item.id} href={item.href}
        className="flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all no-underline"
        style={{
          background: active ? "rgba(230,51,41,0.10)" : "transparent",
          color: active ? "var(--accent)" : "var(--text-muted)",
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget.style.background = "rgba(0,0,0,0.05)"); }}
        onMouseLeave={e => { if (!active) (e.currentTarget.style.background = "transparent"); }}>
        <item.icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span className="text-xs font-medium">{item.label}</span>}
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

        {/* Logo */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E63329" }}>
            <Crown className="w-4 h-4" style={{ color: "#fff" }} />
          </div>
          {!collapsed && (
            <span className="ml-2 text-[10px] font-bold tracking-widest" style={{ color: "var(--text-muted)" }}>
              HEAVEN
            </span>
          )}
        </div>

        {/* Model badge */}
        {!collapsed && auth && (
          <div className="px-3 mb-3">
            <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center"
              style={{ background: "rgba(230,51,41,0.12)", color: "#E63329" }}>
              {isRoot ? "Admin" : auth.display_name}
            </div>
          </div>
        )}

        {/* Nav — Main group */}
        <nav className="flex-1 flex flex-col px-2 overflow-y-auto">
          <div className="flex flex-col gap-0.5">
            {!collapsed && (
              <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 mb-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                Principal
              </span>
            )}
            {visibleMain.map(renderNavItem)}
          </div>

          {/* Nav — Tools group */}
          {visibleTools.length > 0 && (
            <div className="flex flex-col gap-0.5 mt-3">
              {!collapsed && (
                <span className="text-[9px] font-semibold uppercase tracking-wider px-2.5 mb-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                  Outils
                </span>
              )}
              {collapsed && <div className="mx-auto my-1 w-5 border-t" style={{ borderColor: "var(--border)" }} />}
              {visibleTools.map(renderNavItem)}
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
          {!collapsed && <span className="text-xs font-medium">Deconnexion</span>}
        </button>

        <button onClick={() => setCollapsed(!collapsed)}
          className="mx-auto w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
          style={{ color: "var(--text-muted)", background: "rgba(0,0,0,0.04)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}>
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Desktop overlay backdrop when sidebar is expanded */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 hidden md:block"
          onClick={() => setCollapsed(true)}
          style={{ background: "rgba(0,0,0,0.04)" }}
        />
      )}

      {/* Mobile bottom tab — 5 key items, clean layout */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-area-bottom"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center justify-around py-2">
          {MOBILE_NAV.map((item) => {
            const active = item.href === "/agence"
              ? pathname === "/agence"
              : pathname.startsWith(item.href);
            return (
              <a key={item.id} href={item.href}
                className="flex flex-col items-center gap-0.5 px-2 py-1 no-underline"
                style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}>
                <item.icon className="w-5 h-5" />
                <span className="text-[8px] font-medium">{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
