"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, KeyRound, Pencil, Eye } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { StatCards } from "@/components/cockpit/stat-cards";
import { CodesList } from "@/components/cockpit/codes-list";
import { GenerateModal } from "@/components/cockpit/generate-modal";

// ── Types ──
interface PackConfig {
  id: string; name: string; price: number; color: string;
  features: string[];
  bonuses: { fanvueAccess: boolean; freeNudeExpress: boolean; nudeDedicaceLevres: boolean; freeVideoOffer: boolean; };
  face: boolean; badge: string | null; active: boolean;
}

interface AccessCode {
  code: string; model: string; client: string; platform: string;
  role: "client" | "admin"; tier: string; pack: string; type: "paid" | "promo" | "gift" | "trial";
  duration: number; expiresAt: string; created: string;
  used: boolean; active: boolean; revoked: boolean; isTrial: boolean; lastUsed: string | null;
}

interface ClientInfo {
  id: string;
  pseudo_snap?: string;
  pseudo_insta?: string;
  tier?: string;
  is_verified?: boolean;
  is_blocked?: boolean;
  notes?: string;
  tag?: string;
  preferences?: string;
  total_spent?: number;
  total_tokens_bought?: number;
  total_tokens_spent?: number;
  firstname?: string;
  last_active?: string;
}

// ── Defaults ──
const DEFAULT_PACKS: PackConfig[] = [
  { id: "vip", name: "VIP Glamour", price: 150, color: "#F43F5E", features: ["Pieds glamour/sales + accessoires", "Lingerie sexy + haul", "Teasing + demandes custom", "Dedicaces personnalisees"], bonuses: { fanvueAccess: false, freeNudeExpress: true, nudeDedicaceLevres: false, freeVideoOffer: false }, face: false, badge: null, active: true },
  { id: "gold", name: "Gold", price: 200, color: "#F59E0B", features: ["TOUT du VIP inclus", "Nudes complets", "Cosplay", "Sextape sans visage"], bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false }, face: false, badge: "Populaire", active: true },
  { id: "diamond", name: "Diamond", price: 250, color: "#6366F1", features: ["TOUT du Gold inclus", "Nudes avec visage", "Cosplay avec visage", "Sextape avec visage", "Hard illimite"], bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false }, face: true, badge: null, active: true },
  { id: "platinum", name: "Platinum All-Access", price: 320, color: "#A78BFA", features: ["Acces TOTAL aux 3 packs", "Demandes personnalisees", "Video calls prives", "Contenu exclusif illimite"], bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: true }, face: true, badge: "Ultimate", active: true },
];

// ── API helpers ──
function generateCodeString(model: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = ""; for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  const prefix = model.slice(0, 3).toUpperCase();
  return `${prefix}-${new Date().getFullYear()}-${r}`;
}

function isExpired(expiresAt: string): boolean { return new Date(expiresAt).getTime() <= Date.now(); }

// ══════════ MAIN ══════════
export default function AgenceDashboard() {
  const { currentModel, auth, authHeaders } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "yumi";

  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [packs, setPacks] = useState<PackConfig[]>(DEFAULT_PACKS);
  const [modelInfo, setModelInfo] = useState<{ avatar?: string; online?: boolean; display_name?: string } | null>(null);

  const [showGenerator, setShowGenerator] = useState(false);
  const [, setTick] = useState(0);

  // FAB state
  const [fabOpen, setFabOpen] = useState(false);

  // ── Load data ──
  useEffect(() => {
    const headers = authHeaders();

    // Fetch codes
    fetch(`/api/codes?model=${modelSlug}`, { headers })
      .then(r => r.json())
      .then(d => setCodes(d.codes || []))
      .catch(err => console.error("[Cockpit] Failed to fetch codes:", err));

    // Fetch clients
    fetch(`/api/clients?model=${modelSlug}`, { headers })
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .catch(() => {});

    // Fetch packs
    fetch(`/api/packs?model=${modelSlug}`, { headers })
      .then(r => r.json())
      .then(d => { if (d.packs?.length > 0) setPacks(d.packs); })
      .catch(() => {});

    // Fetch model info
    fetch(`/api/models/${modelSlug}`, { headers })
      .then(r => r.json())
      .then(d => setModelInfo(d))
      .catch(() => {});
  }, [modelSlug, authHeaders]);

  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 60000); return () => clearInterval(iv); }, []);

  // ── Computed ──
  const modelCodes = useMemo(() => codes.filter(c => c.model === modelSlug), [codes, modelSlug]);
  const activeCodes = useMemo(() => modelCodes.filter(c => c.active && !c.revoked && !isExpired(c.expiresAt)), [modelCodes]);
  const revenue = useMemo(() => {
    return modelCodes.filter(c => c.type === "paid" && !c.revoked).reduce((sum, c) => {
      const pack = packs.find(p => p.id === c.tier);
      return sum + (pack?.price || 0);
    }, 0);
  }, [modelCodes, packs]);
  const uniqueClients = useMemo(() => new Set(modelCodes.filter(c => !c.revoked).map(c => c.client.toLowerCase())).size, [modelCodes]);

  // ── Actions ──
  const handleGenerate = useCallback((data: { client: string; platform: string; tier: string; duration: number; type: "paid" | "promo" | "gift" }) => {
    const code = generateCodeString(modelSlug);
    const pack = packs.find(p => p.id === data.tier);
    const newCode: AccessCode = {
      code, model: modelSlug, client: data.client, platform: data.platform,
      role: "client", tier: data.tier, pack: pack?.name || data.tier,
      type: data.type, duration: data.duration, expiresAt: new Date(Date.now() + data.duration * 3600000).toISOString(),
      created: new Date().toISOString(), used: false, active: true, revoked: false, isTrial: false, lastUsed: null,
    };
    setCodes(prev => [...prev, newCode]);
    fetch("/api/codes", { method: "POST", headers: authHeaders(), body: JSON.stringify(newCode) });
    return code;
  }, [packs, modelSlug, authHeaders]);

  const handleCopy = useCallback((code: string) => { navigator.clipboard.writeText(code); }, []);
  const handleRevoke = useCallback((code: string) => {
    setCodes(prev => prev.map(c => c.code === code ? { ...c, revoked: true, active: false } : c));
    fetch("/api/codes", { method: "PUT", headers: authHeaders(), body: JSON.stringify({ code, action: "revoke" }) });
  }, [authHeaders]);
  const handlePause = useCallback((code: string) => {
    setCodes(prev => prev.map(c => c.code === code ? { ...c, active: false } : c));
    fetch("/api/codes", { method: "PUT", headers: authHeaders(), body: JSON.stringify({ code, action: "pause" }) });
  }, [authHeaders]);
  const handleReactivate = useCallback((code: string) => {
    setCodes(prev => prev.map(c => c.code === code ? { ...c, active: true, revoked: false } : c));
    fetch("/api/codes", { method: "PUT", headers: authHeaders(), body: JSON.stringify({ code, action: "reactivate" }) });
  }, [authHeaders]);
  const handleDelete = useCallback((code: string) => {
    setCodes(prev => prev.filter(c => c.code !== code));
    fetch(`/api/codes?code=${encodeURIComponent(code)}`, { method: "DELETE", headers: authHeaders() });
  }, [authHeaders]);

  // ── Client actions ──
  const handleUpdateClient = useCallback((id: string, updates: Record<string, unknown>) => {
    const headers = authHeaders();
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    fetch("/api/clients", { method: "PUT", headers, body: JSON.stringify({ id, ...updates }) });
  }, [authHeaders]);

  const handleSendMessage = useCallback((clientId: string, content: string) => {
    const headers = authHeaders();
    fetch("/api/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({ model: modelSlug, client_id: clientId, sender_type: "model", content }),
    });
  }, [authHeaders, modelSlug]);

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-28 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* ── Header ── */}
          <div className="flex items-center gap-3 fade-up">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center text-lg font-black"
                style={{
                  background: modelInfo?.avatar ? "transparent" : "linear-gradient(135deg, var(--rose), var(--accent))",
                  color: "#fff",
                  boxShadow: "0 0 20px rgba(244,63,94,0.15)",
                }}>
                {modelInfo?.avatar ? (
                  <img src={modelInfo.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  modelSlug.charAt(0).toUpperCase()
                )}
              </div>
              {modelInfo?.online && <span className="online-dot absolute -bottom-0.5 -right-0.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold truncate" style={{ color: "var(--text)" }}>
                {modelInfo?.display_name || auth?.display_name || modelSlug.toUpperCase()}
              </h1>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {auth?.role === "root" ? "Root Admin" : "Creatrice exclusive"}
              </p>
            </div>
            {/* View Profile + Edit Profile buttons */}
            <a href={`/m/${modelSlug}`} target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform no-underline"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border2)" }}>
              <Eye className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              <span className="text-[11px] font-semibold hidden md:inline" style={{ color: "var(--text-muted)" }}>Profil</span>
            </a>
            <a href={`/m/${modelSlug}?edit=true`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform no-underline"
              style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)" }}>
              <Pencil className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              <span className="text-[11px] font-semibold hidden md:inline" style={{ color: "var(--accent)" }}>Edit</span>
            </a>
          </div>

          {/* ── Stats ── */}
          <div className="fade-up-1">
            <StatCards
              activeCodes={activeCodes.length}
              totalCodes={modelCodes.length}
              revenue={revenue}
              pendingCount={0}
              uniqueClients={uniqueClients}
            />
          </div>

          {/* ── Codes + Clients unified list ── */}
          <div className="fade-up-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Codes &amp; Clients</h2>
              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                {activeCodes.length} actif{activeCodes.length > 1 ? "s" : ""} · {clients.length} client{clients.length > 1 ? "s" : ""}
              </span>
            </div>
            <CodesList
              codes={modelCodes}
              clients={clients}
              onCopy={handleCopy}
              onRevoke={handleRevoke}
              onPause={handlePause}
              onReactivate={handleReactivate}
              onDelete={handleDelete}
              onUpdateClient={handleUpdateClient}
              onSendMessage={handleSendMessage}
            />
          </div>

          {/* ── Generate Modal ── */}
          <GenerateModal
            open={showGenerator}
            onClose={() => setShowGenerator(false)}
            onGenerate={handleGenerate}
            modelSlug={modelSlug}
          />

          {/* ── FAB (Floating Action Button) ── */}
          {fabOpen && (
            <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => setFabOpen(false)} />
          )}
          <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
            <div className={`flex flex-col items-center gap-2.5 transition-all duration-300 ${fabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
              <button
                onClick={() => { setShowGenerator(true); setFabOpen(false); }}
                className="fab-item flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                style={{ background: "var(--accent)", color: "#fff", transitionDelay: "50ms" }}>
                <KeyRound className="w-4 h-4" />
                <span className="text-xs font-semibold whitespace-nowrap">Code</span>
              </button>
            </div>
            <button
              onClick={() => setFabOpen(!fabOpen)}
              className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_rgba(201,168,76,0.4)]"
              style={{
                background: "linear-gradient(135deg, var(--rose), var(--accent))",
                transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)",
              }}>
              <Plus className="w-6 h-6 text-white" />
            </button>
          </div>

        </div>
      </div>
    </OsLayout>
  );
}
