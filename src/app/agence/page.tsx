"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, KeyRound, Pencil, Eye, CheckCircle, Circle, RotateCcw, TrendingUp, Instagram, Camera as CameraIcon, Globe, MessageCircle, Heart, Pin, Newspaper, Wifi, WifiOff, Send, Compass, X } from "lucide-react";
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
  wise_url?: string;
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

interface FeedPost {
  id: string; model: string; content: string | null; media_url: string | null;
  media_type: string | null; tier_required: string; pinned: boolean;
  likes_count: number; comments_count: number; created_at: string;
}

// ── Defaults ──
const DEFAULT_PACKS: PackConfig[] = [
  { id: "vip", name: "VIP Glamour", price: 150, color: "#F43F5E", features: ["Pieds glamour/sales + accessoires", "Lingerie sexy + haul", "Teasing + demandes custom", "Dedicaces personnalisees"], bonuses: { fanvueAccess: false, freeNudeExpress: true, nudeDedicaceLevres: false, freeVideoOffer: false }, face: false, badge: null, active: true },
  { id: "gold", name: "Gold", price: 200, color: "#F59E0B", features: ["TOUT du VIP inclus", "Nudes complets", "Cosplay", "Sextape sans visage"], bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false }, face: false, badge: "Populaire", active: true },
  { id: "diamond", name: "Diamond", price: 250, color: "#7C3AED", features: ["TOUT du Gold inclus", "Nudes avec visage", "Cosplay avec visage", "Sextape avec visage", "Hard illimite"], bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false }, face: true, badge: null, active: true },
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

// ── Weekly checklist ──
const WEEKLY_TASKS = [
  { id: "ig-story", cat: "Contenu", label: "Publier 3+ stories Instagram", icon: Instagram },
  { id: "snap-story", cat: "Contenu", label: "Envoyer snaps prives aux VIP+", icon: CameraIcon },
  { id: "fanvue-post", cat: "Contenu", label: "Poster contenu exclusif Fanvue", icon: Globe },
  { id: "respond-dms", cat: "Engagement", label: "Repondre aux DMs en attente", icon: MessageCircle },
  { id: "check-codes", cat: "Gestion", label: "Verifier codes expirants cette semaine", icon: KeyRound },
  { id: "review-revenue", cat: "Gestion", label: "Analyser revenus de la semaine", icon: TrendingUp },
  { id: "promo-msg", cat: "Promotion", label: "Envoyer promo aux clients inactifs", icon: MessageCircle },
  { id: "new-content", cat: "Contenu", label: "Preparer shooting photo/video", icon: CameraIcon },
];

// ══════════ MAIN ══════════
export default function AgenceDashboard() {
  const { currentModel, auth, authHeaders } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "yumi";

  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [packs, setPacks] = useState<PackConfig[]>(DEFAULT_PACKS);
  const [modelInfo, setModelInfo] = useState<{ avatar?: string; online?: boolean; display_name?: string } | null>(null);

  const [showGenerator, setShowGenerator] = useState(false);
  const [prefillClient, setPrefillClient] = useState("");
  const [, setTick] = useState(0);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);

  // FAB sub-panels
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTier, setNewPostTier] = useState("public");
  const [posting, setPosting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // FAB state
  const [fabOpen, setFabOpen] = useState(false);

  // Weekly checklist
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(`heaven_checklist_${modelSlug}`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const toggleCheck = useCallback((id: string) => {
    setChecklist(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(`heaven_checklist_${modelSlug}`, JSON.stringify(next));
      return next;
    });
  }, [modelSlug]);
  const resetChecklist = useCallback(() => {
    setChecklist({});
    localStorage.removeItem(`heaven_checklist_${modelSlug}`);
  }, [modelSlug]);
  const checklistProgress = WEEKLY_TASKS.filter(t => checklist[t.id]).length;

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

    // Fetch recent feed posts
    fetch(`/api/posts?model=${modelSlug}`, { headers })
      .then(r => r.json())
      .then(d => setFeedPosts((d.posts || []).slice(0, 5)))
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

  const handleGenerateForClient = useCallback((clientName: string) => {
    setPrefillClient(clientName);
    setShowGenerator(true);
  }, []);

  const handleExtendCode = useCallback((code: string, extraHours: number) => {
    setCodes(prev => prev.map(c => {
      if (c.code !== code) return c;
      const currentExpiry = new Date(c.expiresAt).getTime();
      const base = currentExpiry > Date.now() ? currentExpiry : Date.now();
      return { ...c, expiresAt: new Date(base + extraHours * 3600000).toISOString(), active: true };
    }));
    fetch("/api/codes", { method: "PUT", headers: authHeaders(), body: JSON.stringify({ code, action: "extend", extra_hours: extraHours }) });
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

  // ── Toggle model online/offline ──
  const handleToggleStatus = useCallback(async () => {
    setStatusUpdating(true);
    const newStatus = !modelInfo?.online;
    try {
      const res = await fetch(`/api/models/${modelSlug}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ online: newStatus }),
      });
      if (res.ok) setModelInfo(prev => prev ? { ...prev, online: newStatus } : prev);
    } catch { /* */ }
    setStatusUpdating(false);
    setFabOpen(false);
  }, [modelSlug, modelInfo, authHeaders]);

  // ── Create new feed post ──
  const handleCreatePost = useCallback(async () => {
    if (!newPostContent.trim() || posting) return;
    setPosting(true);
    try {
      await fetch("/api/posts", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ model: modelSlug, content: newPostContent.trim(), tier_required: newPostTier }),
      });
      setNewPostContent("");
      setNewPostTier("public");
      setShowNewPost(false);
      // Refresh feed
      const res = await fetch(`/api/posts?model=${modelSlug}`, { headers: authHeaders() });
      const d = await res.json();
      setFeedPosts((d.posts || []).slice(0, 5));
    } catch { /* */ }
    setPosting(false);
  }, [newPostContent, newPostTier, posting, modelSlug, authHeaders]);

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
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: "var(--bg)", background: modelInfo?.online ? "#10B981" : "#6B7280" }}>
                {modelInfo?.online && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </span>
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
              style={{ background: "rgba(230,51,41,0.12)", border: "1px solid rgba(230,51,41,0.25)" }}>
              <Pencil className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              <span className="text-[11px] font-semibold hidden md:inline" style={{ color: "var(--accent)" }}>Edit</span>
            </a>
          </div>

          {/* ── Quick Actions ── */}
          <div className="flex gap-2 flex-wrap fade-up">
            {[
              { label: "Galerie", href: `/m/${modelSlug}?edit=true#gallery`, icon: CameraIcon, color: "var(--accent)" },
              { label: "Messages", href: "/agence/messages", icon: MessageCircle, color: "#F59E0B" },
              { label: "Finances", href: "/agence/finances", icon: TrendingUp, color: "var(--success)" },
              { label: "Pipeline", href: "/agence/pipeline", icon: Globe, color: "#7C3AED" },
            ].map(action => (
              <a key={action.label} href={action.href}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold no-underline transition-all hover:scale-105 active:scale-95"
                style={{ background: `${action.color}10`, border: `1px solid ${action.color}20`, color: action.color }}>
                <action.icon className="w-3.5 h-3.5" />
                {action.label}
              </a>
            ))}
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
              modelSlug={modelSlug}
              onCopy={handleCopy}
              onRevoke={handleRevoke}
              onPause={handlePause}
              onReactivate={handleReactivate}
              onDelete={handleDelete}
              onUpdateClient={handleUpdateClient}
              onSendMessage={handleSendMessage}
              onGenerateForClient={handleGenerateForClient}
              onExtendCode={handleExtendCode}
              wiseLinks={packs.filter(p => p.wise_url).map(p => ({ tier: p.id, url: p.wise_url! }))}
            />
          </div>

          {/* ── Feed + Checklist side by side ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 fade-up-3">
            {/* Feed column */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Newspaper className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  Feed
                </h2>
                <a href="/agence/messages" className="text-[10px] font-medium no-underline hover:opacity-70 transition-opacity" style={{ color: "var(--accent)" }}>
                  Voir tout
                </a>
              </div>
              {feedPosts.length === 0 ? (
                <div className="rounded-xl p-8 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aucun post</p>
                  <button onClick={() => setShowNewPost(true)} className="mt-2 text-[10px] font-semibold cursor-pointer hover:opacity-80" style={{ color: "var(--accent)", background: "none", border: "none" }}>
                    Publier un post
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {feedPosts.map(post => (
                    <div key={post.id} className="rounded-xl p-3 transition-all hover:scale-[1.005]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold"
                          style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", color: "#fff" }}>
                          {modelSlug.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{modelSlug.toUpperCase()}</span>
                            <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                              {(() => { const s = Math.floor((Date.now() - new Date(post.created_at).getTime()) / 1000); if (s < 3600) return `${Math.floor(s / 60)}min`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}j`; })()}
                            </span>
                            {post.pinned && <Pin className="w-2.5 h-2.5" style={{ color: "#F59E0B" }} />}
                            {post.tier_required !== "public" && (
                              <span className="px-1 py-0.5 rounded text-[7px] font-bold uppercase" style={{ background: "rgba(124,58,237,0.12)", color: "#7C3AED" }}>{post.tier_required}</span>
                            )}
                          </div>
                          {post.content && <p className="text-[11px] leading-relaxed mt-0.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{post.content}</p>}
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-[9px]" style={{ color: post.likes_count > 0 ? "#F43F5E" : "var(--text-muted)" }}>
                              <Heart className="w-2.5 h-2.5" fill={post.likes_count > 0 ? "#F43F5E" : "none"} /> {post.likes_count || 0}
                            </span>
                            <span className="flex items-center gap-1 text-[9px]" style={{ color: "var(--text-muted)" }}>
                              <MessageCircle className="w-2.5 h-2.5" /> {post.comments_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checklist column */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                  Checklist Hebdo
                  <span className="ml-2 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                    {checklistProgress}/{WEEKLY_TASKS.length}
                  </span>
                </h2>
                <button onClick={resetChecklist} className="flex items-center gap-1 text-[10px] font-medium cursor-pointer hover:opacity-70 transition-opacity"
                  style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>
              <div className="w-full h-1.5 rounded-full mb-3" style={{ background: "var(--bg2)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(checklistProgress / WEEKLY_TASKS.length) * 100}%`, background: checklistProgress === WEEKLY_TASKS.length ? "var(--success)" : "var(--accent)" }} />
              </div>
              <div className="space-y-1.5">
                {WEEKLY_TASKS.map(task => (
                  <button key={task.id} onClick={() => toggleCheck(task.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left cursor-pointer transition-all duration-200 hover:scale-[1.01]"
                    style={{ background: checklist[task.id] ? "rgba(22,163,74,0.06)" : "var(--surface)", border: `1px solid ${checklist[task.id] ? "rgba(22,163,74,0.15)" : "var(--border)"}` }}>
                    {checklist[task.id]
                      ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--success)" }} />
                      : <Circle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--border3)" }} />
                    }
                    <span className="text-[11px] font-medium flex-1" style={{ color: checklist[task.id] ? "var(--success)" : "var(--text-secondary)", textDecoration: checklist[task.id] ? "line-through" : "none" }}>
                      {task.label}
                    </span>
                    <span className="text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                      style={{ background: "var(--bg2)", color: "var(--text-muted)" }}>
                      {task.cat}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Generate Modal ── */}
          <GenerateModal
            open={showGenerator}
            onClose={() => { setShowGenerator(false); setPrefillClient(""); }}
            onGenerate={handleGenerate}
            modelSlug={modelSlug}
            prefillClient={prefillClient}
          />

          {/* ── FAB Radial Menu ── */}
          {fabOpen && (
            <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setFabOpen(false)}
              style={{ animation: "fadeIn 0.2s ease" }} />
          )}
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fabItemIn { from { opacity: 0; transform: scale(0.5) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          `}</style>
          <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 flex flex-col items-end gap-3">
            {/* Radial items */}
            <div className={`flex flex-col items-end gap-2.5 transition-all duration-300 ${fabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"}`}>
              {[
                {
                  label: modelInfo?.online ? "Passer Offline" : "Passer Online",
                  icon: modelInfo?.online ? WifiOff : Wifi,
                  color: modelInfo?.online ? "#EF4444" : "#10B981",
                  action: handleToggleStatus,
                  delay: "200ms",
                  loading: statusUpdating,
                },
                {
                  label: "Nouveau Post",
                  icon: Send,
                  color: "#7C3AED",
                  action: () => { setShowNewPost(true); setFabOpen(false); },
                  delay: "150ms",
                },
                {
                  label: "Generer Code",
                  icon: KeyRound,
                  color: "var(--accent)",
                  action: () => { setShowGenerator(true); setFabOpen(false); },
                  delay: "100ms",
                },
                {
                  label: "Strategie",
                  icon: Compass,
                  color: "#F59E0B",
                  action: () => { window.location.href = "/agence/strategie"; },
                  delay: "50ms",
                },
              ].map(item => (
                <button key={item.label}
                  onClick={item.action}
                  disabled={item.loading}
                  className="flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                  style={{ background: item.color, color: "#fff", animation: fabOpen ? `fabItemIn 0.3s ease ${item.delay} both` : "none" }}>
                  {item.loading ? (
                    <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
                  ) : (
                    <item.icon className="w-4 h-4" />
                  )}
                  <span className="text-xs font-semibold whitespace-nowrap">{item.label}</span>
                </button>
              ))}
            </div>
            {/* Main FAB */}
            <button
              onClick={() => setFabOpen(!fabOpen)}
              className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_rgba(230,51,41,0.4)]"
              style={{
                background: "linear-gradient(135deg, var(--rose), var(--accent))",
                transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)",
              }}>
              <Plus className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* ── New Post Sheet ── */}
          {showNewPost && (
            <>
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewPost(false)} />
              <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:rounded-2xl overflow-hidden rounded-t-2xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border2)", boxShadow: "0 -8px 40px rgba(0,0,0,0.3)" }}>
                <div className="flex justify-center pt-3 md:hidden">
                  <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Nouveau Post</h3>
                    <button onClick={() => setShowNewPost(false)} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.04)" }}>
                      <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                      style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", color: "#fff" }}>
                      {modelSlug.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={newPostContent}
                        onChange={e => setNewPostContent(e.target.value)}
                        placeholder="Quoi de neuf ?"
                        rows={4}
                        className="w-full text-[13px] leading-relaxed outline-none resize-none rounded-lg p-3"
                        style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
                        autoFocus
                      />
                      <div className="flex items-center justify-between mt-3">
                        <select value={newPostTier} onChange={e => setNewPostTier(e.target.value)}
                          className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
                          style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}>
                          <option value="public">Public</option>
                          <option value="vip">VIP</option>
                          <option value="gold">Gold</option>
                          <option value="diamond">Diamond</option>
                          <option value="platinum">Platinum</option>
                        </select>
                        <button onClick={handleCreatePost}
                          disabled={!newPostContent.trim() || posting}
                          className="px-5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-30 hover:scale-105 active:scale-95 transition-transform"
                          style={{ background: "var(--accent)", color: "#fff" }}>
                          {posting ? "..." : "Publier"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </OsLayout>
  );
}
