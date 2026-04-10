"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, ChevronLeft, ChevronRight,
  Crown, Settings, Target, LogOut, DollarSign,
  Zap, Network,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { HeavenAuth } from "./auth-guard";
import { ThemeToggle } from "./theme-toggle";

// ── Navigation — 4 model pages + root tools ──
const NAV_MAIN = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/agence", color: "#E63329" },
  { id: "clients", label: "Clients", icon: Users, href: "/agence/clients", color: "#F59E0B" },
  { id: "strategie", label: "Stratégie", icon: Target, href: "/agence/strategie", color: "#10B981" },
] as const;

const NAV_ROOT = [
  { id: "finances", label: "Finances", icon: DollarSign, href: "/agence/finances", color: "#22C55E", rootOnly: true },
  { id: "automation", label: "Automation", icon: Zap, href: "/agence/automation", color: "#EAB308", rootOnly: true },
  { id: "architecture", label: "Architecture", icon: Network, href: "/agence/architecture", color: "#64748B", rootOnly: true },
  { id: "settings", label: "Settings", icon: Settings, href: "/agence/settings", color: "#94A3B8", rootOnly: true },
] as const;

// Mobile bottom nav — all pages in horizontal scroll
const MOBILE_NAV_MAIN = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard, href: "/agence" },
  { id: "clients", label: "Clients", icon: Users, href: "/agence/clients" },
  { id: "strategie", label: "Stratégie", icon: Target, href: "/agence/strategie" },
] as const;

const MOBILE_NAV_ROOT = [
  { id: "finances", label: "Finances", icon: DollarSign, href: "/agence/finances" },
  { id: "automation", label: "Auto", icon: Zap, href: "/agence/automation" },
  { id: "architecture", label: "Archi", icon: Network, href: "/agence/architecture" },
  { id: "settings", label: "Settings", icon: Settings, href: "/agence/settings" },
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
    const isActive = pathname === item.href || (item.href !== "/agence" && pathname.startsWith(item.href));
    const isDashActive = item.href === "/agence" && pathname === "/agence";
    const active = isActive || isDashActive;
    return (
      <a key={item.id} href={item.href}
        className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all no-underline"
        style={{
          background: active ? "rgba(230,51,41,0.10)" : "transparent",
          color: active ? "var(--accent)" : "var(--text-muted)",
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget.style.background = "rgba(0,0,0,0.05)"); }}
        onMouseLeave={e => { if (!active) (e.currentTarget.style.background = "transparent"); }}>
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

        {/* Logo */}
        <div className="flex items-center justify-center mb-5">
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
          <div className="px-3 mb-4">
            <div className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center"
              style={{ background: "rgba(230,51,41,0.12)", color: "#E63329" }}>
              {isRoot ? "Admin" : auth.display_name}
            </div>
          </div>
        )}

        {/* Nav — Main (model pages) */}
        <nav className="flex-1 flex flex-col px-2 overflow-y-auto">
          <div className="flex flex-col gap-0.5">
            {NAV_MAIN.map(renderNavItem)}
          </div>

          {/* Nav — Root tools */}
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

        <button onClick={() => setCollapsed(!collapsed)}
          className="mx-auto w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
          style={{ color: "var(--text-muted)", background: "rgba(0,0,0,0.04)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}>
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Desktop overlay when expanded */}
      {!collapsed && (
        <div className="fixed inset-0 z-30 hidden md:block"
          onClick={() => setCollapsed(true)}
          style={{ background: "rgba(0,0,0,0.04)" }} />
      )}

      {/* Mobile bottom nav — centered, spread across full width */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-area-bottom"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center justify-evenly py-2">
          {MOBILE_NAV_MAIN.map((item) => {
            const active = item.href === "/agence"
              ? pathname === "/agence"
              : pathname.startsWith(item.href);
            return (
              <a key={item.id} href={item.href}
                className="flex flex-col items-center gap-0.5 py-1 rounded-lg no-underline transition-colors"
                style={{
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  background: active ? "rgba(230,51,41,0.08)" : "transparent",
                  minWidth: 52,
                }}>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </a>
            );
          })}
          {/* Root pages inline (no separator) */}
          {isRoot && MOBILE_NAV_ROOT.slice(0, 2).map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <a key={item.id} href={item.href}
                className="flex flex-col items-center gap-0.5 py-1 rounded-lg no-underline transition-colors"
                style={{
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  background: active ? "rgba(230,51,41,0.08)" : "transparent",
                  minWidth: 52,
                }}>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </a>
            );
          })}
          {/* Logout */}
          <button onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 py-1 rounded-lg transition-colors cursor-pointer"
            style={{ color: "var(--text-muted)", background: "none", border: "none", minWidth: 52 }}>
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Quitter</span>
          </button>
        </div>
      </nav>
    </>
  );
}
