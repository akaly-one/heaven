"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, DollarSign, Settings, ChevronLeft, ChevronRight, Crown, Map } from "lucide-react";
import { useState, useEffect } from "react";
import type { HeavenAuth } from "./auth-guard";

// ── Only essential pages ──
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/agence", color: "#E63329" },
  { id: "clients", label: "Clients", icon: Users, href: "/agence/clients", color: "#F59E0B" },
  { id: "finances", label: "Finances", icon: DollarSign, href: "/agence/finances", color: "#10B981" },
  { id: "settings", label: "Reglages", icon: Settings, href: "/agence/settings", color: "#64748B" },
  { id: "architecture", label: "Archi", icon: Map, href: "/agence/architecture", color: "#8B5CF6", rootOnly: true },
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
  const auth = useAuth();
  const isRoot = auth?.role === "root";
  const isAdmin = (auth?.scope || ["*"]).includes("*");
  const [collapsed, setCollapsed] = useState(true);

  const visibleItems = NAV_ITEMS.filter(item => {
    if ("rootOnly" in item && item.rootOnly && !isRoot) return false;
    return isAdmin || auth?.role === "model";
  });

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 h-screen z-40 hidden md:flex flex-col py-4 transition-all duration-200"
        style={{ width: collapsed ? 56 : 170, background: "var(--surface)", borderRight: "1px solid var(--border)" }}>

        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E63329" }}>
            <Crown className="w-4 h-4" style={{ color: "#fff" }} />
          </div>
          {!collapsed && <span className="ml-2 text-[10px] font-bold tracking-widest text-white/50">HEAVEN</span>}
        </div>

        {/* Model badge */}
        {!collapsed && auth && (
          <div className="px-3 mb-4">
            <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center"
              style={{ background: "rgba(230,51,41,0.12)", color: "#E63329" }}>
              {isRoot ? "Admin" : auth.display_name}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/agence" && pathname.startsWith(item.href));
            const isDashActive = item.href === "/agence" && pathname === "/agence";
            const active = isActive || isDashActive;
            return (
              <a key={item.id} href={item.href}
                className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all no-underline"
                style={{
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  color: active ? "var(--accent)" : "var(--text-muted)",
                }}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="text-xs font-medium">{item.label}</span>}
              </a>
            );
          })}
        </nav>

        <button onClick={() => setCollapsed(!collapsed)}
          className="mx-auto w-6 h-6 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10"
          style={{ color: "var(--text-muted)" }}>
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile bottom tab */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-area-bottom"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center justify-around py-2.5">
          {visibleItems.filter(item => !("rootOnly" in item && item.rootOnly)).map((item) => {
            const isActive = pathname === item.href || (item.href !== "/agence" && pathname.startsWith(item.href));
            const isDashActive = item.href === "/agence" && pathname === "/agence";
            const active = isActive || isDashActive;
            return (
              <a key={item.id} href={item.href}
                className="flex flex-col items-center gap-0.5 px-3 py-1 no-underline"
                style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}>
                <item.icon className="w-5 h-5" />
                <span className="text-[9px] font-medium">{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
