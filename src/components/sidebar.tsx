"use client";

import { usePathname } from "next/navigation";
import { Camera, Settings, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { id: "cockpit", label: "Cockpit", icon: Camera, href: "/agence", color: "#E84393" },
  { id: "admin", label: "Admin", icon: Settings, href: "/admin", color: "#64748B" },
];

function useScope(): string[] {
  const [scope, setScope] = useState<string[]>(["*"]);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("heaven_auth");
      if (raw) { const auth = JSON.parse(raw); setScope(auth.scope || ["*"]); }
    } catch { /* default */ }
  }, []);
  return scope;
}

export function Sidebar() {
  const pathname = usePathname();
  const scope = useScope();
  const isAdmin = scope.includes("*");
  const [collapsed, setCollapsed] = useState(true);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 h-screen z-40 hidden md:flex flex-col py-4 transition-all duration-200"
        style={{
          width: collapsed ? 60 : 180,
          background: "#0C0C14",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <a href="/agence" className="flex items-center justify-center mb-6 no-underline">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #C9A84C, #D4AF37, #E8C76A)", boxShadow: "0 0 20px rgba(201,168,76,0.25)" }}>
            <Zap className="w-4 h-4" style={{ color: "#06060B" }} />
          </div>
          {!collapsed && <span className="ml-2 text-xs font-bold shimmer-gold">HEAVEN</span>}
        </a>

        <nav className="flex-1 flex flex-col gap-1 px-2">
          {NAV_ITEMS.filter(i => isAdmin || scope.some(s => i.href === s || i.href.startsWith(s + "/"))).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <a key={item.id} href={item.href}
                className="flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all no-underline hover:opacity-80"
                style={{
                  background: isActive ? `${item.color}20` : "transparent",
                  color: isActive ? item.color : "#8E8EA3",
                }}>
                <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                {!collapsed && <span className="text-xs font-medium">{item.label}</span>}
              </a>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-auto w-6 h-6 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.06)", color: "#8E8EA3" }}>
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile bottom tab */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-area-bottom"
        style={{ background: "#0C0C14", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.filter(i => isAdmin || scope.some(s => i.href === s || i.href.startsWith(s + "/"))).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <a key={item.id} href={item.href}
                className="flex flex-col items-center gap-0.5 px-3 py-1 no-underline"
                style={{ color: isActive ? item.color : "#8E8EA3" }}>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
