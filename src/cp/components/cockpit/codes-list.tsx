"use client";

import { useState, useMemo } from "react";
import { Search, Copy, Check, Link2, Clock, ChevronRight, Plus } from "lucide-react";
import type { AccessCode, ClientInfo } from "@/types/heaven";

interface CodesListProps {
  codes: AccessCode[];
  clients: ClientInfo[];
  modelSlug: string;
  onCopy: (code: string) => void;
  onRevoke: (code: string) => void;
  onPause: (code: string) => void;
  onReactivate: (code: string) => void;
  onDelete: (code: string) => void;
  onUpdateClient: (clientId: string, updates: Record<string, unknown>) => void;
  onSendMessage: (clientId: string, message: string) => void;
  onGenerateForClient?: (pseudo: string) => void;
  onExtendCode: (code: string, hours: number) => void;
  wiseLinks?: { tier: string; url: string }[];
}

export function CodesList({ codes, clients, modelSlug, onCopy, onExtendCode, onGenerateForClient }: CodesListProps) {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [extending, setExtending] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Group codes by client
  const groups = useMemo(() => {
    const clientMap = new Map(clients.map(c => [c.id, c]));
    const grouped: Record<string, { name: string; codes: AccessCode[]; client?: ClientInfo }> = {};

    codes.forEach(code => {
      const key = code.client || "—";
      if (!grouped[key]) {
        const ci = clients.find(c =>
          (c.pseudo_snap && c.pseudo_snap.toLowerCase() === key.toLowerCase()) ||
          (c.pseudo_insta && c.pseudo_insta.toLowerCase() === key.toLowerCase())
        );
        grouped[key] = { name: key, codes: [], client: ci };
      }
      grouped[key].codes.push(code);
    });

    return Object.values(grouped)
      .sort((a, b) => {
        const aActive = a.codes.some(c => c.active && !c.revoked);
        const bActive = b.codes.some(c => c.active && !c.revoked);
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return 0;
      })
      .filter(g => !search.trim() || g.name.toLowerCase().includes(search.toLowerCase()));
  }, [codes, clients, search]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-2 p-3">
      {/* Search */}
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full pl-8 pr-3 py-2 rounded-lg text-[11px] outline-none"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
        </div>
        {search.trim() && onGenerateForClient && (
          <button onClick={() => onGenerateForClient(search.trim())}
            className="px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer shrink-0"
            style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Client codes — compact */}
      {groups.length === 0 && (
        <p className="text-[10px] text-center py-4" style={{ color: "var(--text-muted)" }}>Aucun code</p>
      )}
      {groups.map(group => {
        const activeCode = group.codes.find(c => c.active && !c.revoked);
        const ci = group.client;
        const isSnap = !!ci?.pseudo_snap;

        return (
          <div key={group.name} className="rounded-lg px-3 py-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              {/* Platform dot */}
              <div className="w-4 h-4 rounded-full shrink-0" style={{ background: isSnap ? "#997A00" : "#C13584" }} />
              {/* Pseudo */}
              <a href="/agence?tab=clients" className="text-[11px] font-bold truncate flex-1 no-underline hover:underline" style={{ color: "var(--text)" }}>
                @{ci?.pseudo_snap || ci?.pseudo_insta || group.name}
              </a>

              {/* Active code — copyable */}
              {activeCode && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleCopy(activeCode.code, `code-${activeCode.code}`)}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded cursor-pointer hover:opacity-70"
                    style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)", border: "none" }}>
                    {copied === `code-${activeCode.code}` ? <Check className="w-3 h-3 inline" /> : activeCode.code.slice(-6)}
                  </button>
                  <button onClick={() => handleCopy(`${origin}/m/${modelSlug}?access=${activeCode.code}`, `link-${activeCode.code}`)}
                    className="p-1 rounded cursor-pointer hover:opacity-70" style={{ background: "none", border: "none" }}>
                    {copied === `link-${activeCode.code}` ? <Check className="w-3 h-3" style={{ color: "var(--success)" }} /> : <Link2 className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
                  </button>
                </div>
              )}

              {/* Expiration — click to extend */}
              {activeCode && (
                <button onClick={() => setExtending(extending === activeCode.code ? null : activeCode.code)}
                  className="text-[9px] px-1.5 py-0.5 rounded cursor-pointer shrink-0" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                  <Clock className="w-3 h-3 inline mr-0.5" />
                  {(() => {
                    const diff = new Date(activeCode.expiresAt).getTime() - Date.now();
                    if (diff <= 0) return "exp";
                    const d = Math.floor(diff / 86400000);
                    const h = Math.floor((diff % 86400000) / 3600000);
                    return d > 0 ? `${d}j` : `${h}h`;
                  })()}
                </button>
              )}

              {!activeCode && (
                <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ color: "var(--text-muted)" }}>expire</span>
              )}
            </div>

            {/* Extend duration panel */}
            {extending === activeCode?.code && (
              <div className="flex gap-1 mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                {[{ label: "+7j", hours: 168 }, { label: "+30j", hours: 720 }, { label: "+90j", hours: 2160 }].map(opt => (
                  <button key={opt.label} onClick={() => { onExtendCode(activeCode.code, opt.hours); setExtending(null); }}
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer hover:scale-105 transition-transform"
                    style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
