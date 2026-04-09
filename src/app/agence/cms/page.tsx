"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft, Users, Key, Eye, Copy, RefreshCw, Shield, Settings,
  Camera, Globe, Image, FileText, Plus, X, CheckCircle2, Clock,
  ExternalLink, Lock, User, Trash2, Edit3
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import Link from "next/link";

/* ── Types ── */
interface TempCode {
  code: string;
  createdAt: number;
  expiresAt: number;
  label: string;
  used: boolean;
}

interface Collaborator {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  model: string;
  active: boolean;
}

interface ModelPage {
  id: string;
  model: string;
  title: string;
  slug: string;
  status: "published" | "draft" | "private";
  content: Record<string, unknown>;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/* ── Helpers ── */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code.slice(0, 4) + "-" + code.slice(4);
}

/* ── Main CMS Dashboard ── */
export default function AgenceCmsPage() {
  const { currentModel, auth } = useModel();
  const modelSlug = currentModel || auth?.model_slug || null;

  const [tab, setTab] = useState<"pages" | "codes" | "collaborators">("pages");
  const [codes, setCodes] = useState<TempCode[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pages, setPages] = useState<ModelPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingCollabs, setLoadingCollabs] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [showNewCollab, setShowNewCollab] = useState(false);
  const [collabForm, setCollabForm] = useState({ name: "", role: "", email: "" });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ── Fetch pages from DB ──
  const fetchPages = useCallback(async () => {
    if (!modelSlug) return;
    setLoadingPages(true);
    try {
      const res = await fetch(`/api/cms/pages?model=${modelSlug}`);
      if (res.ok) {
        const json = await res.json();
        setPages(json.pages || []);
      }
    } catch (err) {
      console.error("[CMS] fetch pages error:", err);
    } finally {
      setLoadingPages(false);
    }
  }, [modelSlug]);

  // ── Fetch collaborators from DB ──
  const fetchCollaborators = useCallback(async () => {
    if (!modelSlug) return;
    setLoadingCollabs(true);
    try {
      const res = await fetch(`/api/cms/collaborators?model=${modelSlug}`);
      if (res.ok) {
        const json = await res.json();
        setCollaborators(json.collaborators || []);
      }
    } catch (err) {
      console.error("[CMS] fetch collaborators error:", err);
    } finally {
      setLoadingCollabs(false);
    }
  }, [modelSlug]);

  // ── Fetch codes (existing API) ──
  const fetchCodes = useCallback(async () => {
    if (!modelSlug) return;
    try {
      const res = await fetch(`/api/codes?model=${modelSlug}`);
      if (res.ok) {
        const json = await res.json();
        const mapped = (json.codes || []).map((c: Record<string, unknown>) => ({
          code: c.code as string,
          createdAt: new Date(c.created as string).getTime(),
          expiresAt: new Date(c.expiresAt as string).getTime(),
          label: (c.client as string) || "Acces temporaire",
          used: c.used as boolean,
        }));
        setCodes(mapped);
      }
    } catch (err) {
      console.error("[CMS] fetch codes error:", err);
    }
  }, [modelSlug]);

  // ── Load all data on mount / model change ──
  useEffect(() => {
    if (!modelSlug) return;
    fetchPages();
    fetchCollaborators();
    fetchCodes();
  }, [modelSlug, fetchPages, fetchCollaborators, fetchCodes]);

  // ── Page CRUD ──
  const deletePage = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/cms/pages?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setPages((prev) => prev.filter((p) => p.id !== id));
        if (selectedPage === id) setSelectedPage(null);
      }
    } catch (err) {
      console.error("[CMS] delete page error:", err);
    }
  }, [selectedPage]);

  // ── Code helpers (codes tab uses existing /api/codes) ──
  const generateNewCode = useCallback(async (label: string) => {
    const now = Date.now();
    const newCode: TempCode = {
      code: generateCode(),
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
      label: label || "Acces temporaire",
      used: false,
    };
    try {
      const res = await fetch("/api/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCode),
      });
      if (res.ok) {
        setCodes((prev) => [newCode, ...prev]);
      }
    } catch (err) {
      console.error("[CMS] generate code error:", err);
    }
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const deleteCode = async (code: string) => {
    try {
      const res = await fetch("/api/codes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        setCodes((prev) => prev.filter((c) => c.code !== code));
      }
    } catch (err) {
      console.error("[CMS] delete code error:", err);
    }
  };

  // ── Collaborator CRUD ──
  const addCollaborator = useCallback(async () => {
    if (!collabForm.name.trim() || !modelSlug) return;
    try {
      const res = await fetch("/api/cms/collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelSlug,
          name: collabForm.name,
          role: collabForm.role || "editor",
          email: collabForm.email || undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setCollaborators((prev) => [json.collaborator, ...prev]);
        setCollabForm({ name: "", role: "", email: "" });
        setShowNewCollab(false);
      }
    } catch (err) {
      console.error("[CMS] add collaborator error:", err);
    }
  }, [collabForm, modelSlug]);

  const removeCollaborator = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/cms/collaborators?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setCollaborators((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("[CMS] remove collaborator error:", err);
    }
  }, []);

  // ── No model selected ──
  if (!modelSlug) {
    return (
      <OsLayout cpId="agence" showChat={false}>
        <div className="flex items-center justify-center min-h-[80vh] p-6">
          <div className="glass rounded-2xl p-8 text-center max-w-sm">
            <Lock className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Aucun model selectionne.
            </p>
          </div>
        </div>
      </OsLayout>
    );
  }

  const activeCodes = codes.filter((c) => c.expiresAt > Date.now() && !c.used);
  const expiredCodes = codes.filter((c) => c.expiresAt <= Date.now() || c.used);
  const selectedPageData = pages.find((p) => p.id === selectedPage);

  return (
    <OsLayout cpId="agence" showChat={false}>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">

        {/* Header */}
        <header className="anim-1 flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/agence"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <ArrowLeft className="w-4 h-4" style={{ color: "#C9A84C" }} />
            </Link>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(230,51,41,0.1)", border: "1px solid rgba(230,51,41,0.2)" }}>
              <Settings className="w-5 h-5" style={{ color: "#C9A84C" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>
                Cockpit Agence
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Gestion contenu &amp; acces client
              </p>
            </div>
          </div>
        </header>

        {/* KPI Bar */}
        <div className="anim-2 grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { icon: FileText, label: "Pages", value: pages.length, color: "#C9A84C" },
            { icon: Key, label: "Codes actifs", value: activeCodes.length, color: "#00D68F" },
            { icon: Users, label: "Collaborateurs", value: collaborators.filter((c) => c.active).length, color: "#5B8DEF" },
            { icon: Image, label: "Pages publiees", value: pages.filter((p) => p.status === "published").length, color: "#A78BFA" },
          ].map((kpi) => (
            <div key={kpi.label} className="glass rounded-xl p-4 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-60 transition-opacity"
                style={{ background: `linear-gradient(90deg, transparent, ${kpi.color}, transparent)` }} />
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{kpi.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: "var(--text)" }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="anim-3 flex gap-1 mb-6 p-1 rounded-lg w-fit"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {[
            { id: "pages" as const, label: "Pages", icon: FileText },
            { id: "codes" as const, label: "Codes d'acces", icon: Key },
            { id: "collaborators" as const, label: "Collaborateurs", icon: Users },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-md transition-all"
              style={{
                background: tab === t.id ? "rgba(230,51,41,0.15)" : "transparent",
                color: tab === t.id ? "#C9A84C" : "var(--text-muted)",
                fontWeight: tab === t.id ? 600 : 400,
              }}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Pages ── */}
        {tab === "pages" && (
          <div className="anim-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {loadingPages && !pages.length && (
                <div className="glass rounded-xl p-6 text-center">
                  <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" style={{ color: "var(--text-muted)" }} />
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Chargement...</p>
                </div>
              )}
              {pages.map((page) => (
                <div key={page.id} onClick={() => setSelectedPage(page.id)}
                  className="glass rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all"
                  style={{ outline: selectedPage === page.id ? "1px solid #C9A84C" : "none" }}>
                  <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                    style={{ background: "rgba(230,51,41,0.1)" }}>
                    {(page.meta as Record<string, string>)?.cover_image ? (
                      <img src={(page.meta as Record<string, string>).cover_image} alt={page.title} className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-6 h-6" style={{ color: "#C9A84C" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{page.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          background: page.status === "published" ? "#00D68F15" : page.status === "draft" ? "#FF9F4315" : "#8E8EA315",
                          color: page.status === "published" ? "#00D68F" : page.status === "draft" ? "#FF9F43" : "#8E8EA3",
                        }}>
                        {page.status === "published" ? "Publie" : page.status === "draft" ? "Brouillon" : "Prive"}
                      </span>
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      /{page.slug} — Maj {new Date(page.updated_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
                      className="p-2 rounded-lg transition-all hover:opacity-80"
                      style={{ background: "rgba(255,77,106,0.08)" }}>
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "#FF4D6A" }} />
                    </button>
                    <Eye className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
              ))}
              {!loadingPages && !pages.length && (
                <div className="glass rounded-xl p-8 text-center">
                  <FileText className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Aucune page. Les pages seront creees depuis la base de donnees.
                  </p>
                </div>
              )}
            </div>

            {/* Page detail / preview */}
            <div>
              {selectedPageData ? (
                <div className="glass rounded-xl p-5">
                  <div className="w-full h-40 rounded-lg overflow-hidden mb-4 flex items-center justify-center"
                    style={{ background: "rgba(230,51,41,0.05)" }}>
                    {(selectedPageData.meta as Record<string, string>)?.cover_image ? (
                      <img src={(selectedPageData.meta as Record<string, string>).cover_image} alt={selectedPageData.title}
                        className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-10 h-10" style={{ color: "var(--text-muted)" }} />
                    )}
                  </div>
                  <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>
                    {selectedPageData.title}
                  </h3>
                  <div className="space-y-2 text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                    <div className="flex justify-between">
                      <span>Slug</span>
                      <span style={{ color: "var(--text)" }}>/{selectedPageData.slug}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Statut</span>
                      <span style={{ color: "#00D68F" }}>
                        {selectedPageData.status === "published" ? "Publie" : selectedPageData.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cree le</span>
                      <span style={{ color: "var(--text)" }}>{new Date(selectedPageData.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Derniere maj</span>
                      <span style={{ color: "var(--text)" }}>{new Date(selectedPageData.updated_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg"
                      style={{ background: "#C9A84C20", color: "#C9A84C" }}>
                      <Edit3 className="w-3 h-3" /> Modifier
                    </button>
                    <button className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg"
                      style={{ background: "#5B8DEF15", color: "#5B8DEF" }}>
                      <ExternalLink className="w-3 h-3" /> Preview client
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass rounded-xl p-6 text-center">
                  <Camera className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Selectionnez une page pour voir les details.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Codes ── */}
        {tab === "codes" && (
          <div className="anim-4">
            {/* Generate code */}
            <div className="glass rounded-xl p-5 mb-6"
              style={{ borderLeft: "3px solid #C9A84C" }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                    Generer un code temporaire
                  </h3>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    Code valide 24h pour acces a la page client
                  </p>
                </div>
                <button onClick={() => generateNewCode("Acces client")}
                  className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg transition-all hover:scale-[1.02]"
                  style={{ background: "#C9A84C", color: "#0A0A0F", fontWeight: 600 }}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Generer
                </button>
              </div>
            </div>

            {/* Active codes */}
            {activeCodes.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#00D68F" }} />
                  <span style={{ color: "#00D68F" }}>Codes actifs ({activeCodes.length})</span>
                </h4>
                <div className="space-y-2">
                  {activeCodes.map((c) => {
                    const remaining = Math.max(0, Math.round((c.expiresAt - Date.now()) / 3600000));
                    return (
                      <div key={c.code} className="glass rounded-xl p-4 flex items-center gap-3">
                        <Shield className="w-4 h-4 shrink-0" style={{ color: "#00D68F" }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-mono font-bold tracking-wider"
                            style={{ color: "var(--text)" }}>{c.code}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{c.label}</span>
                            <span className="text-[10px] flex items-center gap-1" style={{ color: "#FF9F43" }}>
                              <Clock className="w-2.5 h-2.5" /> {remaining}h restantes
                            </span>
                          </div>
                        </div>
                        <button onClick={() => copyCode(c.code)}
                          className="p-2 rounded-lg transition-all hover:opacity-80"
                          style={{ background: "var(--surface)" }}>
                          {copiedCode === c.code
                            ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#00D68F" }} />
                            : <Copy className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                          }
                        </button>
                        <button onClick={() => deleteCode(c.code)}
                          className="p-2 rounded-lg transition-all hover:opacity-80"
                          style={{ background: "rgba(255,77,106,0.08)" }}>
                          <Trash2 className="w-3.5 h-3.5" style={{ color: "#FF4D6A" }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Expired codes */}
            {expiredCodes.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                  <span style={{ color: "var(--text-muted)" }}>Expires ({expiredCodes.length})</span>
                </h4>
                <div className="space-y-2">
                  {expiredCodes.slice(0, 5).map((c) => (
                    <div key={c.code} className="glass rounded-xl p-3 flex items-center gap-3 opacity-50">
                      <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{c.code}</span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{c.label}</span>
                      <span className="text-[10px] ml-auto" style={{ color: "#FF4D6A" }}>Expire</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!codes.length && (
              <div className="glass rounded-xl p-8 text-center">
                <Key className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Aucun code genere. Cliquez &quot;Generer&quot; pour creer un code d&apos;acces temporaire.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Collaborators ── */}
        {tab === "collaborators" && (
          <div className="anim-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                Equipe ({collaborators.length})
              </h3>
              <button onClick={() => setShowNewCollab(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all hover:opacity-80"
                style={{ background: "#C9A84C", color: "#0A0A0F", fontWeight: 600 }}>
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>

            {loadingCollabs && !collaborators.length && (
              <div className="glass rounded-xl p-6 text-center">
                <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" style={{ color: "var(--text-muted)" }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Chargement...</p>
              </div>
            )}

            <div className="space-y-3">
              {collaborators.map((c) => (
                <div key={c.id} className="glass rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(230,51,41,0.1)", border: "1px solid rgba(230,51,41,0.2)" }}>
                    <User className="w-5 h-5" style={{ color: "#C9A84C" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{c.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: c.active ? "#00D68F15" : "#8E8EA315", color: c.active ? "#00D68F" : "#8E8EA3" }}>
                        {c.active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {c.role}{c.email ? ` — ${c.email}` : ""}
                    </p>
                  </div>
                  <button onClick={() => removeCollaborator(c.id)}
                    className="p-2 rounded-lg transition-all hover:opacity-80"
                    style={{ background: "rgba(255,77,106,0.08)" }}>
                    <Trash2 className="w-3.5 h-3.5" style={{ color: "#FF4D6A" }} />
                  </button>
                </div>
              ))}
            </div>

            {!loadingCollabs && !collaborators.length && (
              <div className="glass rounded-xl p-8 text-center mt-3">
                <Users className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Aucun collaborateur. Cliquez &quot;Ajouter&quot; pour commencer.
                </p>
              </div>
            )}

            {/* New collaborator modal */}
            {showNewCollab && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
                <div className="w-full max-w-sm rounded-2xl p-6"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Nouveau collaborateur</h3>
                    <button onClick={() => setShowNewCollab(false)}><X className="w-4 h-4" style={{ color: "var(--text-muted)" }} /></button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Prenom *</label>
                      <input value={collabForm.name} onChange={(e) => setCollabForm({ ...collabForm, name: e.target.value })}
                        className="w-full text-xs rounded-lg px-3 py-2 outline-none"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Role</label>
                      <input value={collabForm.role} onChange={(e) => setCollabForm({ ...collabForm, role: e.target.value })}
                        placeholder="editor, photographer, manager..."
                        className="w-full text-xs rounded-lg px-3 py-2 outline-none"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Email</label>
                      <input value={collabForm.email} onChange={(e) => setCollabForm({ ...collabForm, email: e.target.value })}
                        placeholder="optionnel"
                        className="w-full text-xs rounded-lg px-3 py-2 outline-none"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setShowNewCollab(false)}
                      className="flex-1 text-xs py-2 rounded-lg"
                      style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                      Annuler
                    </button>
                    <button onClick={addCollaborator}
                      className="flex-1 text-xs py-2 rounded-lg font-medium"
                      style={{ background: "#C9A84C", color: "#fff" }}>
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </OsLayout>
  );
}
