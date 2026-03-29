"use client";

import { useState, useEffect, useCallback } from "react";
import { useModel } from "@/lib/model-context";
import { OsLayout } from "@/components/os-layout";
import { Search, ArrowLeft, Trash2, Check, X, ChevronRight, Edit3, MessageCircle, Key, Copy, Link2, Clock, Send, Plus } from "lucide-react";
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
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>{selected.size} select.</span>
                <button onClick={deleteSelected} className="px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer" style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "none" }}>
                  <Trash2 className="w-3 h-3 inline mr-1" />Supprimer
                </button>
                <button onClick={selectNone} className="text-[10px] cursor-pointer" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>Annuler</button>
              </div>
            )}
          </div>

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

          {/* Detail view */}
          {detailClient ? (
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <button onClick={() => setDetail(null)} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full shrink-0" style={{ background: detailClient.pseudo_snap ? "#997A00" : "#C13584" }} />
                <div>
                  <span className="text-sm font-bold" style={{ color: "var(--text)" }}>@{detailClient.pseudo_snap || detailClient.pseudo_insta || detailClient.id.slice(0, 8)}</span>
                  <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                    {detailClient.tier && <span className="uppercase font-bold mr-2">{detailClient.tier}</span>}
                    {detailClient.total_tokens_bought || 0} tokens · Inscrit {new Date(detailClient.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </div>

              {/* Notes — editable */}
              <div className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Edit3 className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                  <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>Notes</span>
                </div>
                <textarea defaultValue={detailClient.notes || ""} placeholder="Ajouter une note..."
                  className="w-full text-xs bg-transparent outline-none resize-none" rows={2}
                  style={{ color: "var(--text)" }}
                  onBlur={async (e) => {
                    const val = e.target.value.trim();
                    await fetch(`/api/clients`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ id: detailClient.id, notes: val }) });
                  }} />
              </div>

              {/* Codes — full management */}
              <div className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                  <span className="text-[10px] font-bold flex-1" style={{ color: "var(--text-muted)" }}>Codes ({clientCodes(detailClient.id).length})</span>
                  <button onClick={async () => {
                    const pseudo = detailClient.pseudo_snap || detailClient.pseudo_insta || "";
                    const codeStr = `${model.slice(0,3).toUpperCase()}-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
                    await fetch("/api/codes", { method: "POST", headers: authHeaders(),
                      body: JSON.stringify({ model, code: codeStr, client: pseudo.toLowerCase(), platform: detailClient.pseudo_snap ? "snapchat" : "instagram", tier: "vip", duration: 720, type: "paid" }) });
                    fetchAll();
                  }} className="text-[9px] font-bold px-2 py-1 rounded cursor-pointer"
                    style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                    <Plus className="w-3 h-3 inline mr-0.5" />Nouveau code
                  </button>
                </div>
                {clientCodes(detailClient.id).length === 0 ? (
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Aucun code</p>
                ) : (
                  <div className="space-y-1.5">
                    {clientCodes(detailClient.id).map(code => {
                      const isActive = code.active && !code.revoked;
                      const accessLink = `${origin}/m/${model}?access=${code.code}`;
                      const diff = new Date(code.expiresAt).getTime() - Date.now();
                      const timeLeft = diff <= 0 ? "exp" : Math.floor(diff / 86400000) > 0 ? `${Math.floor(diff / 86400000)}j` : `${Math.floor(diff / 3600000)}h`;
                      return (
                        <div key={code.code} className="rounded-lg px-2.5 py-2" style={{ background: "var(--bg)", border: `1px solid ${isActive ? "rgba(16,185,129,0.2)" : "var(--border)"}` }}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold flex-1" style={{ color: isActive ? "var(--success)" : "var(--text-muted)" }}>{code.code}</span>
                            <span className="text-[9px] uppercase font-bold" style={{ color: "var(--text-muted)" }}>{code.tier}</span>
                            <span className="text-[9px]" style={{ color: isActive ? "var(--success)" : "var(--text-muted)" }}>{timeLeft}</span>
                            {/* Copy code */}
                            <button onClick={() => handleCopy(code.code, `c-${code.code}`)} className="p-1 cursor-pointer" style={{ background: "none", border: "none" }}>
                              {copied === `c-${code.code}` ? <Check className="w-3 h-3" style={{ color: "var(--success)" }} /> : <Copy className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
                            </button>
                            {/* Copy link */}
                            <button onClick={() => handleCopy(accessLink, `l-${code.code}`)} className="p-1 cursor-pointer" style={{ background: "none", border: "none" }}>
                              {copied === `l-${code.code}` ? <Check className="w-3 h-3" style={{ color: "var(--success)" }} /> : <Link2 className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
                            </button>
                            {/* Share to snap/insta */}
                            {detailClient.pseudo_snap && (
                              <a href={`https://www.snapchat.com/add/${detailClient.pseudo_snap}`} target="_blank" rel="noopener noreferrer"
                                onClick={() => handleCopy(accessLink, `s-${code.code}`)}
                                className="p-1 no-underline" title="Envoyer via Snap">
                                <div className="w-3.5 h-3.5 rounded-full" style={{ background: "#997A00" }} />
                              </a>
                            )}
                            {detailClient.pseudo_insta && (
                              <a href={`https://ig.me/m/${detailClient.pseudo_insta}`} target="_blank" rel="noopener noreferrer"
                                onClick={() => handleCopy(accessLink, `i-${code.code}`)}
                                className="p-1 no-underline" title="Envoyer via Insta">
                                <div className="w-3.5 h-3.5 rounded-full" style={{ background: "#C13584" }} />
                              </a>
                            )}
                          </div>
                          {/* Extend / revoke */}
                          {isActive && extending === code.code && (
                            <div className="flex gap-1 mt-2 pt-1.5" style={{ borderTop: "1px solid var(--border)" }}>
                              {[{l:"+7j",h:168},{l:"+30j",h:720},{l:"+90j",h:2160}].map(o => (
                                <button key={o.l} onClick={async () => {
                                  await fetch("/api/codes", { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ code: code.code, model, updates: { expires_at: new Date(Date.now() + o.h * 3600000).toISOString() } }) });
                                  setExtending(null); fetchAll();
                                }} className="flex-1 py-1 rounded text-[9px] font-bold cursor-pointer" style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}>{o.l}</button>
                              ))}
                              <button onClick={async () => {
                                await fetch("/api/codes", { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ code: code.code, model, updates: { revoked: true } }) });
                                setExtending(null); fetchAll();
                              }} className="px-2 py-1 rounded text-[9px] font-bold cursor-pointer" style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "none" }}>Revoquer</button>
                            </div>
                          )}
                          {isActive && (
                            <button onClick={() => setExtending(extending === code.code ? null : code.code)}
                              className="text-[9px] mt-1 cursor-pointer hover:underline" style={{ color: "var(--text-muted)", background: "none", border: "none", padding: 0 }}>
                              {extending === code.code ? "Fermer" : "Modifier..."}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chat history */}
              <div className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                  <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>Messages ({clientMessages(detailClient.id).length})</span>
                </div>
                {clientMessages(detailClient.id).length === 0 ? (
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Aucun message</p>
                ) : (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {clientMessages(detailClient.id).slice(0, 20).map(m => (
                      <div key={m.id} className="flex gap-2 text-[10px] px-2 py-1 rounded" style={{ background: m.sender_type === "model" ? "rgba(230,51,41,0.05)" : "var(--bg)" }}>
                        <span className="font-bold shrink-0" style={{ color: m.sender_type === "model" ? "var(--accent)" : "var(--text)" }}>
                          {m.sender_type === "model" ? "Toi" : "@client"}
                        </span>
                        <span className="flex-1 truncate" style={{ color: "var(--text-secondary)" }}>{m.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="p-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{detailClient.total_tokens_bought || 0}</p>
                  <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Tokens achetés</p>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{detailClient.total_tokens_spent || 0}</p>
                  <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Tokens dépensés</p>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{clientCodes(detailClient.id).filter(c => c.active && !c.revoked).length}</p>
                  <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Codes actifs</p>
                </div>
              </div>
            </div>
          ) : (
            /* Client list */
            <div className="space-y-1.5">
              {filtered.map(c => {
                const pseudo = c.pseudo_snap || c.pseudo_insta || c.id.slice(0, 8);
                const isSnap = !!c.pseudo_snap;
                const isSelected = selected.has(c.id);
                const activeCodes = clientCodes(c.id).filter(co => co.active && !co.revoked);
                return (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all"
                    style={{ background: isSelected ? "rgba(230,51,41,0.05)" : "var(--surface)", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}` }}>
                    {/* Checkbox */}
                    <button onClick={() => toggleSelect(c.id)}
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0 cursor-pointer"
                      style={{ background: isSelected ? "var(--accent)" : "var(--bg)", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}` }}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                    {/* Platform dot */}
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ background: isSnap ? "#997A00" : "#C13584" }} />
                    {/* Info — click to open detail */}
                    <div className="flex-1 min-w-0" onClick={() => setDetail(c.id)}>
                      <span className="text-xs font-bold truncate block" style={{ color: "var(--text)" }}>@{pseudo}</span>
                    </div>
                    {/* Active code */}
                    {activeCodes.length > 0 && (
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded shrink-0" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                        {activeCodes[0].tier?.toUpperCase()}
                      </span>
                    )}
                    <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "var(--text-muted)" }} onClick={() => setDetail(c.id)} />
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
