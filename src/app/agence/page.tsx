"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Upload, Image, Star, ThumbsUp, ThumbsDown, Wifi, WifiOff, Edit3, Trash2, ToggleLeft, ToggleRight, Save } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { StatCards } from "@/components/cockpit/stat-cards";
import { QuickActions } from "@/components/cockpit/quick-actions";
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

interface Review {
  id: string; tier: string; author: string; content: string;
  rating: number; validated: boolean; createdAt: string; bonusGranted: boolean;
}

interface UploadedContent {
  id: string; tier: string; type: "photo" | "video" | "reel"; label: string;
  dataUrl: string; uploadedAt: string; isNew?: boolean;
  visibility?: "pack" | "promo"; tokenPrice?: number;
}

interface ModelPresence {
  online: boolean; status: string; avatar: string;
}

// ── Defaults ──
const DEFAULT_PACKS: PackConfig[] = [
  { id: "vip", name: "VIP Glamour", price: 150, color: "#F43F5E", features: ["Pieds glamour/sales + accessoires", "Lingerie sexy + haul", "Teasing + demandes custom", "Dedicaces personnalisees"], bonuses: { fanvueAccess: false, freeNudeExpress: true, nudeDedicaceLevres: false, freeVideoOffer: false }, face: false, badge: null, active: true },
  { id: "gold", name: "Gold", price: 200, color: "#F59E0B", features: ["TOUT du VIP inclus", "Nudes complets", "Cosplay", "Sextape sans visage"], bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false }, face: false, badge: "Populaire", active: true },
  { id: "diamond", name: "Diamond", price: 250, color: "#6366F1", features: ["TOUT du Gold inclus", "Nudes avec visage", "Cosplay avec visage", "Sextape avec visage", "Hard illimite"], bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false }, face: true, badge: null, active: true },
  { id: "platinum", name: "Platinum All-Access", price: 320, color: "#A78BFA", features: ["Acces TOTAL aux 3 packs", "Demandes personnalisees", "Video calls prives", "Contenu exclusif illimite"], bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: true }, face: true, badge: "Ultimate", active: true },
];

const TIER_COLORS: Record<string, string> = {
  vip: "#F43F5E", gold: "#F59E0B", diamond: "#6366F1", platinum: "#A78BFA", trial: "#64748B",
};

// ── Storage ──
const CODES_KEY = "heaven_gallery_codes";
const PACKS_KEY = "heaven_yumi_packs";
const REVIEWS_KEY = "heaven_yumi_reviews";
const CONTENT_KEY = "heaven_yumi_uploads";
const PRESENCE_KEY = "heaven_yumi_presence";

function loadCodes(): AccessCode[] { try { return JSON.parse(localStorage.getItem(CODES_KEY) || "[]"); } catch { return []; } }
function saveCodes(codes: AccessCode[]) { localStorage.setItem(CODES_KEY, JSON.stringify(codes)); }
function loadPacks(): PackConfig[] { try { const r = localStorage.getItem(PACKS_KEY); if (r) return JSON.parse(r); } catch {} return DEFAULT_PACKS; }
function savePacks(packs: PackConfig[]) { localStorage.setItem(PACKS_KEY, JSON.stringify(packs)); fetch("/api/packs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packs }) }).catch(() => {}); }
function loadReviews(): Review[] { try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]"); } catch { return []; } }
function saveReviewsData(reviews: Review[]) { localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews)); }
function loadUploads(): UploadedContent[] { try { return JSON.parse(localStorage.getItem(CONTENT_KEY) || "[]"); } catch { return []; } }
function saveUploads(uploads: UploadedContent[]) { localStorage.setItem(CONTENT_KEY, JSON.stringify(uploads)); }
function loadPresence(): ModelPresence { try { const r = localStorage.getItem(PRESENCE_KEY); if (r) { const p = JSON.parse(r); return { online: p.online ?? true, status: p.status ?? "", avatar: p.avatar ?? "" }; } } catch {} return { online: true, status: "", avatar: "" }; }
function savePresence(p: ModelPresence) { localStorage.setItem(PRESENCE_KEY, JSON.stringify(p)); }

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
async function apiFetchUploads(model: string): Promise<UploadedContent[]> {
  try { const r = await fetch(`/api/uploads?model=${model}`); if (!r.ok) return []; const d = await r.json(); return d.uploads || []; } catch { return []; }
}
async function apiCreateUpload(model: string, upload: UploadedContent): Promise<boolean> {
  try { const r = await fetch("/api/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...upload, model }) }); return r.ok; } catch { return false; }
}
async function apiDeleteUpload(model: string, id: string): Promise<boolean> {
  try { const r = await fetch(`/api/uploads?model=${model}&id=${encodeURIComponent(id)}`, { method: "DELETE" }); return r.ok; } catch { return false; }
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
  const [uploads, setUploads] = useState<UploadedContent[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [presence, setPresence] = useState<ModelPresence>({ online: true, status: "", avatar: "" });

  const [tab, setTab] = useState<"codes" | "packs" | "content" | "reviews" | "profile">("codes");
  const [showGenerator, setShowGenerator] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [, setTick] = useState(0);

  // Upload form state
  const [uploadTier, setUploadTier] = useState("vip");
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadType, setUploadType] = useState<"photo" | "video" | "reel">("photo");
  const [uploadVisibility, setUploadVisibility] = useState<"pack" | "promo">("pack");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Pack editing
  const [editingPack, setEditingPack] = useState<string | null>(null);

  // ── Load data ──
  useEffect(() => {
    setPresence(loadPresence());

    apiFetchCodes(modelSlug).then(apiCodes => {
      setCodes(apiCodes); saveCodes(apiCodes);
    }).catch(() => setCodes(loadCodes()));

    apiFetchUploads(modelSlug).then(apiUploads => {
      setUploads(apiUploads); saveUploads(apiUploads);
    }).catch(() => setUploads(loadUploads()));

    fetch(`/api/packs?model=${modelSlug}`).then(r => r.json()).then(d => {
      if (d.packs?.length > 0) { setPacks(d.packs); savePacks(d.packs); }
      else setPacks(loadPacks());
    }).catch(() => setPacks(loadPacks()));

    setReviews(loadReviews());
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
  const pendingReviews = useMemo(() => reviews.filter(r => !r.validated), [reviews]);

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

  // Upload handler
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Max 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const newUpload: UploadedContent = {
        id: `upload-${Date.now()}`, tier: uploadVisibility === "promo" ? "promo" : uploadTier,
        type: uploadType, label: uploadLabel.trim() || file.name.split(".")[0],
        dataUrl: reader.result as string, uploadedAt: new Date().toISOString(),
        isNew: true, visibility: uploadVisibility,
      };
      const updated = [newUpload, ...uploads]; setUploads(updated); saveUploads(updated);
      apiCreateUpload(modelSlug, newUpload); setUploadLabel(""); setShowUploadForm(false);
    };
    reader.readAsDataURL(file); e.target.value = "";
  }, [uploads, uploadTier, uploadType, uploadLabel, uploadVisibility, modelSlug]);

  const handleDeleteUpload = useCallback((id: string) => {
    const u = uploads.filter(u => u.id !== id); setUploads(u); saveUploads(u); apiDeleteUpload(modelSlug, id);
  }, [uploads, modelSlug]);

  // Review handlers
  const handleValidateReview = useCallback((id: string) => {
    const u = reviews.map(r => r.id === id ? { ...r, validated: true } : r);
    setReviews(u); saveReviewsData(u);
  }, [reviews]);
  const handleRejectReview = useCallback((id: string) => {
    const u = reviews.filter(r => r.id !== id); setReviews(u); saveReviewsData(u);
  }, [reviews]);

  // Avatar
  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const p = { ...presence, avatar: reader.result as string }; setPresence(p); savePresence(p); };
    reader.readAsDataURL(file);
  }, [presence]);

  const TABS = [
    { id: "codes" as const, label: "Codes" },
    { id: "packs" as const, label: "Packs" },
    { id: "content" as const, label: "Content" },
    { id: "reviews" as const, label: "Reviews" },
    { id: "profile" as const, label: "Profile" },
  ];

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* ── Header ── */}
          <div className="flex items-center gap-4 fade-up">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center text-xl font-black cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  background: presence.avatar ? "transparent" : "linear-gradient(135deg, var(--rose), var(--accent))",
                  color: "#fff",
                  boxShadow: "0 0 24px rgba(244,63,94,0.2)",
                }}>
                {presence.avatar ? (
                  <img src={presence.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  modelSlug.charAt(0).toUpperCase()
                )}
              </div>
              {presence.online && (
                <span className="online-dot absolute -bottom-0.5 -right-0.5" />
              )}
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>
                  {auth?.display_name || modelSlug.toUpperCase()}
                </h1>
                <span className="badge badge-success text-[9px]">Verified</span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {auth?.role === "root" ? "Root Admin" : "Créatrice exclusive"}
              </p>
            </div>
            <button
              onClick={() => setShowGenerator(true)}
              className="btn-gradient px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              + New Code
            </button>
          </div>

          {/* ── Stats ── */}
          <div className="fade-up-1">
            <StatCards
              activeCodes={activeCodes.length}
              totalCodes={modelCodes.length}
              revenue={revenue}
              pendingCount={pendingReviews.length}
            />
          </div>

          {/* ── Quick Actions ── */}
          <div className="fade-up-2">
            <QuickActions
              onGenerateCode={() => setShowGenerator(true)}
              onUploadContent={() => { setTab("content"); setShowUploadForm(true); }}
              modelSlug={modelSlug}
            />
          </div>

          {/* ── Tab Section ── */}
          <div className="fade-up-3">
            <div className="segmented-control mb-6">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? "active" : ""}>
                  {t.label}
                  {t.id === "reviews" && pendingReviews.length > 0 && (
                    <span className="ml-1 w-4 h-4 inline-flex items-center justify-center rounded-full text-[9px] font-bold"
                      style={{ background: "var(--danger)", color: "#fff" }}>
                      {pendingReviews.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* CODES TAB */}
            {tab === "codes" && (
              <CodesList
                codes={modelCodes}
                onCopy={handleCopy}
                onRevoke={handleRevoke}
                onPause={handlePause}
                onReactivate={handleReactivate}
                onDelete={handleDelete}
              />
            )}

            {/* PACKS TAB */}
            {tab === "packs" && (
              <div className="space-y-3">
                {packs.map(pack => (
                  <div key={pack.id} className="card-premium p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`tier-dot ${pack.id}`} />
                        <h3 className="text-sm font-bold" style={{ color: pack.color }}>{pack.name}</h3>
                        {pack.badge && (
                          <span className="badge" style={{ background: `${pack.color}15`, color: pack.color }}>{pack.badge}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black tabular-nums" style={{ color: pack.color }}>{pack.price}€</span>
                        <button onClick={() => setEditingPack(editingPack === pack.id ? null : pack.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                          style={{ background: "rgba(255,255,255,0.04)" }}>
                          <Edit3 className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                        </button>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {pack.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                          <Star className="w-3 h-3 flex-shrink-0" style={{ color: pack.color }} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {editingPack === pack.id && (
                      <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--border2)" }}>
                        <div>
                          <label className="text-[10px] font-medium uppercase mb-1 block" style={{ color: "var(--text-muted)" }}>Price (€)</label>
                          <input type="number" value={pack.price}
                            onChange={e => { const u = packs.map(p => p.id === pack.id ? { ...p, price: Number(e.target.value) } : p); setPacks(u); }}
                            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                            style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Active</span>
                          <button onClick={() => { const u = packs.map(p => p.id === pack.id ? { ...p, active: !p.active } : p); setPacks(u); }}
                            className="cursor-pointer" style={{ color: pack.active ? "var(--success)" : "var(--text-muted)" }}>
                            {pack.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </div>
                        <button onClick={() => { savePacks(packs); setEditingPack(null); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                          style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                          <Save className="w-3 h-3" /> Save
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* CONTENT TAB */}
            {tab === "content" && (
              <div className="space-y-4">
                {/* Upload form */}
                {showUploadForm && (
                  <div className="card-premium p-5 gradient-border">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Upload Content</h3>
                    <div className="space-y-3">
                      <input value={uploadLabel} onChange={e => setUploadLabel(e.target.value)} placeholder="Label (optional)"
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                      <div className="flex gap-2">
                        {(["photo", "video", "reel"] as const).map(t => (
                          <button key={t} onClick={() => setUploadType(t)}
                            className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer capitalize"
                            style={{
                              background: uploadType === t ? "var(--accent)" : "rgba(255,255,255,0.03)",
                              color: uploadType === t ? "#fff" : "var(--text-muted)",
                              border: `1px solid ${uploadType === t ? "var(--accent)" : "var(--border2)"}`,
                            }}>{t}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        {Object.entries(TIER_COLORS).filter(([k]) => k !== "trial").map(([t, c]) => (
                          <button key={t} onClick={() => setUploadTier(t)}
                            className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer capitalize"
                            style={{
                              background: uploadTier === t ? `${c}20` : "rgba(255,255,255,0.03)",
                              color: uploadTier === t ? c : "var(--text-muted)",
                              border: `1px solid ${uploadTier === t ? `${c}40` : "var(--border2)"}`,
                            }}>{t}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setUploadVisibility("pack")}
                          className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer"
                          style={{ background: uploadVisibility === "pack" ? "var(--accent)" : "rgba(255,255,255,0.03)", color: uploadVisibility === "pack" ? "#fff" : "var(--text-muted)" }}>
                          Pack only
                        </button>
                        <button onClick={() => setUploadVisibility("promo")}
                          className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer"
                          style={{ background: uploadVisibility === "promo" ? "var(--success)" : "rgba(255,255,255,0.03)", color: uploadVisibility === "promo" ? "#fff" : "var(--text-muted)" }}>
                          Promo (free)
                        </button>
                      </div>
                      <button onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer btn-gradient flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" /> Choose File
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                    </div>
                  </div>
                )}

                {!showUploadForm && (
                  <button onClick={() => setShowUploadForm(true)}
                    className="w-full py-3 rounded-xl text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
                    style={{ background: "rgba(99,102,241,0.08)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.2)" }}>
                    <Upload className="w-4 h-4" /> Upload Content
                  </button>
                )}

                {/* Content grid */}
                {uploads.length === 0 ? (
                  <div className="text-center py-16">
                    <Image className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No content uploaded</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {uploads.map(item => (
                      <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden group">
                        <img src={item.dataUrl} alt={item.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button onClick={() => handleDeleteUpload(item.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                            style={{ background: "rgba(239,68,68,0.9)", color: "#fff" }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="absolute top-1.5 left-1.5">
                          <span className="badge text-[8px]" style={{ background: `${TIER_COLORS[item.tier] || "#64748B"}20`, color: TIER_COLORS[item.tier] || "#64748B" }}>
                            {item.tier}
                          </span>
                        </div>
                        {item.isNew && (
                          <div className="absolute top-1.5 right-1.5">
                            <span className="badge badge-success text-[8px]">NEW</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REVIEWS TAB */}
            {tab === "reviews" && (
              <div className="space-y-3">
                {pendingReviews.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Pending</h3>
                    {pendingReviews.map(r => (
                      <div key={r.id} className="card-premium p-4 mb-2 gradient-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{r.author}</span>
                            <span className="badge" style={{ background: `${TIER_COLORS[r.tier]}15`, color: TIER_COLORS[r.tier] }}>{r.tier}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className="w-3 h-3" style={{ color: i < r.rating ? "#F59E0B" : "var(--border)" }} fill={i < r.rating ? "#F59E0B" : "none"} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>{r.content}</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleValidateReview(r.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                            style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                            <ThumbsUp className="w-3 h-3" /> Approve
                          </button>
                          <button onClick={() => handleRejectReview(r.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                            style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
                            <ThumbsDown className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {reviews.filter(r => r.validated).length === 0 && pendingReviews.length === 0 ? (
                  <div className="text-center py-16">
                    <Star className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No reviews yet</p>
                  </div>
                ) : (
                  reviews.filter(r => r.validated).map(r => (
                    <div key={r.id} className="card-premium p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{r.author}</span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3" style={{ color: i < r.rating ? "#F59E0B" : "var(--border)" }} fill={i < r.rating ? "#F59E0B" : "none"} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.content}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* PROFILE TAB */}
            {tab === "profile" && (
              <div className="space-y-4">
                <div className="card-premium p-5">
                  <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Presence</h3>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Online status</span>
                    <button onClick={() => { const p = { ...presence, online: !presence.online }; setPresence(p); savePresence(p); }}
                      className="flex items-center gap-2 cursor-pointer" style={{ color: presence.online ? "var(--success)" : "var(--text-muted)" }}>
                      {presence.online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                      <span className="text-xs font-medium">{presence.online ? "Online" : "Offline"}</span>
                    </button>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase mb-1 block" style={{ color: "var(--text-muted)" }}>Status message</label>
                    <input value={presence.status}
                      onChange={e => { const p = { ...presence, status: e.target.value }; setPresence(p); savePresence(p); }}
                      placeholder="What's happening..."
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Generate Modal ── */}
          <GenerateModal
            open={showGenerator}
            onClose={() => setShowGenerator(false)}
            onGenerate={handleGenerate}
          />

        </div>
      </div>
    </OsLayout>
  );
}
