"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Palette, Camera, Rocket, Wrench, Settings,
  ChevronLeft, ChevronRight, Zap, X, Sparkles, UserPlus, Key,
  Crown, Clock, Copy, Check, Users, ExternalLink, MessageCircle, Lock, Send,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

const NAV_ITEMS = [
  { id: "hq", label: "HQ", icon: LayoutDashboard, href: "/", color: "#6366F1" },
  { id: "studio", label: "Studio", icon: Palette, href: "/studio", color: "#C9A84C" },
  { id: "agence", label: "Agence", icon: Camera, href: "/agence", color: "#E84393" },
  { id: "brands", label: "Brands", icon: Rocket, href: "/brands", color: "#10B981" },
  { id: "jps", label: "JPS", icon: Wrench, href: "/client/jps", color: "#3B82F6" },
  { id: "admin", label: "Admin", icon: Settings, href: "/admin", color: "#64748B" },
  { id: "pilot", label: "PILOT", icon: Sparkles, href: "__pilot__", color: "#C9A84C" },
];

function useScope(): string[] {
  const [scope, setScope] = useState<string[]>(["*"]);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("sqwensy_auth");
      if (raw) { const auth = JSON.parse(raw); setScope(auth.scope || ["*"]); }
    } catch { /* default */ }
  }, []);
  return scope;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const scope = useScope();
  const isAdmin = scope.includes("*");
  const isModelMode = !isAdmin && scope.includes("/agence");
  const [collapsed, setCollapsed] = useState(true);
  const [radialOpen, setRadialOpen] = useState(false);
  const [pilotOpen, setPilotOpen] = useState(false);
  const [quickCodeOpen, setQuickCodeOpen] = useState(false);
  const [modelChatOpen, setModelChatOpen] = useState(false);

  // ── Draggable bubble position ──
  const [bubblePos, setBubblePos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, bx: 0, by: 0 });
  const moved = useRef(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Load saved position
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sqwensy_bubble_pos");
      if (saved) {
        const pos = JSON.parse(saved);
        // Validate position is within viewport
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (pos.x >= 0 && pos.x <= vw - 56 && pos.y >= 0 && pos.y <= vh - 56) {
          setBubblePos(pos);
        }
      }
    } catch { /* use default */ }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const pos = bubblePos || { x: window.innerWidth / 2 - 28, y: window.innerHeight - 80 };
    dragStart.current = { x: touch.clientX, y: touch.clientY, bx: pos.x, by: pos.y };
    dragging.current = true;
    moved.current = false;
  }, [bubblePos]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.current.x;
    const dy = touch.clientY - dragStart.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved.current = true;
    const newX = Math.max(0, Math.min(window.innerWidth - 56, dragStart.current.bx + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 56, dragStart.current.by + dy));
    setBubblePos({ x: newX, y: newY });
  }, []);

  const handleTouchEnd = useCallback(() => {
    dragging.current = false;
    if (bubblePos) {
      try { localStorage.setItem("sqwensy_bubble_pos", JSON.stringify(bubblePos)); } catch { /* silent */ }
    }
    if (!moved.current) {
      setRadialOpen((prev) => !prev);
    }
  }, [bubblePos]);

  const defaultPos = { x: typeof window !== "undefined" ? window.innerWidth / 2 - 28 : 160, y: typeof window !== "undefined" ? window.innerHeight - 80 : 700 };
  const pos = bubblePos || defaultPos;

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
        <a href="/" className="flex items-center justify-center mb-6 no-underline">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #C9A84C, #D4AF37, #E8C76A)", boxShadow: "0 0 20px rgba(201,168,76,0.25)" }}>
            <Zap className="w-4 h-4" style={{ color: "#06060B" }} />
          </div>
          {!collapsed && <span className="ml-2 text-xs font-bold shimmer-gold">SQWENSY OS</span>}
        </a>

        <nav className="flex-1 flex flex-col gap-1 px-2">
          {NAV_ITEMS.filter(i => i.id !== "pilot" && (isAdmin || scope.some(s => i.href === s || i.href.startsWith(s + "/")))).map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
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

      {/* ══════════ MOBILE: Radial bubble menu ══════════ */}

      <style>{`
        @keyframes radialIn {
          from { opacity: 0; transform: scale(0.3) translate(var(--tx), var(--ty)); }
          to   { opacity: 1; transform: scale(1) translate(var(--tx), var(--ty)); }
        }
        @keyframes radialBubbleGlow {
          0%, 100% { box-shadow: 0 0 16px rgba(201,168,76,0.3), 0 0 40px rgba(201,168,76,0.1); }
          50%      { box-shadow: 0 0 24px rgba(201,168,76,0.5), 0 0 60px rgba(201,168,76,0.2); }
        }
        @keyframes radialBgIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pilotSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .radial-item {
          animation: radialIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* Backdrop when open */}
      {radialOpen && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          style={{ background: "rgba(6,6,11,0.85)", backdropFilter: "blur(12px)", animation: "radialBgIn 0.25s ease both" }}
          onClick={() => { setRadialOpen(false); setPilotOpen(false); }}
        />
      )}

      {/* Radial nav items */}
      {radialOpen && (
        <div className="fixed z-[60] md:hidden" style={{ left: `${pos.x + 28}px`, top: `${pos.y + 28}px` }}>
          {(() => {
            // Model mode: show model-specific actions
            const items = isModelMode
              ? [
                  { id: "agence", label: "Abonnes", icon: Users, color: "#E84393", action: () => { setRadialOpen(false); router.push("/agence"); } },
                  { id: "addcode", label: "Code", icon: Key, color: "#00D68F", action: () => { setQuickCodeOpen(true); setRadialOpen(false); } },
                  { id: "profil", label: "Profil", icon: ExternalLink, color: "#A882FF", action: () => { setRadialOpen(false); window.open("/m/yumi", "_blank"); } },
                  { id: "chat", label: "Chat", icon: MessageCircle, color: "#5B8DEF", action: () => { setModelChatOpen(true); setRadialOpen(false); } },
                  { id: "pilot", label: "PILOT", icon: Sparkles, color: "#C9A84C", action: () => { setPilotOpen(true); setRadialOpen(false); } },
                ]
              : NAV_ITEMS.filter(i => i.id === "pilot" || isAdmin || scope.some(s => i.href === s || i.href.startsWith(s + "/")));

            return items.map((item, i) => {
              const isNav = "href" in item;
              const isPilot = item.id === "pilot";
              const isActive = isNav && (item as typeof NAV_ITEMS[0]).href !== "__pilot__" && (pathname === (item as typeof NAV_ITEMS[0]).href || ((item as typeof NAV_ITEMS[0]).href !== "/" && pathname.startsWith((item as typeof NAV_ITEMS[0]).href)));
              const total = items.length;
              const angleSpread = total <= 3 ? 120 : 200;
              const startAngle = total <= 3 ? 200 : 170;
              const angle = startAngle + (total > 1 ? (angleSpread / (total - 1)) * i : 0);
              const rad = (angle * Math.PI) / 180;
              const radius = total <= 3 ? 90 : 110;
              const tx = Math.cos(rad) * radius;
              const ty = Math.sin(rad) * radius;

              return (
                <button
                  key={item.id}
                  className="radial-item absolute flex flex-col items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                  style={{
                    "--tx": `${tx}px`,
                    "--ty": `${ty}px`,
                    transform: `translate(${tx}px, ${ty}px)`,
                    left: "-22px",
                    top: "-22px",
                    animationDelay: `${i * 0.04}s`,
                  } as React.CSSProperties}
                  onClick={() => {
                    if ("action" in item && typeof item.action === "function") {
                      (item as { action: () => void }).action();
                    } else if (isPilot) {
                      setPilotOpen(true);
                      setRadialOpen(false);
                    } else if (isNav) {
                      setRadialOpen(false);
                      router.push((item as typeof NAV_ITEMS[0]).href);
                    }
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-90"
                    style={{
                      background: isPilot
                        ? "linear-gradient(135deg, #C9A84C, #E8C76A)"
                        : item.id === "addcode" ? "#00D68F"
                        : isActive ? item.color : "rgba(12,12,20,0.9)",
                      border: isPilot || item.id === "addcode" ? "none" : `2px solid ${item.color}`,
                      boxShadow: isPilot
                        ? "0 0 20px rgba(201,168,76,0.4), 0 4px 12px rgba(0,0,0,0.4)"
                        : `0 0 20px ${item.color}40, 0 4px 12px rgba(0,0,0,0.4)`,
                    }}
                  >
                    <item.icon className="w-4.5 h-4.5" style={{ color: isPilot || item.id === "addcode" ? "#06060B" : isActive ? "#fff" : item.color }} />
                  </div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: isActive || isPilot ? item.color : "var(--sq-text)", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            });
          })()}
        </div>
      )}

      {/* PILOT mini-chat (mobile) */}
      {pilotOpen && (
        <PilotMobileChat onClose={() => setPilotOpen(false)} isModelMode={isModelMode} />
      )}

      {/* Quick Code Generator (model mode) */}
      {quickCodeOpen && (
        <QuickCodeGenerator onClose={() => setQuickCodeOpen(false)} />
      )}

      {/* Model Chat (public + private) */}
      {modelChatOpen && (
        <ModelChat onClose={() => setModelChatOpen(false)} />
      )}

      {/* Central draggable bubble button */}
      <div
        ref={bubbleRef}
        className="fixed z-[60] md:hidden"
        style={{ left: `${pos.x}px`, top: `${pos.y}px`, touchAction: "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-90"
          style={{
            background: radialOpen
              ? "rgba(255,255,255,0.1)"
              : "linear-gradient(135deg, #C9A84C, #D4AF37, #E8C76A)",
            border: radialOpen ? "2px solid rgba(255,255,255,0.2)" : "none",
            animation: radialOpen ? "none" : "radialBubbleGlow 3s ease-in-out infinite",
          }}
        >
          {radialOpen ? (
            <X className="w-6 h-6" style={{ color: "var(--sq-text)" }} />
          ) : (
            <Zap className="w-6 h-6" style={{ color: "#06060B" }} />
          )}
        </div>
      </div>
    </>
  );
}

// ── PILOT Mobile Mini Chat ──
function PilotMobileChat({ onClose, isModelMode }: { onClose: () => void; isModelMode?: boolean }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ id: string; role: "user" | "bot"; content: string; actions?: { label: string; value: string }[] }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const safeJSON = (key: string) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };

    if (isModelMode) {
      // Model mode: show subscriber stats
      const codes: { model?: string; active?: boolean; revoked?: boolean; expiresAt?: string; type?: string }[] = safeJSON("sqwensy_gallery_codes") || [];
      const yumiCodes = codes.filter((c) => c.model === "yumi");
      const active = yumiCodes.filter(c => c.active && !c.revoked && c.expiresAt && new Date(c.expiresAt).getTime() > Date.now());
      const expired = yumiCodes.filter(c => c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now() && !c.revoked);

      setMessages([{
        id: "g", role: "bot",
        content: `Salut ! PILOT mode Agence.\n\n🔑 ${active.length} code${active.length !== 1 ? "s" : ""} actif${active.length !== 1 ? "s" : ""}\n⏰ ${expired.length} expire${expired.length !== 1 ? "s" : ""}\n📊 ${yumiCodes.filter(c => c.type === "paid").length} abonne${yumiCodes.filter(c => c.type === "paid").length !== 1 ? "s" : ""} total`,
        actions: [
          { label: "📊 Stats", value: "model_stats" },
          { label: "👥 Abonnes", value: "agence" },
        ],
      }]);
    } else {
      const leads = safeJSON("sqwensy_jps_pipeline") || [];
      const tickets = safeJSON("sqwensy_chat_tickets") || [];
      const activeLeads = Array.isArray(leads) ? leads.filter((l: { stage?: string }) => l.stage && !["cloture", "sav"].includes(l.stage)).length : 0;
      const openTickets = Array.isArray(tickets) ? tickets.filter((t: { status?: string }) => t.status && ["new", "open"].includes(t.status)).length : 0;

      const alerts: string[] = [];
      if (openTickets > 0) alerts.push(`${openTickets} tickets`);
      if (activeLeads > 0) alerts.push(`${activeLeads} leads actifs`);

      setMessages([{
        id: "g", role: "bot",
        content: `Salut NB ! Que veux-tu faire ?${alerts.length ? `\n⚠️ ${alerts.join(" · ")}` : ""}`,
        actions: [
          { label: "📊 Stats", value: "stats" },
          { label: "🔧 JPS", value: "jps" },
          { label: "🎫 Tickets", value: "admin" },
          { label: "🎨 Studio", value: "studio" },
          { label: "🚀 Brands", value: "brands" },
        ],
      }]);
    }
  }, [isModelMode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleAction(value: string) {
    const navMap: Record<string, string> = {
      jps: "/client/jps", admin: "/admin", studio: "/studio", brands: "/brands", agence: "/agence", hq: "/",
    };
    if (navMap[value]) {
      onClose();
      router.push(navMap[value]);
      return;
    }
    if (value === "model_stats") {
      const safeJSON = (key: string) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
      const codes: { model?: string; active?: boolean; revoked?: boolean; expiresAt?: string; type?: string; tier?: string }[] = safeJSON("sqwensy_gallery_codes") || [];
      const yc = codes.filter(c => c.model === "yumi");
      const active = yc.filter(c => c.active && !c.revoked && c.expiresAt && new Date(c.expiresAt).getTime() > Date.now());
      const tiers = ["vip", "gold", "diamond", "platinum"];
      const tierStats = tiers.map(t => `${t.toUpperCase()}: ${active.filter(c => c.tier === t).length}`).join(" · ");
      setMessages(prev => [...prev,
        { id: `u-${Date.now()}`, role: "user" as const, content: "Stats" },
        { id: `b-${Date.now()}`, role: "bot" as const,
          content: `📊 Stats abonnes YUMI :\n\n🔑 ${active.length} actifs\n${tierStats}\n💰 ${yc.filter(c => c.type === "paid").length} payes total`,
          actions: [{ label: "👥 Voir abonnes", value: "agence" }],
        },
      ]);
      return;
    }
    if (value === "stats") {
      const safeJSON = (key: string) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
      const leads = safeJSON("sqwensy_jps_pipeline") || [];
      const products = safeJSON("sqwensy_sqwensy_produits") || safeJSON("sqwensy_brands_products") || [];
      const activeLeads = Array.isArray(leads) ? leads.filter((l: { stage?: string }) => l.stage && !["cloture", "sav"].includes(l.stage)).length : 0;
      setMessages(prev => [...prev,
        { id: `u-${Date.now()}`, role: "user" as const, content: "Stats" },
        {
          id: `b-${Date.now()}`, role: "bot" as const,
          content: `📊 Stats :\n🔧 JPS — ${activeLeads} leads actifs / ${Array.isArray(leads) ? leads.length : 0}\n🚀 Brands — ${Array.isArray(products) ? products.length : 0} produits`,
          actions: [
            { label: "🔧 Voir JPS", value: "jps" },
            { label: "🚀 Voir Brands", value: "brands" },
          ],
        },
      ]);
      return;
    }
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", content: value }]);
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-[65] md:hidden rounded-2xl overflow-hidden"
      style={{
        maxHeight: "60vh",
        background: "rgba(10,10,18,0.97)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(201,168,76,0.2)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        animation: "pilotSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ background: "linear-gradient(135deg, #C9A84C, #D4AF37)", borderBottom: "1px solid rgba(201,168,76,0.3)" }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "#06060B" }} />
          <span className="text-xs font-bold" style={{ color: "#06060B" }}>PILOT</span>
        </div>
        <button onClick={onClose} className="cursor-pointer" style={{ color: "rgba(6,6,11,0.5)" }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="overflow-y-auto p-3 space-y-2" style={{ maxHeight: "calc(60vh - 90px)" }}>
        {messages.map(m => (
          <div key={m.id}>
            <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[85%] px-3 py-2 text-[11px] leading-relaxed whitespace-pre-line rounded-xl"
                style={{
                  background: m.role === "user" ? "#C9A84C" : "var(--sq-surface, #12121A)",
                  color: m.role === "user" ? "#06060B" : "var(--sq-text, #E2E8F0)",
                  borderBottomRightRadius: m.role === "user" ? 4 : undefined,
                  borderBottomLeftRadius: m.role === "bot" ? 4 : undefined,
                }}>
                {m.content}
              </div>
            </div>
            {m.actions && m.id === messages[messages.length - 1]?.id && (
              <div className="flex flex-wrap gap-1.5 mt-1.5 ml-1">
                {m.actions.map(a => (
                  <button key={a.value} onClick={() => handleAction(a.value)}
                    className="px-2.5 py-1 text-[10px] font-medium rounded-full cursor-pointer"
                    style={{ background: "var(--sq-surface)", color: "var(--sq-text)", border: "1px solid var(--sq-border)" }}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-2.5" style={{ borderTop: "1px solid var(--sq-border)" }}>
        <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) { handleAction(input.trim()); setInput(""); } }} className="flex gap-1.5">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Dis-moi..."
            className="flex-1 text-[11px] px-3 py-2 rounded-lg outline-none"
            style={{ background: "var(--sq-surface)", color: "var(--sq-text)", border: "1px solid var(--sq-border)" }} />
          <button type="submit" className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E8C76A)" }}>
            <Zap className="w-3.5 h-3.5" style={{ color: "#06060B" }} />
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Quick Code Generator (Model mode bubble action) ──
const QUICK_PACKS = [
  { id: "vip", name: "VIP", price: 150, color: "#E84393" },
  { id: "gold", name: "Gold", price: 200, color: "#C9A84C" },
  { id: "diamond", name: "Diamond", price: 250, color: "#5B8DEF" },
  { id: "platinum", name: "Platinum", price: 320, color: "#A882FF" },
];

const DURATION_PRESETS = [
  { label: "1h", value: 1 },
  { label: "24h", value: 24 },
  { label: "48h", value: 48 },
  { label: "72h", value: 72 },
  { label: "1 sem", value: 168 },
  { label: "2 sem", value: 336 },
  { label: "1 mois", value: 720 },
  { label: "3 mois", value: 2160 },
];

function QuickCodeGenerator({ onClose }: { onClose: () => void }) {
  // Load packs from localStorage (synced with agence page)
  const [packsList, setPacksList] = useState(QUICK_PACKS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sqwensy_yumi_packs");
      if (raw) {
        const saved = JSON.parse(raw) as { id: string; name: string; price: number; color: string; active?: boolean }[];
        const active = saved.filter(p => p.active !== false);
        if (active.length > 0) setPacksList(active.map(p => ({ id: p.id, name: p.name, price: p.price, color: p.color })));
      }
    } catch { /* use defaults */ }
  }, []);

  const [client, setClient] = useState("");
  const [platform, setPlatform] = useState("snapchat");
  const [tier, setTier] = useState("vip");
  const [durationType, setDurationType] = useState<"preset" | "custom">("preset");
  const [duration, setDuration] = useState(72);
  const [customValue, setCustomValue] = useState(1);
  const [customUnit, setCustomUnit] = useState<"hours" | "days" | "weeks" | "months">("days");
  const [type, setType] = useState<"paid" | "promo" | "gift">("paid");
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const actualDuration = durationType === "preset" ? duration : (() => {
    switch (customUnit) {
      case "hours": return customValue;
      case "days": return customValue * 24;
      case "weeks": return customValue * 168;
      case "months": return customValue * 720;
    }
  })();

  const handleGenerate = () => {
    if (!client.trim()) return;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let r = "";
    for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
    const code = `YUM-${new Date().getFullYear()}-${r}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + actualDuration * 3600000).toISOString();
    const pack = packsList.find(p => p.id === tier);

    const newCode = {
      code, model: "yumi", client: client.trim(), platform,
      role: "client", tier, pack: pack?.name || tier,
      type, duration: actualDuration, expiresAt,
      created: now.toISOString(), used: false, active: true,
      revoked: false, isTrial: false, lastUsed: null,
    };

    try {
      const existing = JSON.parse(localStorage.getItem("sqwensy_gallery_codes") || "[]");
      existing.push(newCode);
      localStorage.setItem("sqwensy_gallery_codes", JSON.stringify(existing));
    } catch { /* silent */ }

    setGenerated(code);
  };

  const handleCopy = () => {
    if (generated) {
      navigator.clipboard.writeText(generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const durationLabel = () => {
    const h = actualDuration;
    if (h < 24) return `${h}h`;
    if (h < 168) return `${Math.round(h / 24)}j`;
    if (h < 720) return `${Math.round(h / 168)} sem`;
    return `${Math.round(h / 720)} mois`;
  };

  return (
    <div className="fixed inset-x-3 bottom-20 z-[65] md:hidden rounded-2xl overflow-hidden"
      style={{
        maxHeight: "75vh",
        background: "rgba(10,10,18,0.97)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(0,214,143,0.2)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        animation: "pilotSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ background: "#00D68F", borderBottom: "1px solid rgba(0,214,143,0.3)" }}>
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" style={{ color: "#06060B" }} />
          <span className="text-xs font-bold" style={{ color: "#06060B" }}>Ajout abonne</span>
        </div>
        <button onClick={onClose} className="cursor-pointer bg-transparent border-none" style={{ color: "rgba(6,6,11,0.5)" }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto p-3 space-y-3" style={{ maxHeight: "calc(75vh - 48px)" }}>
        {!generated ? (
          <>
            {/* Client */}
            <div>
              <label className="text-[10px] block mb-1" style={{ color: "var(--sq-text-muted)" }}>Pseudo / Compte *</label>
              <input value={client} onChange={e => setClient(e.target.value)} placeholder="@pseudo_snap"
                className="w-full text-xs rounded-lg px-3 py-2.5 outline-none"
                style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }} />
            </div>

            {/* Platform */}
            <div>
              <label className="text-[10px] block mb-1" style={{ color: "var(--sq-text-muted)" }}>Plateforme</label>
              <div className="flex gap-1.5">
                {["snapchat", "instagram", "telegram", "email"].map(p => (
                  <button key={p} onClick={() => setPlatform(p)}
                    className="flex-1 text-[10px] py-1.5 rounded-lg cursor-pointer capitalize"
                    style={{
                      background: platform === p ? "#E8439320" : "var(--sq-bg3)",
                      color: platform === p ? "#E84393" : "var(--sq-text-muted)",
                      border: `1px solid ${platform === p ? "rgba(232,67,147,0.3)" : "var(--sq-border)"}`,
                    }}>{p}</button>
                ))}
              </div>
            </div>

            {/* Pack */}
            <div>
              <label className="text-[10px] block mb-1" style={{ color: "var(--sq-text-muted)" }}>Pack</label>
              <div className="grid grid-cols-4 gap-1.5">
                {packsList.map(p => (
                  <button key={p.id} onClick={() => setTier(p.id)}
                    className="flex flex-col items-center py-2 rounded-lg cursor-pointer"
                    style={{
                      background: tier === p.id ? `${p.color}20` : "var(--sq-bg3)",
                      border: `1px solid ${tier === p.id ? p.color : "var(--sq-border)"}`,
                    }}>
                    <Crown className="w-3 h-3 mb-0.5" style={{ color: p.color }} />
                    <span className="text-[9px] font-bold" style={{ color: tier === p.id ? p.color : "var(--sq-text-muted)" }}>{p.name}</span>
                    <span className="text-[8px]" style={{ color: "var(--sq-text-muted)" }}>{p.price}€</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px]" style={{ color: "var(--sq-text-muted)" }}>Duree d&apos;acces</label>
                <button onClick={() => setDurationType(durationType === "preset" ? "custom" : "preset")}
                  className="text-[9px] px-2 py-0.5 rounded cursor-pointer"
                  style={{ background: "var(--sq-bg3)", color: "#E84393", border: "1px solid var(--sq-border)" }}>
                  {durationType === "preset" ? "Personnaliser" : "Predefini"}
                </button>
              </div>

              {durationType === "preset" ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {DURATION_PRESETS.map(d => (
                    <button key={d.value} onClick={() => setDuration(d.value)}
                      className="text-[10px] py-1.5 rounded-lg cursor-pointer"
                      style={{
                        background: duration === d.value ? "#00D68F20" : "var(--sq-bg3)",
                        color: duration === d.value ? "#00D68F" : "var(--sq-text-muted)",
                        border: `1px solid ${duration === d.value ? "rgba(0,214,143,0.3)" : "var(--sq-border)"}`,
                      }}>{d.label}</button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="number" value={customValue} onChange={e => setCustomValue(Math.max(1, Number(e.target.value)))} min={1}
                    className="w-20 text-xs rounded-lg px-3 py-2 outline-none"
                    style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }} />
                  <div className="flex gap-1 flex-1">
                    {([["hours", "Heures"], ["days", "Jours"], ["weeks", "Sem."], ["months", "Mois"]] as const).map(([unit, label]) => (
                      <button key={unit} onClick={() => setCustomUnit(unit)}
                        className="flex-1 text-[10px] py-1.5 rounded-lg cursor-pointer"
                        style={{
                          background: customUnit === unit ? "#00D68F20" : "var(--sq-bg3)",
                          color: customUnit === unit ? "#00D68F" : "var(--sq-text-muted)",
                          border: `1px solid ${customUnit === unit ? "rgba(0,214,143,0.3)" : "var(--sq-border)"}`,
                        }}>{label}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Type */}
            <div className="flex gap-1.5">
              {([["paid", "Paye"], ["promo", "Promo"], ["gift", "Cadeau"]] as const).map(([t, label]) => (
                <button key={t} onClick={() => setType(t)}
                  className="flex-1 text-[10px] py-1.5 rounded-lg cursor-pointer"
                  style={{
                    background: type === t ? "var(--sq-surface)" : "var(--sq-bg3)",
                    color: type === t ? "var(--sq-text)" : "var(--sq-text-muted)",
                    border: `1px solid ${type === t ? "var(--sq-border2)" : "var(--sq-border)"}`,
                  }}>{label}</button>
              ))}
            </div>

            {/* Generate button */}
            <button onClick={handleGenerate} disabled={!client.trim()}
              className="w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: "#00D68F", color: "#06060B" }}>
              <Key className="w-3.5 h-3.5" />
              Generer code — {durationLabel()}
            </button>
          </>
        ) : (
          /* Success state */
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(0,214,143,0.15)" }}>
              <Check className="w-7 h-7" style={{ color: "#00D68F" }} />
            </div>
            <p className="text-[10px] mb-2" style={{ color: "#00D68F" }}>Code genere !</p>
            <p className="text-xl font-mono font-black tracking-widest mb-1" style={{ color: "var(--sq-text)" }}>{generated}</p>
            <p className="text-[10px] mb-4" style={{ color: "var(--sq-text-muted)" }}>
              @{client} · {packsList.find(p => p.id === tier)?.name} · {durationLabel()}
            </p>
            <div className="flex gap-2">
              <button onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                style={{ background: copied ? "rgba(0,214,143,0.15)" : "var(--sq-surface)", color: copied ? "#00D68F" : "var(--sq-text)", border: "1px solid var(--sq-border)" }}>
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copie !" : "Copier"}
              </button>
              <button onClick={() => { setGenerated(null); setClient(""); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                style={{ background: "#00D68F", color: "#06060B" }}>
                <UserPlus className="w-3 h-3" /> Nouveau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Model Chat (Public + Private rooms) ──
const CHAT_STORAGE_PUBLIC = "sqwensy_yumi_chat_public";
const CHAT_STORAGE_PRIVATE = "sqwensy_yumi_chat_private";

interface ChatMsg {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  tier?: string;
  isModel?: boolean;
}

function loadChat(key: string): ChatMsg[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function saveChat(key: string, msgs: ChatMsg[]) {
  localStorage.setItem(key, JSON.stringify(msgs));
}

function ModelChat({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"public" | "private">("public");
  const [input, setInput] = useState("");
  const [publicMsgs, setPublicMsgs] = useState<ChatMsg[]>([]);
  const [privateMsgs, setPrivateMsgs] = useState<ChatMsg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Public: nickname + 1h free
  const [publicNickname, setPublicNickname] = useState("");
  const [publicJoined, setPublicJoined] = useState(false);

  // Private: paid code required
  const [privateCodeInput, setPrivateCodeInput] = useState("");
  const [privateUser, setPrivateUser] = useState<{ client: string; tier: string; pack: string } | null>(null);
  const [privateError, setPrivateError] = useState("");

  useEffect(() => {
    setPublicMsgs(loadChat(CHAT_STORAGE_PUBLIC));
    setPrivateMsgs(loadChat(CHAT_STORAGE_PRIVATE));
    try {
      const pub = sessionStorage.getItem("yumi_chat_public_nick");
      if (pub) { setPublicNickname(pub); setPublicJoined(true); }
      const priv = sessionStorage.getItem("yumi_chat_private_user");
      if (priv) setPrivateUser(JSON.parse(priv));
    } catch { /* */ }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [publicMsgs, privateMsgs, tab]);

  const handleJoinPublic = () => {
    if (!publicNickname.trim()) return;
    setPublicJoined(true);
    sessionStorage.setItem("yumi_chat_public_nick", publicNickname.trim());
    // Grant 1h free profile access
    try {
      const codes = JSON.parse(localStorage.getItem("sqwensy_gallery_codes") || "[]");
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let r = "";
      for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
      codes.push({
        code: `YU-FREE-${r}`, model: "yumi", client: publicNickname.trim(), platform: "chat",
        role: "client", tier: "vip", pack: "Free Trial (1h)", type: "gift", duration: 1,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        created: new Date().toISOString(), used: false, active: true,
        revoked: false, isTrial: true, lastUsed: null,
      });
      localStorage.setItem("sqwensy_gallery_codes", JSON.stringify(codes));
    } catch { /* */ }
    const msg: ChatMsg = {
      id: `sys-${Date.now()}`, sender: "System",
      content: `${publicNickname.trim()} a rejoint le chat ! 1h d'acces gratuit au profil.`,
      timestamp: new Date().toISOString(),
    };
    const updated = [...loadChat(CHAT_STORAGE_PUBLIC), msg];
    setPublicMsgs(updated);
    saveChat(CHAT_STORAGE_PUBLIC, updated);
  };

  const handlePrivateLogin = () => {
    setPrivateError("");
    const trimmed = privateCodeInput.trim().toUpperCase();
    if (!trimmed) { setPrivateError("Entre ton code."); return; }
    try {
      const codes = JSON.parse(localStorage.getItem("sqwensy_gallery_codes") || "[]") as Array<{
        code: string; model: string; active: boolean; revoked: boolean; expiresAt: string;
        type: string; client: string; tier: string; pack: string;
      }>;
      const found = codes.find(c => c.code === trimmed && c.model === "yumi" && c.active && !c.revoked);
      if (!found) { setPrivateError("Code invalide."); return; }
      if (new Date(found.expiresAt).getTime() <= Date.now()) { setPrivateError("Code expire."); return; }
      if (found.type !== "paid" && found.type !== "promo") { setPrivateError("Acces reserve aux abonnes payants."); return; }
      const user = { client: found.client, tier: found.tier, pack: found.pack };
      setPrivateUser(user);
      sessionStorage.setItem("yumi_chat_private_user", JSON.stringify(user));
      setPrivateCodeInput("");
      const msg: ChatMsg = {
        id: `sys-${Date.now()}`, sender: "System",
        content: `${found.client} a rejoint le chat prive (${found.pack}).`,
        timestamp: new Date().toISOString(), tier: found.tier,
      };
      const updated = [...loadChat(CHAT_STORAGE_PRIVATE), msg];
      setPrivateMsgs(updated);
      saveChat(CHAT_STORAGE_PRIVATE, updated);
    } catch { setPrivateError("Erreur."); }
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const isPublic = tab === "public";
    const sender = isPublic ? publicNickname : (privateUser?.client || "?");
    const msg: ChatMsg = {
      id: `msg-${Date.now()}`, sender, content: input.trim(),
      timestamp: new Date().toISOString(),
      tier: !isPublic ? privateUser?.tier : undefined,
    };
    const key = isPublic ? CHAT_STORAGE_PUBLIC : CHAT_STORAGE_PRIVATE;
    const updated = [...(isPublic ? publicMsgs : privateMsgs), msg];
    if (isPublic) setPublicMsgs(updated); else setPrivateMsgs(updated);
    saveChat(key, updated);
    setInput("");
  };

  const TC: Record<string, string> = { vip: "#E84393", gold: "#C9A84C", diamond: "#5B8DEF", platinum: "#A882FF" };
  const currentMsgs = tab === "public" ? publicMsgs : privateMsgs;
  const canSend = tab === "public" ? publicJoined : !!privateUser;

  return (
    <div className="fixed inset-x-3 bottom-20 z-[65] md:hidden rounded-2xl overflow-hidden flex flex-col"
      style={{
        maxHeight: "70vh", height: "70vh",
        background: "rgba(10,10,18,0.97)", backdropFilter: "blur(24px)",
        border: "1px solid rgba(91,141,239,0.2)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        animation: "pilotSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ background: "rgba(91,141,239,0.12)", borderBottom: "1px solid rgba(91,141,239,0.15)" }}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" style={{ color: "#5B8DEF" }} />
          <span className="text-xs font-bold" style={{ color: "#F0F0F5" }}>Chat YUMI</span>
        </div>
        <button onClick={onClose} className="cursor-pointer bg-transparent border-none"><X className="w-4 h-4" style={{ color: "#8E8EA3" }} /></button>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0" style={{ borderBottom: "1px solid rgba(142,142,163,0.08)" }}>
        <button onClick={() => setTab("public")}
          className="flex-1 py-2 text-[11px] font-medium cursor-pointer bg-transparent border-none flex items-center justify-center gap-1.5"
          style={{ color: tab === "public" ? "#5B8DEF" : "#5A5A6A", borderBottom: tab === "public" ? "2px solid #5B8DEF" : "2px solid transparent" }}>
          <Users className="w-3 h-3" /> Public
        </button>
        <button onClick={() => setTab("private")}
          className="flex-1 py-2 text-[11px] font-medium cursor-pointer bg-transparent border-none flex items-center justify-center gap-1.5"
          style={{ color: tab === "private" ? "#E84393" : "#5A5A6A", borderBottom: tab === "private" ? "2px solid #E84393" : "2px solid transparent" }}>
          <Lock className="w-3 h-3" /> Prive
        </button>
      </div>

      {/* Public join gate */}
      {tab === "public" && !publicJoined && (
        <div className="flex-1 flex flex-col items-center justify-center p-5">
          <Users className="w-8 h-8 mb-3" style={{ color: "#5B8DEF", opacity: 0.4 }} />
          <p className="text-xs font-medium mb-1 text-center" style={{ color: "#F0F0F5" }}>Chat public</p>
          <p className="text-[10px] mb-4 text-center" style={{ color: "#8E8EA3" }}>
            Rejoins et recois 1h d&apos;acces gratuit au profil !
          </p>
          <input value={publicNickname} onChange={e => setPublicNickname(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleJoinPublic(); }}
            placeholder="Ton pseudo" autoFocus
            className="w-full max-w-[220px] text-sm text-center rounded-xl px-4 py-2.5 outline-none mb-3"
            style={{ background: "rgba(6,6,11,0.6)", border: "1px solid rgba(91,141,239,0.2)", color: "#F0F0F5" }} />
          <button onClick={handleJoinPublic} disabled={!publicNickname.trim()}
            className="text-xs font-semibold px-6 py-2.5 rounded-xl cursor-pointer disabled:opacity-40"
            style={{ background: "#5B8DEF", color: "#fff" }}>
            Rejoindre
          </button>
        </div>
      )}

      {/* Private code gate */}
      {tab === "private" && !privateUser && (
        <div className="flex-1 flex flex-col items-center justify-center p-5">
          <Lock className="w-8 h-8 mb-3" style={{ color: "#E84393", opacity: 0.4 }} />
          <p className="text-xs font-medium mb-1 text-center" style={{ color: "#F0F0F5" }}>Chat prive</p>
          <p className="text-[10px] mb-4 text-center" style={{ color: "#8E8EA3" }}>
            Reserve aux abonnes payants.
          </p>
          <input value={privateCodeInput} onChange={e => { setPrivateCodeInput(e.target.value.toUpperCase()); setPrivateError(""); }}
            onKeyDown={e => { if (e.key === "Enter") handlePrivateLogin(); }}
            placeholder="YUM-2026-XXXX" autoFocus
            className="w-full max-w-[220px] text-sm text-center font-mono tracking-widest rounded-xl px-4 py-2.5 outline-none mb-2"
            style={{ background: "rgba(6,6,11,0.6)", border: privateError ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(232,67,147,0.2)", color: "#F0F0F5" }} />
          {privateError && <p className="text-[10px] mb-2" style={{ color: "#EF4444" }}>{privateError}</p>}
          <button onClick={handlePrivateLogin}
            className="text-xs font-semibold px-6 py-2.5 rounded-xl cursor-pointer"
            style={{ background: "#E84393", color: "#fff" }}>
            Acceder
          </button>
        </div>
      )}

      {/* Messages */}
      {canSend && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {currentMsgs.length === 0 && (
              <p className="text-[10px] text-center py-8" style={{ color: "#3A3A4A" }}>
                {tab === "public" ? "Sois le premier a ecrire !" : "Chat prive avec YUMI."}
              </p>
            )}
            {currentMsgs.map(m => {
              const isSystem = m.sender === "System";
              const isSelf = tab === "public" ? m.sender === publicNickname : m.sender === privateUser?.client;

              if (isSystem) return (
                <div key={m.id} className="text-center">
                  <span className="text-[9px] px-2.5 py-1 rounded-full inline-block" style={{ background: "rgba(142,142,163,0.06)", color: "#5A5A6A" }}>{m.content}</span>
                </div>
              );

              return (
                <div key={m.id} className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[80%]">
                    <div className={`flex items-center gap-1 mb-0.5 ${isSelf ? "justify-end" : ""}`}>
                      <span className="text-[9px] font-semibold" style={{ color: m.isModel ? "#E84393" : (m.tier ? TC[m.tier] || "#8E8EA3" : "#5B8DEF") }}>
                        {m.isModel ? "YUMI" : m.sender}
                      </span>
                      {m.tier && (
                        <span className="text-[7px] px-1 py-0.5 rounded-full font-bold uppercase"
                          style={{ background: `${TC[m.tier] || "#8E8EA3"}20`, color: TC[m.tier] || "#8E8EA3" }}>{m.tier}</span>
                      )}
                    </div>
                    <div className="px-3 py-2 text-[11px] leading-relaxed rounded-xl"
                      style={{
                        background: isSelf ? (tab === "private" ? "#E8439925" : "#5B8DEF25") : "rgba(18,18,26,0.8)",
                        color: "#E2E8F0",
                        borderBottomRightRadius: isSelf ? 4 : undefined,
                        borderBottomLeftRadius: !isSelf ? 4 : undefined,
                      }}>
                      {m.content}
                    </div>
                    <span className="text-[8px] block mt-0.5" style={{ color: "#3A3A4A", textAlign: isSelf ? "right" : "left" }}>
                      {new Date(m.timestamp).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="p-2.5 shrink-0" style={{ borderTop: "1px solid rgba(142,142,163,0.08)" }}>
            <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-1.5">
              <input type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder={tab === "public" ? "Message..." : "Message prive..."}
                className="flex-1 text-[11px] px-3 py-2 rounded-lg outline-none"
                style={{ background: "var(--sq-surface, #12121A)", color: "var(--sq-text, #E2E8F0)", border: "1px solid var(--sq-border, #1E1E2E)" }} />
              <button type="submit" disabled={!input.trim()}
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-40"
                style={{ background: tab === "public" ? "#5B8DEF" : "#E84393" }}>
                <Send className="w-3.5 h-3.5" style={{ color: "#fff" }} />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
