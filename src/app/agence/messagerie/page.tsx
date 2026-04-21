"use client";

import { useEffect, useState, useRef } from "react";
import { useModel } from "@/lib/model-context";
import { OsLayout } from "@/components/os-layout";
import { MessageCircle, Send, Instagram, Globe, Heart, Zap, ChevronDown, Search, Sparkles, DollarSign, Tag, TrendingUp, Edit3, Save, X, Music2 } from "lucide-react";

interface Thread {
  id: string;
  modelId: string;
  clientId: string;
  primaryPlatform: "web" | "instagram" | "fanvue" | "snap";
  lastMessageAt: string;
  unreadCount: number;
  status: string;
  lastMessage: { content: string | null; direction: string; platform: string } | null;
  client: {
    id: string;
    name: string | null;
    contact_name: string | null;
    instagram_username: string | null;
    fanvue_username: string | null;
    tags: string[];
    lifetime_value_eur: number;
    funnel_stage: string;
    tier: string;
  };
}

interface ModelSelf {
  name: string;
  handle: string;
  avatarUrl: string | null;
  slug: string;
}

interface ThreadMessage {
  id: string;
  thread_id: string;
  platform: "web" | "instagram" | "fanvue" | "snap";
  direction: "inbound" | "outbound";
  content: string | null;
  media_urls: string[] | null;
  ai_generated: boolean;
  ai_draft_variants: unknown | null;
  human_validated: boolean;
  sent_at: string;
  read_at: string | null;
}

interface Client {
  id: string;
  name: string | null;
  contact_name: string | null;
  instagram_username: string | null;
  fanvue_username: string | null;
  snapchat_username: string | null;
  tiktok_username: string | null;
  primary_handle: string | null;
  primary_platform: string | null;
  tags: string[];
  lifetime_value_eur: number;
  funnel_stage: string;
  tier: string;
  preferences: Record<string, unknown>;
  agent_context: Record<string, unknown>;
  purchases_summary: unknown[];
  last_contact_at: string | null;
}

const PLATFORM_META = {
  web: { icon: Globe, label: "Web", color: "#6B7280", bg: "rgba(107,114,128,0.15)" },
  instagram: { icon: Instagram, label: "Instagram", color: "#E1306C", bg: "rgba(225,48,108,0.15)" },
  fanvue: { icon: Heart, label: "Fanvue", color: "#C9A84C", bg: "rgba(201,168,76,0.18)" },
  snap: { icon: Zap, label: "Snap", color: "#FFFC00", bg: "rgba(255,252,0,0.12)" },
} as const;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mn = Math.floor(diff / 60000);
  if (mn < 1) return "à l'instant";
  if (mn < 60) return `il y a ${mn}m`;
  const h = Math.floor(mn / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

function PlatformBadge({ platform }: { platform: keyof typeof PLATFORM_META }) {
  const meta = PLATFORM_META[platform];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded uppercase tracking-wider font-semibold"
      style={{ background: meta.bg, color: meta.color }}
    >
      <Icon className="w-2.5 h-2.5" />
      {meta.label}
    </span>
  );
}

function Avatar({
  url,
  name,
  size = 36,
  ring = false,
}: {
  url?: string | null;
  name: string;
  size?: number;
  ring?: boolean;
}) {
  const initial = (name || "?").slice(0, 1).toUpperCase();
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
    background: "linear-gradient(135deg, #E6C974, #9E7C1F)",
    color: "#0A0A0C",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: size * 0.42,
    ...(ring && {
      boxShadow: "0 0 0 2px #0A0A0C, 0 0 0 3px rgba(201,168,76,0.6)",
    }),
  };
  if (url) {
    return (
      <div style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return <div style={style}>{initial}</div>;
}

export default function MessagingPage() {
  const { authHeaders, auth } = useModel();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [modelSelf, setModelSelf] = useState<ModelSelf | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [composerText, setComposerText] = useState("");
  const [sendPlatform, setSendPlatform] = useState<"web" | "instagram" | "fanvue">("web");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Contact edit state
  const [editingContact, setEditingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [editContact, setEditContact] = useState({
    contact_name: "",
    instagram_username: "",
    snapchat_username: "",
    tiktok_username: "",
    fanvue_username: "",
    tags: "",
  });

  const load = async (threadId?: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (threadId) qs.set("thread_id", threadId);
      const res = await fetch(`/api/agence/messaging/inbox?${qs}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      setThreads(data.threads || []);
      setMessages(data.messages || []);
      setClient(data.client || null);
      if (!currentThreadId && data.currentThread) {
        setCurrentThreadId(data.currentThread.id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Fetch own model profile (for header avatar + composer)
    const slug = (auth?.model_slug || "yumi").toLowerCase();
    fetch(`/api/models/photo?login=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.slug) {
          setModelSelf({
            slug: d.slug,
            avatarUrl: d.url,
            name: (auth?.display_name || d.slug).toUpperCase(),
            handle: "@" + d.slug,
          });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentThreadId) load(currentThreadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Default send platform = primary platform of current thread
  useEffect(() => {
    const t = threads.find((x) => x.id === currentThreadId);
    if (t && (t.primaryPlatform === "web" || t.primaryPlatform === "instagram" || t.primaryPlatform === "fanvue")) {
      setSendPlatform(t.primaryPlatform);
    }
  }, [currentThreadId, threads]);

  const filteredThreads = threads.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.client?.contact_name?.toLowerCase().includes(q) ||
      t.client?.name?.toLowerCase().includes(q) ||
      t.client?.instagram_username?.toLowerCase().includes(q) ||
      t.lastMessage?.content?.toLowerCase().includes(q)
    );
  });

  const startEditContact = () => {
    if (!client) return;
    setEditContact({
      contact_name: client.contact_name || "",
      instagram_username: client.instagram_username || "",
      snapchat_username: client.snapchat_username || "",
      tiktok_username: client.tiktok_username || "",
      fanvue_username: client.fanvue_username || "",
      tags: (client.tags || []).join(", "),
    });
    setContactError(null);
    setEditingContact(true);
  };

  const cancelEditContact = () => {
    setEditingContact(false);
    setContactError(null);
  };

  const saveContact = async () => {
    if (!client) return;
    setSavingContact(true);
    setContactError(null);
    try {
      const tags = editContact.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(`/api/agence/messaging/contact?id=${client.id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name: editContact.contact_name,
          instagram_username: editContact.instagram_username,
          snapchat_username: editContact.snapchat_username,
          tiktok_username: editContact.tiktok_username,
          fanvue_username: editContact.fanvue_username,
          tags,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.conflicts) {
          const fields = Object.keys(data.conflicts).join(", ");
          setContactError(
            `Handle déjà utilisé sur un autre contact (${fields}). Fusionne plutôt.`
          );
        } else {
          setContactError(data.error || "Erreur");
        }
        return;
      }

      setEditingContact(false);
      if (currentThreadId) await load(currentThreadId);
    } finally {
      setSavingContact(false);
    }
  };

  const sendMessage = async () => {
    if (!composerText.trim() || !currentThreadId || sending) return;
    setSending(true);
    try {
      await fetch("/api/agence/messaging/inbox", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: currentThreadId,
          platform: sendPlatform,
          content: composerText.trim(),
        }),
      });
      setComposerText("");
      await load(currentThreadId);
    } finally {
      setSending(false);
    }
  };

  return (
    <OsLayout>
      <div className="flex" style={{ height: "calc(100vh - 48px)" }}>
        {/* COL 1 — Conversations list */}
        <aside
          className="w-[320px] border-r flex flex-col shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(15,15,18,0.4)" }}
        >
          <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4" style={{ color: "#C9A84C" }} />
              <h2 className="text-sm font-semibold">Messagerie</h2>
              <span className="text-[10px] opacity-50 ml-auto">
                {threads.length} conversation{threads.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher fan…"
                className="w-full pl-8 pr-3 py-2 text-xs rounded"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "var(--text)",
                }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && threads.length === 0 && (
              <div className="p-6 text-center text-xs opacity-50">Chargement…</div>
            )}
            {filteredThreads.map((t) => {
              const isActive = t.id === currentThreadId;
              const name = t.client?.contact_name || t.client?.name || t.client?.instagram_username || "Sans nom";
              return (
                <button
                  key={t.id}
                  onClick={() => setCurrentThreadId(t.id)}
                  className="w-full text-left px-4 py-3 border-b transition-colors"
                  style={{
                    background: isActive ? "rgba(201,168,76,0.1)" : "transparent",
                    borderColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={name} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{name}</span>
                        {t.unreadCount > 0 && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: "#C9A84C", color: "#0A0A0C" }}
                          >
                            {t.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <PlatformBadge platform={t.primaryPlatform} />
                        {t.client?.tier && t.client.tier !== "free" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded uppercase" style={{ background: "rgba(201,168,76,0.15)", color: "#E6C974" }}>
                            {t.client.tier}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] opacity-60 truncate">
                        {t.lastMessage?.direction === "outbound" ? "✓ " : ""}
                        {t.lastMessage?.content || "—"}
                      </p>
                    </div>
                    <span className="text-[10px] opacity-40 shrink-0 self-start mt-1">
                      {timeAgo(t.lastMessageAt)}
                    </span>
                  </div>
                </button>
              );
            })}

            {!loading && filteredThreads.length === 0 && (
              <div className="p-6 text-center text-xs opacity-50">Aucune conversation</div>
            )}
          </div>
        </aside>

        {/* COL 2 — Conversation thread */}
        <section className="flex-1 flex flex-col" style={{ background: "rgba(10,10,12,0.25)" }}>
          {currentThreadId && client ? (
            <>
              <div
                className="px-6 py-4 border-b flex items-center gap-3"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <Avatar name={client.contact_name || client.name || "?"} size={44} />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">
                    {client.contact_name || client.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] opacity-60">
                    {client.instagram_username && (
                      <span className="inline-flex items-center gap-1">
                        <Instagram className="w-3 h-3" /> @{client.instagram_username}
                      </span>
                    )}
                    {client.fanvue_username && (
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {client.fanvue_username}
                      </span>
                    )}
                  </div>
                </div>
                {modelSelf && (
                  <div className="flex items-center gap-2 opacity-80">
                    <span className="text-[10px] uppercase tracking-wider opacity-60">Toi</span>
                    <Avatar url={modelSelf.avatarUrl} name={modelSelf.name} size={32} ring />
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {messages.map((m) => {
                  const isOut = m.direction === "outbound";
                  const avatarName = isOut
                    ? modelSelf?.name || "YUMI"
                    : client.contact_name || client.name || "?";
                  const avatarUrl = isOut ? modelSelf?.avatarUrl : null;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${isOut ? "justify-end" : "justify-start"}`}
                    >
                      {!isOut && <Avatar name={avatarName} size={28} />}
                      <div className="max-w-[62%]">
                        <div
                          className="flex items-center gap-1.5 mb-1 text-[9px] opacity-60"
                          style={{ justifyContent: isOut ? "flex-end" : "flex-start" }}
                        >
                          <PlatformBadge platform={m.platform} />
                          <span>{timeAgo(m.sent_at)}</span>
                        </div>
                        <div
                          className="px-4 py-2.5 text-sm rounded-2xl"
                          style={{
                            background: isOut
                              ? "linear-gradient(135deg, #C9A84C, #9E7C1F)"
                              : "rgba(255,255,255,0.06)",
                            color: isOut ? "#0A0A0C" : "var(--text)",
                            borderBottomRightRadius: isOut ? "4px" : "16px",
                            borderBottomLeftRadius: isOut ? "16px" : "4px",
                          }}
                        >
                          {m.content}
                        </div>
                      </div>
                      {isOut && <Avatar url={avatarUrl} name={avatarName} size={28} />}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div
                className="px-6 py-4 border-t"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] opacity-60 uppercase tracking-wider">Envoyer via</span>
                  {(["web", "instagram", "fanvue"] as const).map((p) => {
                    const meta = PLATFORM_META[p];
                    const Icon = meta.icon;
                    const active = sendPlatform === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSendPlatform(p)}
                        className="text-[10px] px-2 py-1 rounded inline-flex items-center gap-1 transition-all"
                        style={{
                          background: active ? meta.bg : "transparent",
                          color: active ? meta.color : "rgba(255,255,255,0.4)",
                          border: `1px solid ${active ? meta.color + "66" : "rgba(255,255,255,0.08)"}`,
                        }}
                      >
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Tape ton message…"
                    rows={2}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm resize-none"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "var(--text)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!composerText.trim() || sending}
                    className="px-4 rounded-xl text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40"
                    style={{
                      background: "linear-gradient(135deg, #E6C974, #C9A84C)",
                      color: "#0A0A0C",
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sending ? "…" : "Envoyer"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center opacity-50 text-sm">
              Sélectionne une conversation
            </div>
          )}
        </section>

        {/* COL 3 — Fan profile sidebar */}
        <aside
          className="w-[320px] border-l overflow-y-auto"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(15,15,18,0.4)" }}
        >
          {client ? (
            <div className="p-5 space-y-5">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <Avatar name={client.contact_name || client.name || "?"} size={56} />
                  {!editingContact && (
                    <button
                      type="button"
                      onClick={startEditContact}
                      className="text-[10px] px-2 py-1 rounded inline-flex items-center gap-1 opacity-70 hover:opacity-100"
                      style={{
                        background: "rgba(201,168,76,0.08)",
                        color: "#E6C974",
                        border: "1px solid rgba(201,168,76,0.25)",
                      }}
                    >
                      <Edit3 className="w-3 h-3" /> Éditer
                    </button>
                  )}
                </div>

                {editingContact ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editContact.contact_name}
                      onChange={(e) => setEditContact({ ...editContact, contact_name: e.target.value })}
                      placeholder="Nom contact"
                      className="w-full px-3 py-2 text-sm rounded"
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(201,168,76,0.2)",
                        color: "var(--text)",
                      }}
                    />
                    <div className="text-[9px] uppercase tracking-wider opacity-60 mt-3 mb-1">
                      Handles plateformes
                    </div>
                    {([
                      ["instagram_username", "Instagram", Instagram, "#E1306C"],
                      ["snapchat_username", "Snap", Zap, "#FFFC00"],
                      ["tiktok_username", "TikTok", Music2, "#FF0050"],
                      ["fanvue_username", "Fanvue", Heart, "#C9A84C"],
                    ] as const).map(([field, label, Icon, color]) => (
                      <div key={field} className="flex items-center gap-2">
                        <Icon className="w-3 h-3 shrink-0" style={{ color }} />
                        <input
                          type="text"
                          value={editContact[field] as string}
                          onChange={(e) => setEditContact({ ...editContact, [field]: e.target.value })}
                          placeholder={`@${label.toLowerCase()}`}
                          className="flex-1 px-2 py-1.5 text-[11px] rounded"
                          style={{
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "var(--text)",
                          }}
                        />
                      </div>
                    ))}
                    <div className="text-[9px] uppercase tracking-wider opacity-60 mt-3 mb-1">
                      Tags (virgule entre)
                    </div>
                    <input
                      type="text"
                      value={editContact.tags}
                      onChange={(e) => setEditContact({ ...editContact, tags: e.target.value })}
                      placeholder="fan-chaud, regulier"
                      className="w-full px-3 py-2 text-xs rounded"
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "var(--text)",
                      }}
                    />
                    {contactError && (
                      <div
                        className="text-[11px] px-3 py-2 rounded"
                        style={{
                          background: "rgba(220,38,38,0.08)",
                          color: "#F87171",
                          border: "1px solid rgba(220,38,38,0.25)",
                        }}
                      >
                        {contactError}
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={saveContact}
                        disabled={savingContact}
                        className="flex-1 text-[11px] py-2 rounded font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
                        style={{
                          background: "linear-gradient(135deg, #E6C974, #C9A84C)",
                          color: "#0A0A0C",
                        }}
                      >
                        <Save className="w-3 h-3" />
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditContact}
                        className="text-[11px] px-3 py-2 rounded"
                        style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-base font-semibold">
                      {client.contact_name || client.name || <span className="opacity-40">Sans nom</span>}
                    </h3>
                    {client.primary_handle && (
                      <div className="text-[10px] opacity-50 mt-0.5">
                        Alias principal : {client.primary_handle} ({client.primary_platform})
                      </div>
                    )}
                    <div className="text-[11px] opacity-70 mt-2 space-y-1">
                      {client.instagram_username && (
                        <div className="flex items-center gap-1.5">
                          <Instagram className="w-3 h-3" style={{ color: "#E1306C" }} />
                          @{client.instagram_username}
                        </div>
                      )}
                      {client.snapchat_username && (
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3 h-3" style={{ color: "#FFFC00" }} />
                          {client.snapchat_username}
                        </div>
                      )}
                      {client.tiktok_username && (
                        <div className="flex items-center gap-1.5">
                          <Music2 className="w-3 h-3" style={{ color: "#FF0050" }} />
                          @{client.tiktok_username}
                        </div>
                      )}
                      {client.fanvue_username && (
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-3 h-3" style={{ color: "#C9A84C" }} />
                          {client.fanvue_username}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded" style={{ background: "rgba(201,168,76,0.08)" }}>
                  <div className="flex items-center gap-1 text-[9px] opacity-60 uppercase tracking-wider">
                    <DollarSign className="w-3 h-3" /> LTV
                  </div>
                  <div className="text-sm font-bold mt-1">
                    {client.lifetime_value_eur.toFixed(0)}€
                  </div>
                </div>
                <div className="p-2.5 rounded" style={{ background: "rgba(124,58,237,0.08)" }}>
                  <div className="flex items-center gap-1 text-[9px] opacity-60 uppercase tracking-wider">
                    <TrendingUp className="w-3 h-3" /> Stage
                  </div>
                  <div className="text-[11px] font-semibold mt-1 capitalize">
                    {client.funnel_stage}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {client.tags && client.tags.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-[9px] opacity-60 uppercase tracking-wider mb-2">
                    <Tag className="w-3 h-3" /> Tags
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {client.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded"
                        style={{
                          background: "rgba(201,168,76,0.1)",
                          color: "#E6C974",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Préférences apprises */}
              {client.preferences && Object.keys(client.preferences).length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-[9px] opacity-60 uppercase tracking-wider mb-2">
                    <Sparkles className="w-3 h-3" /> Préférences IA
                  </div>
                  <div className="text-[11px] space-y-1 opacity-80">
                    {Object.entries(client.preferences).map(([k, v]) => (
                      <div key={k}>
                        <span className="opacity-60">{k}:</span>{" "}
                        {Array.isArray(v) ? v.join(", ") : String(v)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions suggérées */}
              <div>
                <div className="text-[9px] opacity-60 uppercase tracking-wider mb-2">
                  Actions suggérées
                </div>
                <div className="space-y-1.5">
                  <button
                    className="w-full text-[11px] py-2 rounded text-left px-3"
                    style={{
                      background: "rgba(201,168,76,0.08)",
                      color: "#E6C974",
                      border: "1px solid rgba(201,168,76,0.25)",
                    }}
                  >
                    🔥 Proposer Pack Premium 40€
                  </button>
                  <button
                    className="w-full text-[11px] py-2 rounded text-left px-3"
                    style={{
                      background: "rgba(124,58,237,0.08)",
                      color: "#A78BFA",
                      border: "1px solid rgba(124,58,237,0.25)",
                    }}
                  >
                    ✨ Générer draft IA
                  </button>
                  <button
                    className="w-full text-[11px] py-2 rounded text-left px-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.6)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    ⭐ Marquer VIP
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-xs opacity-50 text-center">
              Sélectionne un fan pour voir son profil
            </div>
          )}
        </aside>
      </div>
    </OsLayout>
  );
}
