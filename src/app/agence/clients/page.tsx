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

  const mergeSelected = async () => {
    if (selected.size < 2) return;
    const ids = [...selected];
    const keep = clients.find(c => c.id === ids[0]);
    if (!keep) return;
    const others = ids.slice(1);
    const otherClients = others.map(id => clients.find(c => c.id === id)).filter(Boolean) as Client[];
    const names = [keep, ...otherClients].map(c => `@${c.pseudo_snap || c.pseudo_insta || c.id.slice(0, 6)}`).join(", ");
    if (!confirm(`Fusionner ${names} → garder @${keep.pseudo_snap || keep.pseudo_insta || keep.id.slice(0, 6)} ?`)) return;

    // Move codes + messages from others to keep
    for (const other of otherClients) {
      const pseudo = other.pseudo_snap || other.pseudo_insta || "";
      // Update codes: change client field to keep's pseudo
      for (const code of codes.filter(c => c.client === (other.pseudo_snap || other.pseudo_insta))) {
        await fetch("/api/codes", { method: "PATCH", headers: authHeaders(),
          body: JSON.stringify({ code: code.code, model, updates: { client: keep.pseudo_snap || keep.pseudo_insta || "" } }) });
      }
      // Update messages: change client_id to keep's id
      for (const msg of messages.filter(m => m.client_id === other.id)) {
        await fetch("/api/messages", { method: "PATCH", headers: authHeaders(),
          body: JSON.stringify({ id: msg.id, client_id: keep.id }) });
      }
      // Delete the other client
      await fetch(`/api/clients?id=${other.id}`, { method: "DELETE", headers: authHeaders() });
    }
    selectNone(); fetchAll();
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
                  <button onClick={mergeSelected} className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
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
      </div>
    </OsLayout>
  );
}
