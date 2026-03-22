"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Upload, Image, Trash2, Edit3, Save, Check, X, Eye, Plus, KeyRound, UserPlus, Camera } from "lucide-react";
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
const CONTENT_KEY = "heaven_yumi_uploads";
const PRESENCE_KEY = "heaven_yumi_presence";

function loadCodes(): AccessCode[] { try { return JSON.parse(localStorage.getItem(CODES_KEY) || "[]"); } catch { return []; } }
function saveCodes(codes: AccessCode[]) { localStorage.setItem(CODES_KEY, JSON.stringify(codes)); }
function loadPacks(): PackConfig[] { try { const r = localStorage.getItem(PACKS_KEY); if (r) return JSON.parse(r); } catch {} return DEFAULT_PACKS; }
function savePacks(packs: PackConfig[]) { localStorage.setItem(PACKS_KEY, JSON.stringify(packs)); fetch("/api/packs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packs }) }).catch(() => {}); }
function loadUploads(): UploadedContent[] { try { return JSON.parse(localStorage.getItem(CONTENT_KEY) || "[]"); } catch { return []; } }
function saveUploads(uploads: UploadedContent[]) { localStorage.setItem(CONTENT_KEY, JSON.stringify(uploads)); }
function loadPresence(): ModelPresence { try { const r = localStorage.getItem(PRESENCE_KEY); if (r) { const p = JSON.parse(r); return { online: p.online ?? true, status: p.status ?? "", avatar: p.avatar ?? "" }; } } catch {} return { online: true, status: "", avatar: "" }; }
function savePresence(p: ModelPresence, modelSlug?: string) {
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(p));
  if (modelSlug) {
    fetch(`/api/models/${modelSlug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ online: p.online, status: p.status, avatar: p.avatar }),
    }).catch(() => {});
  }
}

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
async function uploadToCloud(file: string, folder: string): Promise<{ url: string; public_id: string } | null> {
  try {
    const r = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file, folder }) });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
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
  const { currentModel, auth, authHeaders } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "yumi";

  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [packs, setPacks] = useState<PackConfig[]>(DEFAULT_PACKS);
  const [uploads, setUploads] = useState<UploadedContent[]>([]);
  const [presence, setPresence] = useState<ModelPresence>({ online: true, status: "", avatar: "" });

  const [tab, setTab] = useState<"codes" | "content">("codes");
  const [showGenerator, setShowGenerator] = useState(false);
  const [, setTick] = useState(0);

  // Upload form state
  const [uploadTier, setUploadTier] = useState("vip");
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadType] = useState<"photo" | "video" | "reel">("photo");
  const [uploadVisibility, setUploadVisibility] = useState<"pack" | "promo">("pack");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Content management
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingUpload, setEditingUpload] = useState<string | null>(null);
  const [previewUpload, setPreviewUpload] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // FAB state
  const [fabOpen, setFabOpen] = useState(false);

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

  // Upload handler
  const [uploading, setUploading] = useState(false);
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast("Fichier trop lourd (10MB max)", "error"); return; }
    setUploading(true);
    setUploadProgress(10);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const isVideo = file.type.startsWith("video/");
      const fileType: "photo" | "video" | "reel" = isVideo ? "video" : "photo";
      const folder = `heaven/${modelSlug}/${isVideo ? "videos" : "gallery"}`;

      setUploadProgress(30);
      const cloud = await uploadToCloud(base64, folder);
      setUploadProgress(70);
      const url = cloud?.url || base64;
      const cloudinaryId = cloud?.public_id || undefined;

      const newUpload: UploadedContent = {
        id: cloudinaryId || `upload-${Date.now()}`,
        tier: uploadVisibility === "promo" ? "promo" : uploadTier,
        type: fileType,
        label: uploadLabel.trim() || file.name.split(".")[0],
        dataUrl: url, uploadedAt: new Date().toISOString(),
        isNew: true, visibility: uploadVisibility,
      };
      setUploadProgress(85);
      const updated = [newUpload, ...uploads]; setUploads(updated); saveUploads(updated);
      await apiCreateUpload(modelSlug, newUpload);
      setUploadProgress(92);
      await fetch("/api/posts", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          model: modelSlug,
          content: newUpload.label || null,
          media_url: url,
          media_type: fileType === "video" ? "video" : "image",
          tier_required: uploadVisibility === "promo" ? "public" : uploadTier,
        }),
      }).catch(() => {});
      setUploadProgress(100);
      setUploadLabel("");
      setUploading(false); setUploadProgress(0);
      setFabOpen(false);
      showToast(`${fileType === "video" ? "Vidéo" : "Photo"} uploadée`);
    };
    reader.readAsDataURL(file); e.target.value = "";
  }, [uploads, uploadTier, uploadType, uploadLabel, uploadVisibility, modelSlug, showToast, authHeaders]);

  const handleDeleteUpload = useCallback((id: string) => {
    const u = uploads.filter(u => u.id !== id); setUploads(u); saveUploads(u); apiDeleteUpload(modelSlug, id);
    setConfirmDelete(null); setEditingUpload(null); setPreviewUpload(null);
    showToast("Contenu supprimé");
  }, [uploads, modelSlug, showToast]);

  const handleEditUpload = useCallback((id: string, updates: Partial<UploadedContent>) => {
    const u = uploads.map(item => item.id === id ? { ...item, ...updates } : item);
    setUploads(u); saveUploads(u);
    fetch("/api/uploads", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelSlug, id, updates }),
    }).catch(() => {});
    showToast("Modifications sauvegardées");
    setEditingUpload(null);
  }, [uploads, modelSlug, showToast]);

  // Avatar
  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const cloud = await uploadToCloud(base64, `heaven/${modelSlug}/avatar`);
      const url = cloud?.url || base64;
      const p = { ...presence, avatar: url }; setPresence(p); savePresence(p, modelSlug);
    };
    reader.readAsDataURL(file);
  }, [presence, modelSlug]);

  const TABS = [
    { id: "codes" as const, label: "Codes", count: activeCodes.length },
    { id: "content" as const, label: "Content", count: uploads.length },
  ];

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-28 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* ── Header ── */}
          <div className="flex items-center gap-3 fade-up">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center text-lg font-black cursor-pointer hover:scale-105 transition-transform"
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  background: presence.avatar ? "transparent" : "linear-gradient(135deg, var(--rose), var(--accent))",
                  color: "#fff",
                  boxShadow: "0 0 20px rgba(244,63,94,0.15)",
                }}>
                {presence.avatar ? (
                  <img src={presence.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  modelSlug.charAt(0).toUpperCase()
                )}
              </div>
              {presence.online && <span className="online-dot absolute -bottom-0.5 -right-0.5" />}
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold truncate" style={{ color: "var(--text)" }}>
                {auth?.display_name || modelSlug.toUpperCase()}
              </h1>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {auth?.role === "root" ? "Root Admin" : "Créatrice exclusive"}
              </p>
            </div>
            {/* View profile mini button */}
            <a href={`/m/${modelSlug}`} target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl glass flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform"
              title="Voir le profil">
              <Eye className="w-4 h-4" style={{ color: "var(--accent)" }} />
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

          {/* ── Tabs ── */}
          <div className="fade-up-2">
            <div className="segmented-control mb-5">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? "active" : ""}>
                  {t.label}
                  {t.count > 0 && (
                    <span className="ml-1.5 text-[9px] opacity-60">{t.count}</span>
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

            {/* CONTENT TAB */}
            {tab === "content" && (
              <div className="space-y-4">
                {/* Upload zone */}
                <div className="card-premium p-5">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-medium uppercase mb-2 block" style={{ color: "var(--text-muted)" }}>Dossier</label>
                      <div className="flex gap-2">
                        {Object.entries(TIER_COLORS).filter(([k]) => k !== "trial").map(([t, c]) => (
                          <button key={t} onClick={() => setUploadTier(t)}
                            className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer capitalize transition-all"
                            style={{
                              background: uploadTier === t ? `${c}20` : "rgba(255,255,255,0.03)",
                              color: uploadTier === t ? c : "var(--text-muted)",
                              border: `1px solid ${uploadTier === t ? `${c}40` : "var(--border2)"}`,
                            }}>{t}</button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setUploadVisibility("pack")}
                        className="flex-1 py-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all"
                        style={{ background: uploadVisibility === "pack" ? "var(--accent)" : "rgba(255,255,255,0.03)", color: uploadVisibility === "pack" ? "#fff" : "var(--text-muted)" }}>
                        Privé (abonnés)
                      </button>
                      <button onClick={() => setUploadVisibility("promo")}
                        className="flex-1 py-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all"
                        style={{ background: uploadVisibility === "promo" ? "var(--success)" : "rgba(255,255,255,0.03)", color: uploadVisibility === "promo" ? "#fff" : "var(--text-muted)" }}>
                        Public (promo)
                      </button>
                    </div>

                    {uploading && (
                      <div className="space-y-1.5">
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg3)" }}>
                          <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${uploadProgress}%`, background: "var(--accent)" }} />
                        </div>
                        <p className="text-[10px] text-center" style={{ color: "var(--accent)" }}>
                          {uploadProgress < 30 ? "Lecture..." : uploadProgress < 70 ? "Upload cloud..." : uploadProgress < 100 ? "Sauvegarde..." : "Terminé !"}
                        </p>
                      </div>
                    )}

                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer btn-gradient flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] transition-transform">
                      {uploading ? (
                        <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} /> Upload en cours...</>
                      ) : (
                        <><Upload className="w-4 h-4" /> Choisir un fichier</>
                      )}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                  </div>
                </div>

                {/* Content grid */}
                {uploads.length === 0 ? (
                  <div className="text-center py-12">
                    <Image className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aucun contenu</p>
                  </div>
                ) : (
                  <>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {uploads.length} contenu{uploads.length > 1 ? "s" : ""}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {uploads.map(item => {
                      const tierColor = TIER_COLORS[item.tier] || "#64748B";
                      return (
                        <div key={item.id}
                          className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform"
                          onClick={() => setPreviewUpload(item.id)}>
                          <img src={item.dataUrl} alt={item.label} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <div className="w-full">
                              <p className="text-[10px] font-medium text-white truncate">{item.label || "Sans titre"}</p>
                              <p className="text-[8px] text-white/60">{item.visibility === "promo" ? "Visible" : "Pack only"}</p>
                            </div>
                          </div>
                          <div className="absolute top-1.5 left-1.5">
                            <span className="badge text-[8px]" style={{ background: `${tierColor}20`, color: tierColor }}>{item.tier}</span>
                          </div>
                          {item.isNew && (
                            <div className="absolute top-1.5 right-1.5">
                              <span className="badge badge-success text-[8px]">NEW</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  </>
                )}

                {/* ── Preview / Edit panel ── */}
                {previewUpload && (() => {
                  const item = uploads.find(u => u.id === previewUpload);
                  if (!item) return null;
                  const tierColor = TIER_COLORS[item.tier] || "#64748B";
                  const isEditing = editingUpload === item.id;
                  return (
                    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop" onClick={() => { setPreviewUpload(null); setEditingUpload(null); }}>
                      <div className="w-full max-w-lg rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up"
                        style={{ background: "var(--surface)", maxHeight: "90vh", border: "1px solid var(--border2)" }}
                        onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center pt-3 md:hidden">
                          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
                        </div>
                        <div className="relative" style={{ maxHeight: "50vh" }}>
                          <img src={item.dataUrl} alt={item.label} className="w-full object-contain" style={{ maxHeight: "50vh" }} />
                          <div className="absolute top-3 right-3">
                            <button onClick={() => { setPreviewUpload(null); setEditingUpload(null); }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                              style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="p-5 space-y-4">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{item.label || "Sans titre"}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="badge text-[9px]" style={{ background: `${tierColor}15`, color: tierColor }}>{item.tier.toUpperCase()}</span>
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{item.type}</span>
                              <span className="text-[10px]" style={{ color: item.visibility === "promo" ? "var(--success)" : "var(--text-muted)" }}>
                                {item.visibility === "promo" ? "Visible" : "Pack only"}
                              </span>
                            </div>
                          </div>

                          {isEditing && (
                            <div className="space-y-3 pt-2" style={{ borderTop: "1px solid var(--border2)" }}>
                              <div>
                                <label className="text-[10px] font-medium uppercase mb-1 block" style={{ color: "var(--text-muted)" }}>Label</label>
                                <input defaultValue={item.label} id={`edit-label-${item.id}`}
                                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                                  style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                              </div>
                              <div>
                                <label className="text-[10px] font-medium uppercase mb-1 block" style={{ color: "var(--text-muted)" }}>Tier</label>
                                <div className="flex gap-2">
                                  {Object.entries(TIER_COLORS).filter(([k]) => k !== "trial").map(([t, c]) => (
                                    <button key={t} onClick={() => handleEditUpload(item.id, { tier: t })}
                                      className="flex-1 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer capitalize transition-all"
                                      style={{
                                        background: item.tier === t ? `${c}20` : "rgba(255,255,255,0.03)",
                                        color: item.tier === t ? c : "var(--text-muted)",
                                        border: `1px solid ${item.tier === t ? `${c}40` : "var(--border2)"}`,
                                      }}>{t}</button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-medium uppercase mb-1 block" style={{ color: "var(--text-muted)" }}>Visibilité</label>
                                <div className="flex gap-2">
                                  <button onClick={() => handleEditUpload(item.id, { visibility: "pack" })}
                                    className="flex-1 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer transition-all"
                                    style={{ background: item.visibility === "pack" ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)", color: item.visibility === "pack" ? "var(--accent)" : "var(--text-muted)" }}>
                                    Pack only
                                  </button>
                                  <button onClick={() => handleEditUpload(item.id, { visibility: "promo" })}
                                    className="flex-1 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer transition-all"
                                    style={{ background: item.visibility === "promo" ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.03)", color: item.visibility === "promo" ? "var(--success)" : "var(--text-muted)" }}>
                                    Visible (promo)
                                  </button>
                                </div>
                              </div>
                              <button onClick={() => {
                                const labelInput = document.getElementById(`edit-label-${item.id}`) as HTMLInputElement;
                                if (labelInput) handleEditUpload(item.id, { label: labelInput.value });
                                setEditingUpload(null);
                              }}
                                className="w-full py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] transition-transform"
                                style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                                <Save className="w-3 h-3" /> Sauvegarder
                              </button>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button onClick={() => setEditingUpload(isEditing ? null : item.id)}
                              className="flex-1 py-2.5 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] transition-transform"
                              style={{ background: "rgba(99,102,241,0.08)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.15)" }}>
                              <Edit3 className="w-3 h-3" /> {isEditing ? "Annuler" : "Modifier"}
                            </button>
                            {confirmDelete === item.id ? (
                              <div className="flex-1 flex gap-1.5">
                                <button onClick={() => handleDeleteUpload(item.id)}
                                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1"
                                  style={{ background: "rgba(239,68,68,0.15)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.25)" }}>
                                  Confirmer
                                </button>
                                <button onClick={() => setConfirmDelete(null)}
                                  className="px-3 py-2.5 rounded-xl text-xs cursor-pointer"
                                  style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
                                  Non
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(item.id)}
                                className="flex-1 py-2.5 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] transition-transform"
                                style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.15)" }}>
                                <Trash2 className="w-3 h-3" /> Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
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
              {/* Add Media */}
              <button
                onClick={() => { setTab("content"); fileInputRef.current?.click(); setFabOpen(false); }}
                className="fab-item flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                style={{ background: "var(--rose)", color: "#fff", transitionDelay: "50ms" }}>
                <Camera className="w-4 h-4" />
                <span className="text-xs font-semibold whitespace-nowrap">Média</span>
              </button>
              {/* Add Code */}
              <button
                onClick={() => { setShowGenerator(true); setFabOpen(false); }}
                className="fab-item flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                style={{ background: "var(--accent)", color: "#fff", transitionDelay: "100ms" }}>
                <KeyRound className="w-4 h-4" />
                <span className="text-xs font-semibold whitespace-nowrap">Code</span>
              </button>
              {/* Add Client */}
              <a href="/agence/clients"
                className="fab-item flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                style={{ background: "var(--success)", color: "#fff", transitionDelay: "150ms", textDecoration: "none" }}>
                <UserPlus className="w-4 h-4" />
                <span className="text-xs font-semibold whitespace-nowrap">Client</span>
              </a>
            </div>
            {/* FAB button */}
            <button
              onClick={() => setFabOpen(!fabOpen)}
              className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]"
              style={{
                background: "linear-gradient(135deg, var(--rose), var(--accent))",
                transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)",
              }}>
              <Plus className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* ── Toast ── */}
          {toast && (
            <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 px-5 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-slide-up"
              style={{
                background: toast.type === "success" ? "var(--success)" : "var(--danger)",
                color: "#fff",
              }}>
              {toast.type === "success" ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              {toast.message}
            </div>
          )}

        </div>
      </div>
    </OsLayout>
  );
}
