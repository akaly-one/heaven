"use client";

import { useState, useEffect, useCallback } from "react";
import { useModel } from "@/lib/model-context";
import { OsLayout } from "@/components/os-layout";
import { Search, ArrowLeft, Trash2, Check, X, ChevronRight, Edit3, MessageCircle, Key, Copy, Link2, Clock, Send, Plus, GitMerge, UserPlus } from "lucide-react";
import type { AccessCode, Message } from "@/types/heaven";

interface Client {
  id: string; pseudo_snap: string | null; pseudo_insta: string | null;
  model: string; tier: string | null; total_tokens_bought: number; total_tokens_spent: number;
  last_active: string | null; notes: string | null; created_at: string;
  firstname?: string | null; phone?: string | null;
}

export default function ClientsPage() {
  const { currentModel, authHeaders } = useModel();
  const model = currentModel || "yumi";
  const [clients, setClients] = useState<Client[]>([]);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [extending, setExtending] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addPseudo, setAddPseudo] = useState("");
  const [addPlatform, setAddPlatform] = useState<"snap" | "insta">("snap");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const handleCopy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  const fetchAll = useCallback(() => {
    Promise.all([
      fetch(`/api/clients?model=${model}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`/api/codes?model=${model}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`/api/messages?model=${model}`, { headers: authHeaders() }).then(r => r.json()),
    ]).then(([cd, co, mg]) => {
      setClients(cd.clients || []);
      setCodes(co.codes || []);
      setMessages(mg.messages || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [model, authHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = search.trim()
    ? clients.filter(c => (c.pseudo_snap || c.pseudo_insta || c.firstname || "").toLowerCase().includes(search.toLowerCase()))
    : clients;

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectAll = () => setSelected(new Set(filtered.map(c => c.id)));
  const selectNone = () => setSelected(new Set());

  const deleteSelected = async () => {
    if (!confirm(`Supprimer ${selected.size} client(s) ?`)) return;
    for (const id of selected) {
      await fetch(`/api/clients?id=${id}`, { method: "DELETE", headers: authHeaders() });
    }
    selectNone();
    fetchAll();
  };

  const addClient = async () => {
    if (!addPseudo.trim()) return;
    const payload: Record<string, unknown> = { model };
    if (addPlatform === "snap") payload.pseudo_snap = addPseudo.trim().toLowerCase();
    else payload.pseudo_insta = addPseudo.trim().toLowerCase();
    await fetch("/api/clients", { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
    setAddPseudo(""); setShowAdd(false); fetchAll();
  };

  // ── Merge modal state ──
  const [mergeModal, setMergeModal] = useState<Client[] | null>(null);
  const [mergeChoices, setMergeChoices] = useState<Record<string, string>>({});
  const [mergeCodeChoice, setMergeCodeChoice] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  const openMergeModal = () => {
    if (selected.size < 2) return;
    const toMerge = [...selected].map(id => clients.find(c => c.id === id)).filter(Boolean) as Client[];
    if (toMerge.length < 2) return;
    // Default choices: first client's values
    const defaults: Record<string, string> = {};
    const fields = ["pseudo_snap", "pseudo_insta", "phone", "firstname", "notes", "tier"] as const;
    for (const f of fields) {
      const withValue = toMerge.filter(c => c[f as keyof Client]);
      if (withValue.length > 0) defaults[f] = withValue[0].id;
    }
    setMergeChoices(defaults);
    // Default code: first active code found
    const allMergeCodes = toMerge.flatMap(c => codes.filter(co => co.client === (c.pseudo_snap || c.pseudo_insta) && co.active && !co.revoked));
    setMergeCodeChoice(allMergeCodes[0]?.code || null);
    setMergeModal(toMerge);
  };

  const executeMerge = async () => {
    if (!mergeModal || mergeModal.length < 2) return;
    setMerging(true);
    try {
      // Build the final client: start with first, override with choices
      const keepId = mergeModal[0].id;
      const updates: Record<string, unknown> = {};
      const fields = ["pseudo_snap", "pseudo_insta", "phone", "firstname", "notes", "tier"] as const;
      for (const f of fields) {
        const chosenClientId = mergeChoices[f];
        if (chosenClientId) {
          const chosenClient = mergeModal.find(c => c.id === chosenClientId);
          if (chosenClient) updates[f] = chosenClient[f as keyof Client];
        }
      }

      // Update the kept client with chosen values
      if (Object.keys(updates).length > 0) {
        await fetch("/api/clients", { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ id: keepId, ...updates }) });
      }

      // Move all messages from other clients to keepId
      const otherIds = mergeModal.slice(1).map(c => c.id);
      for (const otherId of otherIds) {
        for (const msg of messages.filter(m => m.client_id === otherId)) {
          await fetch("/api/messages", { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ id: msg.id, client_id: keepId }) });
        }
      }

      // Move all codes from other clients to the kept pseudo
      const keptPseudo = (updates.pseudo_snap || mergeModal[0].pseudo_snap || updates.pseudo_insta || mergeModal[0].pseudo_insta || "") as string;
      for (const other of mergeModal.slice(1)) {
        const otherPseudo = other.pseudo_snap || other.pseudo_insta || "";
        for (const code of codes.filter(c => c.client === otherPseudo)) {
          await fetch("/api/codes", { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ code: code.code, model, updates: { client: keptPseudo } }) });
        }
      }

      // Delete the other clients
      for (const otherId of otherIds) {
        await fetch(`/api/clients?id=${otherId}`, { method: "DELETE", headers: authHeaders() });
      }

      setMergeModal(null);
      selectNone();
      fetchAll();
    } catch (err) {
      console.error("[Merge] error:", err);
    }
    setMerging(false);
  };

  const detailClient = clients.find(c => c.id === detail);
  const clientCodes = (id: string) => codes.filter(c => c.clientId === id || c.client === (clients.find(cl => cl.id === id)?.pseudo_snap || clients.find(cl => cl.id === id)?.pseudo_insta));
  const clientMessages = (id: string) => messages.filter(m => m.client_id === id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-6 pb-24" style={{ background: "var(--bg)" }}>
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <a href="/agence" className="p-2 rounded-lg no-underline hover:opacity-70" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-4 h-4" />
            </a>
            <h1 className="text-base font-bold flex-1" style={{ color: "var(--text)" }}>Clients ({clients.length})</h1>
            {selected.size > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>{selected.size}</span>
                {selected.size >= 2 && (
                  <button onClick={openMergeModal} className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                    style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6", border: "none" }}>
                    <GitMerge className="w-3 h-3 inline mr-0.5" />Fusionner
                  </button>
                )}
                <button onClick={deleteSelected} className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                  style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "none" }}>
                  <Trash2 className="w-3 h-3" />
                </button>
                <button onClick={selectNone} className="text-[10px] cursor-pointer" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setShowAdd(true)} className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                <UserPlus className="w-3 h-3 inline mr-0.5" />Ajouter
              </button>
            )}
          </div>

          {/* Add client modal */}
          {showAdd && (
            <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xs font-bold flex-1" style={{ color: "var(--text)" }}>Nouveau client</h3>
                <button onClick={() => setShowAdd(false)} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setAddPlatform("snap")}
                  className="w-8 h-8 rounded-full cursor-pointer shrink-0 flex items-center justify-center"
                  style={{ background: addPlatform === "snap" ? "#997A00" : "rgba(153,122,0,0.15)", border: `2px solid ${addPlatform === "snap" ? "#997A00" : "transparent"}` }}>
                  {addPlatform === "snap" && <span className="w-2 h-2 rounded-full bg-white" />}
                </button>
                <button onClick={() => setAddPlatform("insta")}
                  className="w-8 h-8 rounded-full cursor-pointer shrink-0 flex items-center justify-center"
                  style={{ background: addPlatform === "insta" ? "#C13584" : "rgba(193,53,132,0.15)", border: `2px solid ${addPlatform === "insta" ? "#C13584" : "transparent"}` }}>
                  {addPlatform === "insta" && <span className="w-2 h-2 rounded-full bg-white" />}
                </button>
                <input value={addPseudo} onChange={e => setAddPseudo(e.target.value)}
                  placeholder={addPlatform === "snap" ? "pseudo snap" : "pseudo insta"}
                  className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                  onKeyDown={e => { if (e.key === "Enter") addClient(); }} />
                <button onClick={addClient} disabled={!addPseudo.trim()}
                  className="px-3 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-30"
                  style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                  Creer
                </button>
              </div>
            </div>
          )}

          {/* Search + select all */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs outline-none"
                style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }} />
            </div>
            <button onClick={selected.size === filtered.length ? selectNone : selectAll}
              className="px-3 py-2 rounded-xl text-[10px] font-medium cursor-pointer shrink-0"
              style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              {selected.size === filtered.length ? "Aucun" : "Tout"}
            </button>
          </div>

          {loading && <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Chargement...</p>}

          {/* Client list — inline accordion */}
          {!loading && (
            <div className="space-y-1.5">
              {filtered.map(c => {
                const pseudo = c.pseudo_snap || c.pseudo_insta || c.id.slice(0, 8);
                const isSnap = !!c.pseudo_snap;
                const isSelected = selected.has(c.id);
                const isOpen = detail === c.id;
                const cCodes = clientCodes(c.id);
                const activeCode = cCodes.find(co => co.active && !co.revoked);

                return (
                  <div key={c.id} className="rounded-xl overflow-hidden group" style={{ background: "var(--surface)", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}` }}>
                    {/* Row */}
                    <div className="flex items-center gap-2 px-3 py-2">
                      <button onClick={() => toggleSelect(c.id)}
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0 cursor-pointer"
                        style={{ background: isSelected ? "var(--accent)" : "var(--bg)", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}` }}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </button>
                      <div className="w-4 h-4 rounded-full shrink-0" style={{ background: isSnap ? "#997A00" : "#C13584" }} />
                      <span className="text-xs font-bold truncate flex-1 cursor-pointer" style={{ color: "var(--text)" }}
                        onClick={() => setDetail(isOpen ? null : c.id)}>@{pseudo}</span>
                      {/* Hover actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {activeCode && (
                          <>
                            <button onClick={() => handleCopy(activeCode.code, `c-${c.id}`)} className="p-1 cursor-pointer" style={{ background: "none", border: "none" }}>
                              {copied === `c-${c.id}` ? <Check className="w-3 h-3" style={{ color: "var(--success)" }} /> : <Copy className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
                            </button>
                            <button onClick={() => handleCopy(`${origin}/m/${model}?access=${activeCode.code}`, `l-${c.id}`)} className="p-1 cursor-pointer" style={{ background: "none", border: "none" }}>
                              {copied === `l-${c.id}` ? <Check className="w-3 h-3" style={{ color: "var(--success)" }} /> : <Link2 className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
                            </button>
                          </>
                        )}
                        <a href={`/agence/messages`} className="p-1 no-underline"><MessageCircle className="w-3 h-3" style={{ color: "var(--text-muted)" }} /></a>
                        <button onClick={async () => {
                          if (confirm(`Supprimer @${pseudo} ?`)) {
                            await fetch(`/api/clients?id=${c.id}`, { method: "DELETE", headers: authHeaders() });
                            fetchAll();
                          }
                        }} className="p-1 cursor-pointer" style={{ background: "none", border: "none" }}>
                          <Trash2 className="w-3 h-3" style={{ color: "#DC2626" }} />
                        </button>
                      </div>
                      {/* Always visible: tier badge */}
                      {activeCode && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                          {activeCode.tier?.toUpperCase()}
                        </span>
                      )}
                      <ChevronRight className="w-3 h-3 shrink-0 cursor-pointer" style={{ color: "var(--text-muted)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}
                        onClick={() => setDetail(isOpen ? null : c.id)} />
                    </div>

                    {/* Accordion detail */}
                    {isOpen && (
                      <div style={{ borderTop: "1px solid var(--border)" }}>
                        {/* Notes */}
                        <div className="px-3 py-2">
                          <textarea defaultValue={c.notes || ""} placeholder="Notes..."
                            className="w-full text-[10px] bg-transparent outline-none resize-none" rows={1}
                            style={{ color: "var(--text)" }}
                            onBlur={async (e) => {
                              await fetch("/api/clients", { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ id: c.id, notes: e.target.value.trim() }) });
                            }} />
                        </div>
                        {/* Codes */}
                        <div className="px-3 py-2" style={{ borderTop: "1px solid var(--border)" }}>
                          <div className="flex items-center gap-1 mb-1">
                            <Key className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                            <span className="text-[9px] font-bold flex-1" style={{ color: "var(--text-muted)" }}>Codes ({cCodes.length})</span>
                            <button onClick={async () => {
                              const codeStr = `${model.slice(0,3).toUpperCase()}-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
                              await fetch("/api/codes", { method: "POST", headers: authHeaders(),
                                body: JSON.stringify({ model, code: codeStr, client: pseudo.toLowerCase(), platform: isSnap ? "snapchat" : "instagram", tier: "vip", duration: 720, type: "paid" }) });
                              fetchAll();
                            }} className="text-[8px] font-bold px-1.5 py-0.5 rounded cursor-pointer" style={{ background: "var(--accent)", color: "#fff", border: "none" }}>+Code</button>
                          </div>
                          {cCodes.slice(0, 3).map(code => (
                            <div key={code.code} className="flex items-center gap-1 text-[9px] py-0.5">
                              <span className="font-mono" style={{ color: code.active && !code.revoked ? "var(--success)" : "var(--text-muted)" }}>{code.code.slice(-8)}</span>
                              <span className="uppercase" style={{ color: "var(--text-muted)" }}>{code.tier}</span>
                              <span style={{ color: code.active && !code.revoked ? "var(--success)" : "var(--text-muted)" }}>
                                {code.active && !code.revoked ? (() => { const d = new Date(code.expiresAt).getTime() - Date.now(); return d > 86400000 ? `${Math.floor(d/86400000)}j` : d > 0 ? `${Math.floor(d/3600000)}h` : "exp"; })() : code.revoked ? "rev" : "exp"}
                              </span>
                            </div>
                          ))}
                        </div>
                        {/* Messages preview */}
                        {clientMessages(c.id).length > 0 && (
                          <div className="px-3 py-2" style={{ borderTop: "1px solid var(--border)" }}>
                            <span className="text-[9px] font-bold" style={{ color: "var(--text-muted)" }}>Messages ({clientMessages(c.id).length})</span>
                            {clientMessages(c.id).slice(0, 2).map(m => (
                              <p key={m.id} className="text-[9px] truncate" style={{ color: "var(--text-secondary)" }}>
                                {m.sender_type === "model" ? "→ " : "← "}{m.content}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !detail && filtered.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Aucun client</p>
          )}
        </div>

        {/* ═══ MERGE MODAL ═══ */}
        {mergeModal && mergeModal.length >= 2 && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setMergeModal(null)}>
            <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 md:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <GitMerge className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                  <h3 className="text-sm font-bold flex-1" style={{ color: "var(--text)" }}>Fusionner {mergeModal.length} contacts</h3>
                  <button onClick={() => setMergeModal(null)} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>
                  Choisis quelle info garder pour chaque champ. Les messages et codes seront fusionnés.
                </p>

                {/* Field-by-field chooser */}
                <div className="space-y-3">
                  {([
                    { key: "pseudo_snap", label: "Snap", icon: "🟡" },
                    { key: "pseudo_insta", label: "Instagram", icon: "🟣" },
                    { key: "phone", label: "Telephone", icon: "📱" },
                    { key: "firstname", label: "Prenom", icon: "👤" },
                    { key: "notes", label: "Notes", icon: "📝" },
                    { key: "tier", label: "Tier", icon: "⭐" },
                  ] as const).map(field => {
                    const options = mergeModal.filter(c => c[field.key as keyof Client]);
                    if (options.length === 0) return null;
                    return (
                      <div key={field.key}>
                        <p className="text-[10px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>
                          {field.icon} {field.label}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {options.map(c => {
                            const val = String(c[field.key as keyof Client] || "");
                            const isChosen = mergeChoices[field.key] === c.id;
                            return (
                              <button key={c.id} onClick={() => setMergeChoices(prev => ({ ...prev, [field.key]: c.id }))}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer transition-all"
                                style={{
                                  background: isChosen ? "rgba(139,92,246,0.15)" : "var(--bg)",
                                  border: `1.5px solid ${isChosen ? "#8B5CF6" : "var(--border)"}`,
                                  color: isChosen ? "#8B5CF6" : "var(--text)",
                                }}>
                                {isChosen && <Check className="w-3 h-3 inline mr-1" />}
                                {val.length > 20 ? val.slice(0, 20) + "…" : val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Active codes */}
                  {(() => {
                    const allCodes = mergeModal.flatMap(c => {
                      const p = c.pseudo_snap || c.pseudo_insta || "";
                      return codes.filter(co => co.client === p && co.active && !co.revoked).map(co => ({ ...co, fromClient: c }));
                    });
                    if (allCodes.length <= 1) return null;
                    return (
                      <div>
                        <p className="text-[10px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>
                          🔑 Code actif a garder
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {allCodes.map(co => {
                            const isChosen = mergeCodeChoice === co.code;
                            const p = co.fromClient.pseudo_snap || co.fromClient.pseudo_insta || "?";
                            return (
                              <button key={co.code} onClick={() => setMergeCodeChoice(co.code)}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono cursor-pointer transition-all"
                                style={{
                                  background: isChosen ? "rgba(16,185,129,0.15)" : "var(--bg)",
                                  border: `1.5px solid ${isChosen ? "#10B981" : "var(--border)"}`,
                                  color: isChosen ? "#10B981" : "var(--text-muted)",
                                }}>
                                {isChosen && <Check className="w-3 h-3 inline mr-1" />}
                                {co.code.slice(-6)} ({co.tier}) · @{p}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Summary */}
                  <div className="p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                    <p className="text-[10px] font-bold mb-1" style={{ color: "#8B5CF6" }}>Résumé</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      ✓ Messages de tous les contacts seront fusionnés<br />
                      ✓ Tous les codes seront transférés<br />
                      ✓ Les contacts supprimés : {mergeModal.slice(1).map(c => `@${c.pseudo_snap || c.pseudo_insta || c.id.slice(0, 6)}`).join(", ")}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setMergeModal(null)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                    style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                    Annuler
                  </button>
                  <button onClick={executeMerge} disabled={merging}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                    style={{ background: "#8B5CF6", color: "#fff", border: "none" }}>
                    {merging ? "Fusion..." : `Fusionner → @${(() => {
                      const snapChoice = mergeChoices.pseudo_snap ? mergeModal.find(c => c.id === mergeChoices.pseudo_snap)?.pseudo_snap : null;
                      const instaChoice = mergeChoices.pseudo_insta ? mergeModal.find(c => c.id === mergeChoices.pseudo_insta)?.pseudo_insta : null;
                      return snapChoice || instaChoice || mergeModal[0].pseudo_snap || mergeModal[0].pseudo_insta || mergeModal[0].id.slice(0, 6);
                    })()}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </OsLayout>
  );
}
