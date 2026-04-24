"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useModel } from "@/lib/model-context";
import { OsLayout } from "@/components/os-layout";
import {
  MessageCircle,
  Instagram,
  Search,
  Users,
  Loader2,
  BookUser,
  ChevronRight,
} from "lucide-react";
import { FanTimeline, type TimelineItem } from "@/components/cockpit/fan-timeline";
import { type ReplyChannel } from "@/components/cockpit/reply-composer";
import { ContactsDrawer } from "@/components/cockpit/messagerie/contacts-drawer";
import { Meta24hTimer } from "@/components/cockpit/messagerie/meta-24h-timer";
import { MultiChannelReply } from "@/components/cockpit/messagerie/multi-channel-reply";
// NB 2026-04-24 : tab Agent IA dédié pour persona + playground + logs.
import { AgentIAPanel } from "@/components/cockpit/messagerie/agent-ia-panel";
import { Bot } from "lucide-react";
// Standards d'affichage unifiés header ↔ messagerie (source unique)
import {
  getConversationPseudo,
  formatConversationTime as sharedFormatTime,
} from "@/lib/messaging/conversation-display";
import { MODE_LABELS, type AgentMode } from "@/lib/ai-agent/modes";
import { Radio, GraduationCap, UserRound, Sparkles } from "lucide-react";
// NB 2026-04-24 : utilisé pour mark_read payload normalisation model_id
import { toModelId } from "@/lib/model-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceFilter = "all" | "web" | "instagram";
type OrderMode = "recent" | "oldest" | "unread";
type MessagerieView = "messages" | "agent-ia";

interface InboxConversation {
  fan_id: string;
  pseudo_insta?: string | null;
  pseudo_web?: string | null;
  pseudo_snap?: string | null;
  fanvue_handle?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  sources: ("web" | "instagram")[]; // channels present for this fan
  last_message: {
    text: string;
    source: "web" | "instagram";
    direction: "in" | "out";
    created_at: string;
  } | null;
  unread_count: number;
  last_message_at: string;
  tier?: string | null;
}

interface InboxThreadMessage {
  id: string;
  source: "web" | "instagram";
  direction: "in" | "out";
  text: string;
  created_at: string;
  media_url?: string | null;
}

interface InboxResponse {
  conversations?: InboxConversation[];
  messages?: InboxThreadMessage[];
  fan?: {
    id: string;
    pseudo_insta?: string | null;
    pseudo_web?: string | null;
    sources?: ("web" | "instagram")[];
    avatar_url?: string | null;
    display_name?: string | null;
  } | null;
}

interface ModelSelf {
  slug: string;
  name: string;
  avatarUrl: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Alias vers le helper partagé (même format dans header + messagerie)
const timeAgo = sharedFormatTime;

function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

// Wrapper qui délègue au helper partagé — garantit mêmes règles que le header.
function primaryHandle(c: InboxConversation): string {
  return getConversationPseudo(c);
}

function Avatar({
  url,
  name,
  size = 40,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  const initial = (name || "?").replace(/^@/, "").slice(0, 1).toUpperCase();
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

function SourceDots({ sources }: { sources: ("web" | "instagram")[] }) {
  return (
    <div className="flex items-center gap-1">
      {sources.includes("web") && (
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: "rgba(107,114,128,0.18)" }}
          title="Web"
        >
          <MessageCircle className="w-2.5 h-2.5" style={{ color: "#9CA3AF" }} />
        </span>
      )}
      {sources.includes("instagram") && (
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(131,58,180,0.22), rgba(225,48,108,0.22), rgba(247,119,55,0.22))",
          }}
          title="Instagram"
        >
          <Instagram className="w-2.5 h-2.5" style={{ color: "#E1306C" }} />
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MessagingPage() {
  // Suspense wrapper required by Next.js 15 for pages using useSearchParams()
  return (
    <Suspense fallback={null}>
      <MessagingPageInner />
    </Suspense>
  );
}

function MessagingPageInner() {
  const { auth, currentModel } = useModel();
  const searchParams = useSearchParams();

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [orderMode, setOrderMode] = useState<OrderMode>("recent");
  const [view, setView] = useState<MessagerieView>("messages");
  // NB 2026-04-24 : mode agent par conversation (null = héritage persona)
  const [convMode, setConvMode] = useState<{ mode: AgentMode; override: AgentMode | null; source: "override" | "persona_default" } | null>(null);
  const [convModeOpen, setConvModeOpen] = useState(false);
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [currentFanId, setCurrentFanId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxThreadMessage[]>([]);
  const [currentFan, setCurrentFan] = useState<InboxResponse["fan"] | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modelSelf, setModelSelf] = useState<ModelSelf | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  // Contacts view mode — when true, list groups-by-fan view (via B7 button).
  // Kept simple : view=contacts from query param opens the drawer instead
  // of changing the list layout (which is already fan-grouped).
  const [drawerFanId, setDrawerFanId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const listAbortRef = useRef<AbortController | null>(null);
  const threadAbortRef = useRef<AbortController | null>(null);

  // Load inbox (conversations + optional thread)
  const loadInbox = async (fanId?: string | null, filter?: SourceFilter) => {
    const activeFilter = filter ?? sourceFilter;
    listAbortRef.current?.abort();
    const abort = new AbortController();
    listAbortRef.current = abort;

    try {
      const qs = new URLSearchParams({ source: activeFilter });
      if (fanId) qs.set("fan_id", fanId);
      const res = await fetch(`/api/agence/messaging/inbox?${qs.toString()}`, {
        signal: abort.signal,
      });
      if (!res.ok) return;
      const data: InboxResponse = await res.json();

      // Conversations
      if (Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
      // Messages + current fan (if fanId requested)
      if (fanId) {
        if (Array.isArray(data.messages)) setMessages(data.messages);
        if (data.fan) setCurrentFan(data.fan);
      }
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
    } finally {
      setLoadingList(false);
    }
  };

  // Load thread only (lighter fetch on selection)
  const loadThread = async (fanId: string) => {
    threadAbortRef.current?.abort();
    const abort = new AbortController();
    threadAbortRef.current = abort;
    setLoadingThread(true);
    try {
      const qs = new URLSearchParams({
        source: sourceFilter,
        fan_id: fanId,
      });
      const res = await fetch(`/api/agence/messaging/inbox?${qs.toString()}`, {
        signal: abort.signal,
      });
      if (!res.ok) return;
      const data: InboxResponse = await res.json();
      if (Array.isArray(data.messages)) setMessages(data.messages);
      if (data.fan) setCurrentFan(data.fan);
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
    } finally {
      setLoadingThread(false);
    }
  };

  // Initial load + poll every 15s
  useEffect(() => {
    loadInbox();
    const interval = setInterval(() => {
      // Keep current selection intact; refresh list + thread together
      loadInbox(currentFanId);
    }, 15000);
    return () => {
      clearInterval(interval);
      listAbortRef.current?.abort();
      threadAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // B7 : `?view=contacts` — surface the fan drawer on the first conversation
  // loaded (used when redirected from `/agence/clients`).
  useEffect(() => {
    const view = searchParams?.get("view");
    if (view === "contacts" && conversations.length > 0 && !drawerOpen) {
      const first = conversations[0];
      if (first?.fan_id && !first.fan_id.startsWith("pseudo:")) {
        setCurrentFanId(first.fan_id);
        setDrawerFanId(first.fan_id);
        setDrawerOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, conversations.length]);

  // Reload list when filter changes
  useEffect(() => {
    setLoadingList(true);
    loadInbox(currentFanId, sourceFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFilter]);

  // NB 2026-04-24 : polling 15s aligné header + refresh sur focus tab
  // → synchro live pseudo upgrade + nouveaux messages sans reload manuel
  // (ex : visiteur ajoute pseudo_snap via /m/yumi → admin voit la maj en 15s max)
  useEffect(() => {
    const poll = () => {
      if (!document.hidden) {
        loadInbox(currentFanId, sourceFilter);
        if (currentFanId) loadThread(currentFanId);
      }
    };
    const iv = setInterval(poll, 15000);
    const onFocus = () => poll();
    const onVis = () => { if (!document.hidden) poll(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    // Refresh aussi quand un handle change (event dispatched par IdentityGate/profile upgrade)
    const onHandleUpdate = () => poll();
    window.addEventListener("heaven:client-handle-updated", onHandleUpdate);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("heaven:client-handle-updated", onHandleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFanId, sourceFilter]);

  // Load thread when fan changes
  useEffect(() => {
    if (currentFanId) loadThread(currentFanId);
    else {
      setMessages([]);
      setCurrentFan(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFanId]);

  // NB 2026-04-24 : marquer conversation comme lue dès ouverture
  // → décrémente compteur non-lus header + met à jour unread_count row.
  // Pour pseudo-fans (format pseudo:<client_id>) : extrait client_id et call mark_read.
  useEffect(() => {
    if (!currentFanId) return;
    const slug = (currentModel || auth?.model_slug || "").toLowerCase();
    if (!slug) return;

    const clientId = currentFanId.startsWith("pseudo:")
      ? currentFanId.slice("pseudo:".length)
      : null;

    // Real fans (UUID direct in agence_fans) : API mark_read par fan_id pas encore dispo,
    // on skip — ils utiliseront le flow classique une fois fans unifiés (BRIEF-13).
    if (!clientId) return;

    fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        model: toModelId(slug),
        client_id: clientId,
        action: "mark_read",
      }),
    }).then(() => {
      // Optimistic UI : reset unread_count local pour feedback immédiat
      setConversations((prev) =>
        prev.map((c) => (c.fan_id === currentFanId ? { ...c, unread_count: 0 } : c))
      );
      // Trigger event global pour que le header se refresh (dropdown + badge)
      window.dispatchEvent(new CustomEvent("heaven:messages-read", { detail: { clientId } }));
    }).catch(() => { /* silent */ });
  }, [currentFanId, currentModel, auth?.model_slug]);

  // Fetch own model avatar
  // Cloisonnement strict : currentModel (root selector) OU model_slug session.
  // Pas de fallback "yumi" hardcodé : si aucun slug, on skip l'appel.
  useEffect(() => {
    const slug = (currentModel || auth?.model_slug || "").toLowerCase();
    if (!slug) { setModelSelf(null); return; }
    fetch(`/api/models/photo?login=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.slug) {
          setModelSelf({
            slug: d.slug,
            avatarUrl: d.url || null,
            name: (auth?.display_name || d.slug).toUpperCase(),
          });
        }
      })
      .catch(() => {});
  }, [auth?.display_name, auth?.model_slug, currentModel]);

  // Search + ordering
  const filteredConversations = useMemo(() => {
    const base = conversations.filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.pseudo_insta?.toLowerCase().includes(q) ||
        c.pseudo_web?.toLowerCase().includes(q) ||
        c.pseudo_snap?.toLowerCase().includes(q) ||
        c.display_name?.toLowerCase().includes(q) ||
        c.last_message?.text?.toLowerCase().includes(q)
      );
    });
    // NB 2026-04-24 : ordre configurable
    if (orderMode === "oldest") {
      return [...base].sort((a, b) =>
        new Date(a.last_message_at).getTime() - new Date(b.last_message_at).getTime()
      );
    }
    if (orderMode === "unread") {
      return [...base].sort((a, b) => {
        const u = (b.unread_count || 0) - (a.unread_count || 0);
        if (u !== 0) return u;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
    }
    // default "recent" — already sorted server-side DESC
    return base;
  }, [conversations, searchQuery, orderMode]);

  const currentConversation = useMemo(
    () => conversations.find((c) => c.fan_id === currentFanId) || null,
    [conversations, currentFanId]
  );

  // Fetch conversation agent mode when fan changes (override ou héritage persona).
  useEffect(() => {
    if (!currentFanId) { setConvMode(null); return; }
    let aborted = false;
    fetch(`/api/agence/messaging/mode?fan_id=${encodeURIComponent(currentFanId)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (aborted || !d) return;
        setConvMode({ mode: d.mode, override: d.override, source: d.source });
      })
      .catch(() => {});
    return () => { aborted = true; };
  }, [currentFanId]);

  const updateConvMode = useCallback(async (nextOverride: AgentMode | null) => {
    if (!currentFanId) return;
    try {
      const r = await fetch("/api/agence/messaging/mode", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fan_id: currentFanId, mode: nextOverride }),
      });
      if (r.ok) {
        const d = await r.json();
        setConvMode({ mode: d.mode, override: d.override, source: d.source });
      }
    } catch { /* silent */ }
    setConvModeOpen(false);
  }, [currentFanId]);

  // Last IG inbound message timestamp — drives the Meta 24h window timer.
  const lastIgInboundAt: string | null = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.source === "instagram" && m.direction === "in") return m.created_at;
    }
    return null;
  }, [messages]);

  // Whether the current fan has each channel (drives MultiChannelReply).
  const fanChannels = useMemo(() => {
    const fan = currentFan || currentConversation;
    return {
      hasWeb:
        !!(currentConversation?.pseudo_web) ||
        !!currentConversation?.sources?.includes("web") ||
        !!fan?.pseudo_web,
      hasInstagram:
        !!(currentConversation?.pseudo_insta) ||
        !!currentConversation?.sources?.includes("instagram") ||
        !!fan?.pseudo_insta,
      hasSnap: !!currentConversation?.pseudo_snap,
      hasFanvue: !!currentConversation?.fanvue_handle,
    };
  }, [currentConversation, currentFan]);

  // Last message source in the thread (auto-select reply channel).
  const lastMessageSource: ReplyChannel | null = useMemo(() => {
    const last = messages[messages.length - 1];
    if (last?.source === "web" || last?.source === "instagram") return last.source;
    return null;
  }, [messages]);

  // Timeline mapping — messages are sorted asc (oldest first) in thread.
  // FanTimeline internally sorts desc by default — pass items as-is for cross-day grouping.
  const timelineItems: TimelineItem[] = useMemo(
    () =>
      messages.map((m) => ({
        id: m.id,
        source: m.source,
        direction: m.direction,
        text: m.text,
        created_at: m.created_at,
        media_url: m.media_url,
      })),
    [messages]
  );

  // Handlers
  const handleSelect = (fanId: string) => {
    setCurrentFanId(fanId);
    setMobileShowThread(true);
  };

  const handleBack = () => {
    setMobileShowThread(false);
  };

  const handleSent = () => {
    if (currentFanId) {
      loadInbox(currentFanId);
    }
  };

  const openDrawer = (fanId: string | null) => {
    if (!fanId || fanId.startsWith("pseudo:")) return;
    setDrawerFanId(fanId);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const openContactsView = () => {
    // The list is already a fan-grouped conversation list — toggling the
    // contacts button simply opens the drawer on the current or first fan.
    if (currentFanId) {
      openDrawer(currentFanId);
      return;
    }
    const firstReal = conversations.find((c) => !c.fan_id.startsWith("pseudo:"));
    if (firstReal) {
      setCurrentFanId(firstReal.fan_id);
      setMobileShowThread(true);
      openDrawer(firstReal.fan_id);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <OsLayout cpId="agence">
      <div
        className="flex flex-col"
        style={{ height: "calc(100vh - 48px)", background: "var(--bg)" }}
      >
        {/* Top bar — source filter */}
        <div
          className="flex items-center justify-between px-3 md:px-4 py-2.5 shrink-0 gap-2"
          style={{
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, #E6C974, #9E7C1F)",
              }}
            >
              <MessageCircle className="w-3.5 h-3.5" style={{ color: "#0A0A0C" }} />
            </div>
            <div className="min-w-0">
              <h1
                className="text-sm font-bold leading-tight truncate"
                style={{ color: "var(--text)" }}
              >
                {view === "agent-ia" ? "Agent IA" : "Messagerie unifiée"}
              </h1>
              <p
                className="text-[10px] truncate"
                style={{ color: "var(--text-muted)" }}
              >
                {view === "agent-ia"
                  ? "Persona · playground · logs"
                  : `Web + Instagram · ${conversations.length} conversation${conversations.length > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* View switch : Messages | Agent IA — NB 2026-04-24 */}
          <div
            className="inline-flex rounded-lg p-0.5 shrink-0"
            style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}
          >
            {([
              { id: "messages" as MessagerieView, label: "Messages", icon: MessageCircle },
              { id: "agent-ia" as MessagerieView, label: "Agent IA", icon: Bot },
            ]).map(({ id, label, icon: Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className="inline-flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded text-[10px] md:text-[11px] font-semibold transition-colors"
                  style={{
                    background: active ? (id === "agent-ia" ? "rgba(167,139,250,0.18)" : "rgba(212,175,55,0.18)") : "transparent",
                    color: active ? (id === "agent-ia" ? "#A78BFA" : "#D4AF37") : "var(--text-muted)",
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Ordre — visible seulement sur vue Messages */}
          {view === "messages" && (
          <div
            className="inline-flex rounded-lg p-0.5 shrink-0"
            style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}
          >
            {(["recent", "oldest", "unread"] as const).map((o) => {
              const active = orderMode === o;
              const label = o === "recent" ? "Récent" : o === "oldest" ? "Ancien" : "Non lus";
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOrderMode(o)}
                  className="px-2.5 md:px-3 py-1 rounded text-[10px] md:text-[11px] font-semibold transition-colors"
                  style={{
                    background: active ? "rgba(212,175,55,0.18)" : "transparent",
                    color: active ? "#D4AF37" : "var(--text-muted)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          )}

          {/* Filtre source (web / instagram) — visible seulement sur vue Messages */}
          {view === "messages" && (
          <div
            className="inline-flex rounded-lg p-0.5 shrink-0"
            style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}
          >
            {(["all", "web", "instagram"] as const).map((f) => {
              const active = sourceFilter === f;
              const label =
                f === "all" ? "Tous" : f === "web" ? "Web" : "Instagram";
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSourceFilter(f)}
                  className="px-2.5 md:px-3 py-1 rounded text-[10px] md:text-[11px] font-semibold transition-colors"
                  style={{
                    background: active
                      ? f === "instagram"
                        ? "rgba(225,48,108,0.15)"
                        : f === "web"
                        ? "rgba(107,114,128,0.18)"
                        : "linear-gradient(135deg, #E6C974, #C9A84C)"
                      : "transparent",
                    color: active
                      ? f === "instagram"
                        ? "#E1306C"
                        : f === "web"
                        ? "#9CA3AF"
                        : "#0A0A0C"
                      : "var(--text-muted)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          )}
        </div>

        {/* Main split — uniquement en vue Messages, sinon AgentIAPanel */}
        {view === "agent-ia" ? (
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: "var(--bg)" }}>
            <AgentIAPanel />
          </div>
        ) : (
        <div className="flex flex-1 min-h-0">
          {/* LIST — left column */}
          <aside
            className={`w-full md:w-[320px] md:min-w-[280px] md:max-w-[360px] shrink-0 flex flex-col ${
              mobileShowThread ? "hidden md:flex" : "flex"
            }`}
            style={{
              background: "var(--surface)",
              borderRight: "1px solid var(--border)",
            }}
          >
            <div
              className="p-3 shrink-0 space-y-2"
              style={{ borderBottom: "1px solid var(--border2)" }}
            >
              {/* Contacts toggle — opens fan drawer for the selected / first fan (B7) */}
              <button
                type="button"
                onClick={openContactsView}
                className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors"
                style={{
                  background: drawerOpen
                    ? "rgba(201,168,76,0.15)"
                    : "rgba(245,158,11,0.08)",
                  color: drawerOpen ? "#E6C974" : "#F59E0B",
                  border: `1px solid ${
                    drawerOpen ? "rgba(201,168,76,0.3)" : "rgba(245,158,11,0.2)"
                  }`,
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <BookUser className="w-3.5 h-3.5" />
                  Contacts
                </span>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>

              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}
              >
                <Search
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type="text"
                  placeholder="Rechercher un fan…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-full placeholder:opacity-50"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingList && conversations.length === 0 && (
                <div
                  className="flex items-center justify-center py-10 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Chargement…
                </div>
              )}

              {!loadingList && filteredConversations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: "var(--bg3)" }}
                  >
                    <Users
                      className="w-5 h-5"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </div>
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Aucune conversation
                  </p>
                  <p
                    className="text-[10px] mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {searchQuery
                      ? "Aucun résultat pour cette recherche"
                      : sourceFilter === "all"
                      ? "Les conversations apparaîtront ici"
                      : `Aucune conversation ${
                          sourceFilter === "instagram" ? "Instagram" : "Web"
                        }`}
                  </p>
                </div>
              )}

              {filteredConversations.map((conv) => {
                const active = conv.fan_id === currentFanId;
                const title = primaryHandle(conv);
                return (
                  <button
                    key={conv.fan_id}
                    type="button"
                    onClick={() => handleSelect(conv.fan_id)}
                    className="w-full text-left px-3 py-3 transition-colors cursor-pointer border-none outline-none"
                    style={{
                      background: active ? "var(--bg2)" : "transparent",
                      borderLeft: active
                        ? "3px solid #C9A84C"
                        : "3px solid transparent",
                      borderBottom: "1px solid var(--border2)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        url={conv.avatar_url}
                        name={conv.display_name || title}
                        size={40}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className="text-xs font-semibold truncate"
                            style={{ color: "var(--text)" }}
                          >
                            {title}
                          </span>
                          {conv.unread_count > 0 && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0"
                              style={{ background: "#C9A84C", color: "#0A0A0C" }}
                            >
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <SourceDots sources={conv.sources || []} />
                          {conv.tier && conv.tier !== "free" && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold"
                              style={{
                                background: "rgba(201,168,76,0.15)",
                                color: "#E6C974",
                              }}
                            >
                              {conv.tier}
                            </span>
                          )}
                        </div>
                        <p
                          className="text-[11px] truncate"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {conv.last_message?.direction === "out" ? "✓ " : ""}
                          {truncate(conv.last_message?.text || "—", 48)}
                        </p>
                      </div>
                      <span
                        className="text-[10px] tabular-nums shrink-0 mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {timeAgo(conv.last_message_at)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* THREAD — center column */}
          <section
            className={`flex-1 flex flex-col min-w-0 ${
              !mobileShowThread ? "hidden md:flex" : "flex"
            }`}
            style={{ background: "var(--bg)" }}
          >
            {currentFanId && currentConversation ? (
              <>
                {/* Thread header */}
                <div
                  className="flex items-center gap-3 px-4 md:px-5 py-3 shrink-0"
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleBack}
                    className="md:hidden p-1.5 rounded-lg border-none shrink-0"
                    style={{ background: "var(--bg2)", color: "var(--text)" }}
                    aria-label="Retour"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <Avatar
                    url={currentConversation.avatar_url || currentFan?.avatar_url}
                    name={primaryHandle(currentConversation)}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--text)" }}
                      >
                        {primaryHandle(currentConversation)}
                      </p>
                      <SourceDots sources={currentConversation.sources || []} />
                      {currentConversation.sources.includes("instagram") && (
                        <Meta24hTimer lastInboundAt={lastIgInboundAt} compact />
                      )}
                    </div>
                    <p
                      className="text-[10px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {currentConversation.sources.length > 1
                        ? "Thread unifié web + Instagram"
                        : currentConversation.sources[0] === "instagram"
                        ? "Conversation Instagram"
                        : "Conversation web"}
                    </p>
                  </div>
                  {/* Mode agent pour cette conversation — NB 2026-04-24 */}
                  {convMode && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setConvModeOpen((o) => !o)}
                        title={`Mode agent : ${MODE_LABELS[convMode.mode].label} (${convMode.source === "override" ? "override conversation" : "défaut persona"})`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                        style={{
                          background: `${MODE_LABELS[convMode.mode].color}15`,
                          color: MODE_LABELS[convMode.mode].color,
                          border: `1px solid ${MODE_LABELS[convMode.mode].color}40`,
                        }}
                      >
                        {convMode.mode === "auto" ? <Radio className="w-3 h-3" />
                          : convMode.mode === "copilot" ? <GraduationCap className="w-3 h-3" />
                          : <UserRound className="w-3 h-3" />}
                        <span className="hidden sm:inline">
                          {MODE_LABELS[convMode.mode].short}
                          {convMode.source === "persona_default" && (
                            <span className="ml-1 opacity-50">(défaut)</span>
                          )}
                        </span>
                      </button>
                      {convModeOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setConvModeOpen(false)} />
                          <div
                            className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden min-w-[220px]"
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
                            }}
                          >
                            <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border2)" }}>
                              <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>
                                Mode agent (cette conversation)
                              </p>
                            </div>
                            {(["auto", "copilot", "user"] as AgentMode[]).map((m) => {
                              const meta = MODE_LABELS[m];
                              const selected = convMode.override === m;
                              const Icon = m === "auto" ? Radio : m === "copilot" ? GraduationCap : UserRound;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => updateConvMode(m)}
                                  className="w-full flex items-start gap-2 px-3 py-2 text-left transition-colors cursor-pointer hover:brightness-110"
                                  style={{
                                    background: selected ? `${meta.color}15` : "transparent",
                                  }}
                                >
                                  <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: meta.color }} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold" style={{ color: selected ? meta.color : "var(--text)" }}>
                                      {meta.label}
                                    </p>
                                    <p className="text-[10px] leading-snug" style={{ color: "var(--text-muted)" }}>
                                      {meta.description.slice(0, 80)}{meta.description.length > 80 ? "…" : ""}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                            {convMode.override !== null && (
                              <button
                                type="button"
                                onClick={() => updateConvMode(null)}
                                className="w-full flex items-center gap-2 px-3 py-2 border-t cursor-pointer hover:brightness-110"
                                style={{ borderColor: "var(--border2)", color: "var(--text-muted)" }}
                              >
                                <Sparkles className="w-3 h-3" />
                                <span className="text-[10px]">Retour au défaut persona</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      currentFanId && !currentFanId.startsWith("pseudo:")
                        ? openDrawer(currentFanId)
                        : undefined
                    }
                    disabled={!currentFanId || currentFanId.startsWith("pseudo:")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: "rgba(201,168,76,0.1)",
                      color: "#E6C974",
                      border: "1px solid rgba(201,168,76,0.25)",
                    }}
                  >
                    <BookUser className="w-3 h-3" />
                    <span className="hidden sm:inline">Fiche fan</span>
                  </button>
                </div>

                {/* Meta 24h alert banner — full width when expired */}
                {currentConversation.sources.includes("instagram") &&
                  lastIgInboundAt &&
                  (() => {
                    const expiredMs =
                      Date.now() -
                      new Date(lastIgInboundAt).getTime() -
                      24 * 60 * 60 * 1000;
                    if (expiredMs <= 0) return null;
                    return (
                      <div
                        className="px-4 md:px-5 py-2 text-[11px] font-medium shrink-0"
                        style={{
                          background: "rgba(220,38,38,0.08)",
                          color: "#F87171",
                          borderBottom: "1px solid rgba(220,38,38,0.22)",
                        }}
                      >
                        Fenêtre Meta 24h expirée — reply IG bloquée. Utilise le canal Web si le fan
                        en a un, ou Message Tag (hors scope actuel).
                      </div>
                    );
                  })()}

                {/* Thread body */}
                <div
                  className="flex-1 overflow-y-auto px-4 md:px-6 py-4"
                  style={{ background: "var(--bg)" }}
                >
                  {loadingThread && messages.length === 0 ? (
                    <div
                      className="flex items-center justify-center py-10 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Chargement des messages…
                    </div>
                  ) : (
                    <FanTimeline
                      items={timelineItems}
                      emptyLabel="Aucun message pour cette conversation"
                      outAvatarUrl={modelSelf?.avatarUrl}
                      outAvatarName={modelSelf?.name || "YUMI"}
                      inAvatarName={primaryHandle(currentConversation)}
                    />
                  )}
                </div>

                {/* Composer — multi-channel aware (IG 24h gate, Snap/Fanvue locks) */}
                <div
                  className="px-3 md:px-5 py-3 shrink-0"
                  style={{
                    borderTop: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <MultiChannelReply
                    fanId={currentFanId}
                    fanChannels={fanChannels}
                    lastMessageSource={lastMessageSource}
                    lastIgInboundAt={lastIgInboundAt}
                    onSent={handleSent}
                  />
                </div>
              </>
            ) : (
              <div
                className="flex-1 flex flex-col items-center justify-center"
                style={{ background: "var(--bg)" }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "var(--bg3)" }}
                >
                  <MessageCircle
                    className="w-7 h-7"
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Sélectionne une conversation
                </p>
                <p
                  className="text-[11px] mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Les messages web et Instagram apparaîtront ici
                </p>
              </div>
            )}
          </section>

          {/* DRAWER — right column (fan profile, handles, context) */}
          <ContactsDrawer
            fanId={drawerFanId}
            open={drawerOpen}
            onClose={closeDrawer}
          />
        </div>
        )}
      </div>
    </OsLayout>
  );
}
