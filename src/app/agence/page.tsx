"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, KeyRound, UserPlus, Pencil } from "lucide-react";
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

// ── Defaults ──
const DEFAULT_PACKS: PackConfig[] = [
  { id: "vip", name: "VIP Glamour", price: 150, color: "#F43F5E", features: ["Pieds glamour/sales + accessoires", "Lingerie sexy + haul", "Teasing + demandes custom", "Dedicaces personnalisees"], bonuses: { fanvueAccess: false, freeNudeExpress: true, nudeDedicaceLevres: false, freeVideoOffer: false }, face: false, badge: null, active: true },
  { id: "gold", name: "Gold", price: 200, color: "#F59E0B", features: ["TOUT du VIP inclus", "Nudes complets", "Cosplay", "Sextape sans visage"], bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false }, face: false, badge: "Populaire", active: true },
  { id: "diamond", name: "Diamond", price: 250, color: "#6366F1", features: ["TOUT du Gold inclus", "Nudes avec visage", "Cosplay avec visage", "Sextape avec visage", "Hard illimite"], bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false }, face: true, badge: null, active: true },
  { id: "platinum", name: "Platinum All-Access", price: 320, color: "#A78BFA", features: ["Acces TOTAL aux 3 packs", "Demandes personnalisees", "Video calls prives", "Contenu exclusif illimite"], bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: true }, face: true, badge: "Ultimate", active: true },
];

// ── Storage ──
const CODES_KEY = "heaven_gallery_codes";

function loadCodes(): AccessCode[] { try { return JSON.parse(localStorage.getItem(CODES_KEY) || "[]"); } catch { return []; } }
function saveCodes(codes: AccessCode[]) { localStorage.setItem(CODES_KEY, JSON.stringify(codes)); }

// ── API helpers ──
async function apiFetchCodes(model: string): Promise<AccessCode[]> {
  try { const r = await fetch(`/api/codes?model=${model}`); if (!r.ok) return []; const d = await r.json(); return d.codes || []; } catch { return []; }
}
async function apiCreateCode(code: AccessCode): Promise<boolean> {
  try { const r = await fetch("/api/codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(code) }); return r.ok; } catch { return false; }
}
async function apiUpdateCode(code: string, action: string, extra?: Record<string, unknown>): Promise<boolean> {
  try { const r = await fetch("/api/codes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, action, ...extra }) }); return r.ok; } catch { return false; }
}
async function apiDeleteCode(code: string): Promise<boolean> {
  try { const r = await fetch(`/api/codes?code=${encodeURIComponent(code)}`, { method: "DELETE" }); return r.ok; } catch { return false; }
}
function generateCodeString(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = ""; for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return `YUM-${new Date().getFullYear()}-${r}`;
}

function isExpired(expiresAt: string): boolean { return new Date(expiresAt).getTime() <= Date.now(); }

// ══════════ MAIN ══════════
export default function AgenceDashboard() {
  const { currentModel, auth } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "yumi";

  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [packs, setPacks] = useState<PackConfig[]>(DEFAULT_PACKS);
  const [modelInfo, setModelInfo] = useState<{ avatar?: string; online?: boolean; display_name?: string } | null>(null);

  const [showGenerator, setShowGenerator] = useState(false);
  const [, setTick] = useState(0);

  // FAB state
  const [fabOpen, setFabOpen] = useState(false);

  // ── Load data ──
  useEffect(() => {
    apiFetchCodes(modelSlug).then(apiCodes => {
      setCodes(apiCodes); saveCodes(apiCodes);
    }).catch(() => setCodes(loadCodes()));

    fetch(`/api/packs?model=${modelSlug}`).then(r => r.json()).then(d => {
      if (d.packs?.length > 0) setPacks(d.packs);
    }).catch(() => {});

    fetch(`/api/models/${modelSlug}`).then(r => r.json()).then(d => {
      setModelInfo(d);
    }).catch(() => {});
  }, [modelSlug]);

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

  // ── Actions ──
  const handleGenerate = useCallback((data: { client: string; platform: string; tier: string; duration: number; type: "paid" | "promo" | "gift" }) => {
    const code = generateCodeString();
    const pack = packs.find(p => p.id === data.tier);
    const newCode: AccessCode = {
      code, model: modelSlug, client: data.client, platform: data.platform,
      role: "client", tier: data.tier, pack: pack?.name || data.tier,
      type: data.type, duration: data.duration, expiresAt: new Date(Date.now() + data.duration * 3600000).toISOString(),
      created: new Date().toISOString(), used: false, active: true, revoked: false, isTrial: false, lastUsed: null,
    };
    const updated = [...codes, newCode];
    setCodes(updated); saveCodes(updated);
    apiCreateCode(newCode);
    return code;
  }, [codes, packs, modelSlug]);

  const handleCopy = useCallback((code: string) => { navigator.clipboard.writeText(code); }, []);
  const handleRevoke = useCallback((code: string) => {
    const u = codes.map(c => c.code === code ? { ...c, revoked: true, active: false } : c);
    setCodes(u); saveCodes(u); apiUpdateCode(code, "revoke");
  }, [codes]);
  const handlePause = useCallback((code: string) => {
    const u = codes.map(c => c.code === code ? { ...c, active: false } : c);
    setCodes(u); saveCodes(u); apiUpdateCode(code, "pause");
  }, [codes]);
  const handleReactivate = useCallback((code: string) => {
    const u = codes.map(c => c.code === code ? { ...c, active: true, revoked: false } : c);
    setCodes(u); saveCodes(u); apiUpdateCode(code, "reactivate");
  }, [codes]);
  const handleDelete = useCallback((code: string) => {
    const u = codes.filter(c => c.code !== code);
    setCodes(u); saveCodes(u); apiDeleteCode(code);
  }, [codes]);

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
                {auth?.role === "root" ? "Root Admin" : "Créatrice exclusive"}
              </p>
            </div>
            {/* Edit Profile button */}
            <a href={`/m/${modelSlug}?edit=true`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform no-underline"
              style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)" }}>
              <Pencil className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              <span className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>Edit Profile</span>
            </a>
          </div>

          {/* ── Stats ── */}
          <div className="fade-up-1">
            <StatCards
              activeCodes={activeCodes.length}
              totalCodes={modelCodes.length}
              revenue={revenue}
              pendingCount={0}
            />
          </div>

          {/* ── Codes List (no tabs needed) ── */}
          <div className="fade-up-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Codes d&apos;accès</h2>
              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{activeCodes.length} actif{activeCodes.length > 1 ? "s" : ""}</span>
            </div>
            <CodesList
              codes={modelCodes}
              onCopy={handleCopy}
              onRevoke={handleRevoke}
              onPause={handlePause}
              onReactivate={handleReactivate}
              onDelete={handleDelete}
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
            {/* FAB menu items */}
            <div className={`flex flex-col items-center gap-2.5 transition-all duration-300 ${fabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
              {/* Add Code */}
              <button
                onClick={() => { setShowGenerator(true); setFabOpen(false); }}
                className="fab-item flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                style={{ background: "var(--accent)", color: "#fff", transitionDelay: "50ms" }}>
                <KeyRound className="w-4 h-4" />
                <span className="text-xs font-semibold whitespace-nowrap">Code</span>
              </button>
              {/* Add Client */}
              <a href="/agence/clients"
                className="fab-item flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                style={{ background: "var(--success)", color: "#fff", transitionDelay: "100ms", textDecoration: "none" }}>
                <UserPlus className="w-4 h-4" />
                <span className="text-xs font-semibold whitespace-nowrap">Client</span>
              </a>
            </div>
            {/* FAB button */}
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
