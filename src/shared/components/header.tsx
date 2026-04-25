"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Users, Globe, Instagram } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useModel } from "@/lib/model-context";
import { toModelId } from "@/lib/model-utils";
import { TIER_CONFIG } from "@/constants/tiers";
import { MessagesDropdown } from "@/components/header/messages-dropdown";
import { ClientsDropdown } from "@/components/header/clients-dropdown";
import { SocialsDropdown } from "@/components/header/socials-dropdown";
import { RootCpSelector } from "@/components/cockpit/root-cp-selector";
// BRIEF-19+20+21 (Session 2026-04-25 evening) — header CP centralisé fonctionnel
import { HeavenAdminActions } from "@/components/header/heaven-admin-actions";
import { StoryGeneratorModal } from "@/components/profile/story-generator-modal";
// Legacy StoryGenerator @deprecated — remplacé par StoryGeneratorModal
// (gardé non-importé : à supprimer cycle suivant après vérif zéro usage)

// ── Page titles ──
const PAGE_TITLES: Record<string, string> = {
  "/agence": "Dashboard",
  "/agence/messagerie": "Messagerie",
  "/agence/instagram": "Instagram",
  "/agence/finances": "Finances",
  "/agence/automation": "Automation",
  "/agence/architecture": "Architecture",
  "/agence/settings": "Settings",
};

// ── Platforms ──
const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#C13584", urlPrefix: "https://instagram.com/" },
  { id: "snapchat", label: "Snapchat", icon: Globe, color: "#C4A600", urlPrefix: "https://snapchat.com/add/" },
  { id: "onlyfans", label: "OnlyFans", icon: Globe, color: "#008CCF", urlPrefix: "https://onlyfans.com/" },
  { id: "fanvue", label: "Fanvue", icon: Globe, color: "#6D28D9", urlPrefix: "https://fanvue.com/" },
  { id: "mym", label: "MYM", icon: Globe, color: "#CC2952", urlPrefix: "https://mym.fans/" },
  { id: "tiktok", label: "TikTok", icon: Globe, color: "#333333", urlPrefix: "https://tiktok.com/@" },
];

type DropdownId = "messages" | "clients" | "socials" | null;

interface MessageItem {
  id: string; client_id: string; content: string; created_at: string;
  sender_type: string; read?: boolean; model?: string;
}
interface ClientItem {
  id: string; pseudo_snap: string | null; pseudo_insta: string | null;
  // NB 2026-04-24 : pseudo_web séparé (visiteur-NNN, guest-xxx) → pas d'IG/Snap link.
  pseudo_web?: string | null;
  model: string; tier: string | null; last_active: string | null; created_at: string;
  verified_status?: string | null; lead_source?: string | null;
}
interface CodeItem {
  code: string; client: string; tier: string; active: boolean;
  revoked: boolean; expiresAt: string;
}

export function Header() {
  const pathname = usePathname();
  const { currentModel, auth, authHeaders, ready } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "";
  const [modelInfo, setModelInfo] = useState<{
    display_name?: string; online?: boolean;
    platforms?: Record<string, string | null>;
  } | null>(null);

  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [recentMessages, setRecentMessages] = useState<MessageItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [codes, setCodes] = useState<CodeItem[]>([]);

  const [showStoryGen, setShowStoryGen] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Inline chat state
  const [activeChat, setActiveChat] = useState<{ clientId: string; pseudo: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<MessageItem[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // NB 2026-04-24 Bug #7 : composer passe en <textarea> multi-line
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const [pendingOrders, setPendingOrders] = useState<{ id: string; pseudo: string; content: string; created_at: string }[]>([]);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const pageTitle = PAGE_TITLES[pathname] || pathname.split("/").pop()?.replace(/-/g, " ") || "";

  const pendingClients = clients.filter(c => !c.verified_status || c.verified_status === "pending");

  // ── Verify/reject client directly from header ──
  const handleVerify = async (clientId: string, action: "verify" | "reject") => {
    setVerifyingId(clientId);
    try {
      await fetch("/api/clients", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ id: clientId, action, verified_by: modelSlug }),
      });
      fetchClients();
    } catch (e) { console.error("[Header] verify error:", e); }
    setVerifyingId(null);
  };

  // ── Fetch pending orders (wall posts from SYSTEM with ⏳) ──
  const fetchOrders = useCallback(() => {
    if (!modelSlug) return;
    fetch(`/api/wall?model=${toModelId(modelSlug)}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const posts = (d.posts || []) as { id: string; pseudo: string; content: string; created_at: string }[];
        setPendingOrders(posts.filter(p => p.pseudo === "SYSTEM" && p.content?.startsWith("⏳")));
      }).catch(() => {});
  }, [modelSlug, authHeaders]);

  // ── Accept order — mark as validated, generate code, send to client ──
  const handleAcceptOrder = async (orderId: string, content: string) => {
    setProcessingOrderId(orderId);
    try {
      // Parse order details
      const pseudoMatch = content?.match(/@(\S+)/);
      const pseudo = pseudoMatch?.[1] || "";
      const labelToSlot: Record<string, string> = {};
      for (const [slot, cfg] of Object.entries(TIER_CONFIG)) {
        if (/^p[1-5]$/.test(slot)) labelToSlot[cfg.label.toLowerCase()] = slot;
      }
      const tierNames = Object.keys(labelToSlot).map(l => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      const tierMatch = content?.match(new RegExp(tierNames, "i"));
      const tier = tierMatch ? (labelToSlot[tierMatch[0].toLowerCase()] || "p1") : "p1";
      const amountMatch = content?.match(/\((\d+)€\)/);
      const amount = amountMatch ? amountMatch[1] : "0";
      const itemMatch = content?.match(/commande:\s*(.+?)\s*\(/);
      const items = itemMatch?.[1]?.trim() || "";

      // Delete the pending post
      await fetch(`/api/wall?id=${orderId}&model=${toModelId(modelSlug)}`, { method: "DELETE", headers: authHeaders() });

      // Find the client
      let clientId: string | null = null;
      if (pseudo) {
        try {
          const clientRes = await fetch(`/api/clients?model=${toModelId(modelSlug)}&search=${encodeURIComponent(pseudo)}`, { headers: authHeaders() });
          const clientData = await clientRes.json();
          clientId = (clientData.clients || [])[0]?.id || null;
        } catch { /* ignore */ }
      }

      // Auto-generate access code
      let generatedCode: string | null = null;
      try {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let r = ""; for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
        const codeStr = `${modelSlug.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${r}`;
        const codeRes = await fetch("/api/codes", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            model: toModelId(modelSlug),
            code: codeStr,
            client: pseudo.toLowerCase(),
            tier,
            type: "paid",
            duration: 720,
            platform: "snapchat",
          }),
        });
        const codeData = await codeRes.json();
        generatedCode = codeData.code?.code || null;
      } catch { /* ignore */ }

      // Post explicit confirmation wall post
      const confirmedContent = `✅ Paiement validé — @${pseudo} — ${items || `Pack ${tier}`} ${amount}€${generatedCode ? ` — Code envoyé ✓` : ""}`;
      await fetch("/api/wall", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ model: toModelId(modelSlug), pseudo: "SYSTEM", content: confirmedContent }),
      });

      // Send code to client via chat
      if (generatedCode && clientId) {
        await fetch("/api/messages", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            model: toModelId(modelSlug),
            client_id: clientId,
            sender_type: "model",
            content: `✅ Paiement confirmé ! Voici ton code d'accès : ${generatedCode}\n\nEntre-le sur mon profil pour débloquer ton contenu. Le code est valable 30 jours.`,
          }),
        }).catch(() => {});
      }

      setPendingOrders(prev => prev.filter(o => o.id !== orderId));

      // Increment orders_completed for the client
      if (clientId) {
        fetch("/api/clients/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: toModelId(modelSlug), client_id: clientId, action: "order_completed" }),
        }).catch(() => {});
      }
    } catch (e) { console.error("[Header] accept order error:", e); }
    setProcessingOrderId(null);
  };

  // ── Refuse order ──
  const handleRefuseOrder = async (orderId: string, content: string) => {
    setProcessingOrderId(orderId);
    try {
      await fetch(`/api/wall?id=${orderId}&model=${toModelId(modelSlug)}`, { method: "DELETE", headers: authHeaders() });
      const refused = content.replace("⏳", "❌").replace("en attente de validation", "REFUSÉE");
      await fetch("/api/wall", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ model: toModelId(modelSlug), pseudo: "SYSTEM", content: refused }),
      });
      setPendingOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (e) { console.error("[Header] refuse order error:", e); }
    setProcessingOrderId(null);
  };

  // ── Close on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) { setOpenDropdown(null); setActiveChat(null); setReplyText(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Listen for socials toggle from tab bar ──
  useEffect(() => {
    const handler = () => setOpenDropdown(prev => prev === "socials" ? null : "socials");
    window.addEventListener("heaven:toggle-socials", handler);
    return () => window.removeEventListener("heaven:toggle-socials", handler);
  }, []);

  // ── Fetch model info ──
  useEffect(() => {
    if (!ready || !modelSlug) return;
    fetch(`/api/models/${modelSlug}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setModelInfo(d); }).catch(() => {});
  }, [ready, modelSlug, authHeaders]);

  // ── Fetch messages + clients depuis inbox unifié (NB 2026-04-24) ──
  // L'inbox unifié (agence_messages_timeline) est la même source que /agence/messagerie
  // → garantit sync pseudo + messages + unread entre header et page messagerie.
  // Fallback legacy : si endpoint 401/500, on retombe sur /api/messages + /api/clients.
  const fetchMessages = useCallback(async () => {
    if (!modelSlug) return;
    try {
      const r = await fetch(`/api/agence/messaging/inbox?source=all&model=${toModelId(modelSlug)}`, {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!r.ok) throw new Error(`inbox_${r.status}`);
      const d = await r.json();
      const convs = (d.conversations || []) as Array<{
        fan_id: string;
        pseudo_insta?: string | null;
        pseudo_web?: string | null;
        pseudo_snap?: string | null;
        display_name?: string | null;
        last_message?: { text: string; direction: "in" | "out"; created_at: string; source: "web" | "instagram" } | null;
        unread_count: number;
        last_message_at: string;
      }>;

      // Transform → MessageItem[] synthétique (1 row par conversation = last_message).
      const synthMsgs: MessageItem[] = convs
        .filter((c) => !!c.last_message)
        .map((c) => ({
          id: `${c.fan_id}-${c.last_message!.created_at}`,
          client_id: c.fan_id, // fan_id ou "pseudo:..." fallback
          content: c.last_message!.text,
          created_at: c.last_message!.created_at,
          sender_type: c.last_message!.direction === "in" ? "client" : "model",
          read: c.unread_count === 0,
        }));

      // Transform → ClientItem[] enrichi.
      // NB 2026-04-24 : on ne MIX pas pseudo_web avec pseudo_insta — sinon la
      // PlatformAvatar affiche l'icône Instagram pour un visiteur web qui n'a
      // pas d'IG. Le pseudo_web reste dans son champ dédié → avatar Globe.
      const synthClients: ClientItem[] = convs.map((c) => ({
        id: c.fan_id,
        pseudo_snap: c.pseudo_snap || null,
        pseudo_insta: c.pseudo_insta || null,
        pseudo_web: c.pseudo_web || c.display_name || null,
        model: toModelId(modelSlug),
        tier: null,
        last_active: c.last_message_at,
        created_at: c.last_message_at,
      }));

      setRecentMessages(synthMsgs.slice(0, 10));
      setUnreadCount(convs.reduce((s, c) => s + (c.unread_count || 0), 0));
      setClients(synthClients);
    } catch {
      // Fallback legacy
      try {
        const r2 = await fetch(`/api/messages?model=${toModelId(modelSlug)}`, { headers: authHeaders() });
        if (r2.ok) {
          const d2 = await r2.json();
          const msgs: MessageItem[] = d2.messages || [];
          setRecentMessages(msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10));
          setUnreadCount(msgs.filter((m) => m.sender_type === "client" && !m.read).length);
        }
      } catch { /* noop */ }
    }
  }, [modelSlug, authHeaders]);

  // ── Fetch codes uniquement (clients viennent de l'inbox unifié) ──
  const fetchClients = useCallback(() => {
    if (!modelSlug) return;
    fetch(`/api/codes?model=${toModelId(modelSlug)}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((co) => {
        if (co) setCodes(co.codes || []);
      })
      .catch(() => {});
  }, [modelSlug, authHeaders]);

  // ── Initial + polling — wait for context to be ready ──
  useEffect(() => {
    if (!ready || !modelSlug) return;
    fetchMessages(); fetchClients(); fetchOrders();
    const iv = setInterval(() => { fetchMessages(); fetchOrders(); }, 15000);
    return () => clearInterval(iv);
  }, [ready, modelSlug, fetchMessages, fetchClients, fetchOrders]);

  // NB 2026-04-24 : refresh immédiat compteur non-lus quand la page
  // messagerie marque une conversation comme lue (évite attendre le polling 15s).
  useEffect(() => {
    const handler = () => { fetchMessages(); };
    window.addEventListener("heaven:messages-read", handler);
    return () => window.removeEventListener("heaven:messages-read", handler);
  }, [fetchMessages]);

  // ── Open conversation with a client ──
  const openChat = useCallback(async (clientId: string, pseudo: string) => {
    setActiveChat({ clientId, pseudo });
    setReplyText("");
    setChatMessages([]);
    try {
      const res = await fetch(`/api/messages?model=${toModelId(modelSlug)}&client_id=${clientId}`, { headers: authHeaders() });
      const d = await res.json();
      if (d?.messages) {
        setChatMessages(d.messages.sort((a: MessageItem, b: MessageItem) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      }
      // Mark as read
      await fetch("/api/messages", {
        method: "PATCH", headers: authHeaders(),
        body: JSON.stringify({ model: toModelId(modelSlug), client_id: clientId, action: "mark_read" }),
      });
      fetchMessages();
    } catch {}
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      replyInputRef.current?.focus();
    }, 100);
  }, [modelSlug, authHeaders, fetchMessages]);

  // ── Send reply ──
  const sendReply = useCallback(async () => {
    if (!activeChat || !replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          model: toModelId(modelSlug),
          client_id: activeChat.clientId,
          sender_type: "model",
          content: replyText.trim(),
        }),
      });
      const d = await res.json();
      if (d?.message) {
        setChatMessages(prev => [...prev, d.message]);
        setReplyText("");
        fetchMessages();
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch {}
    setSending(false);
  }, [activeChat, replyText, sending, modelSlug, authHeaders, fetchMessages]);

  // ── Save platform ──
  const handleSavePlatform = async (platformId: string, value: string) => {
    const updated = { ...(modelInfo?.platforms || {}), [platformId]: value || null };
    await fetch(`/api/models/${modelSlug}`, { method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ config: { platforms: updated } }) }).catch(() => {});
    setModelInfo(prev => prev ? { ...prev, platforms: updated } : prev);
  };

  const toggle = (id: DropdownId) => setOpenDropdown(prev => prev === id ? null : id);
  const activeCodes = codes.filter(c => c.active && !c.revoked && new Date(c.expiresAt).getTime() > Date.now());
  const pseudoOf = (c: ClientItem) => c.pseudo_snap || c.pseudo_insta || c.id.slice(0, 8);

  // ── Dropdown box styling ──
  const dropdownBox = "fixed top-12 left-2 right-2 sm:absolute sm:top-[calc(100%+4px)] sm:left-auto sm:right-0 sm:w-[380px] max-h-[70vh] rounded-2xl overflow-hidden overflow-y-auto shadow-xl z-50";
  const dropdownStyle = { background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" };

  return (
    <header className="flex items-center h-12 px-3 sm:px-4"
      style={{ background: "var(--surface)",
        borderBottom: "1px solid var(--border)" }}>

      {/* Left — Model + page
          NB 2026-04-21 : « le cp selector doit tranformer le pseado du cp en
          bouton selector tout simplement » → le pseudo du CP EST le selector
          pour root (variant inline), un simple span pour les modèles. */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0"
            style={{ background: modelInfo?.online ? "#10B981" : "#EF4444",
              boxShadow: modelInfo?.online ? "0 0 6px rgba(16,185,129,0.4)" : "none" }} />
          {/* NB 2026-04-24 Bug #1 : tant que ModelProvider n'a pas hydraté la session
              (ready=false), on affiche systématiquement le RootCpSelector pour
              matcher le markup SSR (où auth est toujours null). Évite React #418
              en prod minifiée où un flip SSR→CSR changerait <RootCpSelector>
              vs <span>. Le switch réel se produit après ready=true (re-render). */}
          {!ready || !auth || auth.role === "root" ? (
            <RootCpSelector
              variant="inline"
              fallbackLabel="ROOT"
            />
          ) : (
            <span className="text-xs font-bold truncate" style={{ color: "var(--text)" }} suppressHydrationWarning>
              {modelInfo?.display_name || auth?.display_name || modelSlug.toUpperCase() || "ROOT"}
            </span>
          )}
        </div>
        {pageTitle && <>
          <span className="hidden sm:inline text-[10px]" style={{ color: "var(--text-muted)", opacity: 0.4 }}>/</span>
          <span className="hidden sm:inline text-xs font-medium truncate capitalize" style={{ color: "var(--text-muted)" }}>{pageTitle}</span>
        </>}
      </div>

      {/* Theme toggle — mobile */}
      <div className="shrink-0 md:hidden">
        <ThemeToggle size="sm" />
      </div>

      {/* BRIEF-19+20+21 — 4 boutons admin centrés (Eye / Link2 / Key / Story).
          Visible uniquement pour model/root. Centrage via flex-1 + justify-center.
          Mobile-first : touch targets 44×44 préservés via padding adaptatif. */}
      {auth?.role && (auth.role === "model" || auth.role === "root") && (
        <div className="flex-1 flex items-center justify-center min-w-0 px-1">
          <HeavenAdminActions
            modelSlug={currentModel || modelSlug}
            onStoryClick={() => setShowStoryGen(true)}
            compact={true}
          />
        </div>
      )}

      {/* Right — 2 buttons with dropdowns */}
      <div className="flex items-center gap-1" ref={dropdownRef}>

        {/* ═══ MESSAGES ═══ */}
        <div className="relative">
          <button onClick={() => toggle("messages")}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: openDropdown === "messages" ? "rgba(0,0,0,0.08)" : "transparent", border: "none", color: "var(--text-muted)" }}
            title="Messages">
            <MessageCircle className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
                style={{ background: "var(--accent)", color: "#fff", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          {openDropdown === "messages" && (
            <MessagesDropdown
              dropdownBox={dropdownBox}
              dropdownStyle={dropdownStyle}
              activeChat={activeChat}
              chatMessages={chatMessages}
              replyText={replyText}
              sending={sending}
              recentMessages={recentMessages}
              clients={clients}
              onSetActiveChat={setActiveChat}
              onSetReplyText={setReplyText}
              onSendReply={sendReply}
              onOpenChat={openChat}
              onClose={() => setOpenDropdown(null)}
              chatEndRef={chatEndRef}
              replyInputRef={replyInputRef}
            />
          )}
        </div>

        {/* ═══ CLIENTS & CODES ═══ */}
        <div className="relative">
          <button onClick={() => toggle("clients")}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: openDropdown === "clients" ? "rgba(0,0,0,0.08)" : "transparent", border: "none", color: "var(--text-muted)" }}
            title="Clients & Codes">
            <Users className="w-[18px] h-[18px]" />
            {(pendingClients.length + pendingOrders.length) > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 animate-pulse"
                style={{ background: "#F59E0B", color: "#000", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>
                {pendingClients.length + pendingOrders.length}
              </span>
            ) : clients.length > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
                style={{ background: "var(--text-muted)", color: "var(--bg)", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>
                {clients.length}
              </span>
            ) : null}
          </button>
          {openDropdown === "clients" && (
            <ClientsDropdown
              dropdownBox={dropdownBox}
              dropdownStyle={dropdownStyle}
              clients={clients}
              codes={codes}
              activeCodes={activeCodes}
              pendingClients={pendingClients}
              pendingOrders={pendingOrders}
              verifyingId={verifyingId}
              processingOrderId={processingOrderId}
              pseudoOf={pseudoOf}
              onVerify={handleVerify}
              onAcceptOrder={handleAcceptOrder}
              onRefuseOrder={handleRefuseOrder}
              onClose={() => setOpenDropdown(null)}
            />
          )}
        </div>

        {/* ═══ SOCIALS (triggered from tab bar) ═══ */}
        {openDropdown === "socials" && (
          <div className="relative">
            <SocialsDropdown
              dropdownBox={dropdownBox}
              dropdownStyle={dropdownStyle}
              platforms={PLATFORMS}
              modelPlatforms={modelInfo?.platforms}
              onSavePlatform={handleSavePlatform}
              onClose={() => setOpenDropdown(null)}
            />
          </div>
        )}

      </div>

      {/* Story Generator Modal — BRIEF-21 nouveau composant complet
          (image bg + flou slider + code accès + canvas 1080x1920 + download PNG) */}
      {showStoryGen && (
        <StoryGeneratorModal
          open={showStoryGen}
          onClose={() => setShowStoryGen(false)}
          modelSlug={currentModel || modelSlug}
          packs={[]}
        />
      )}
    </header>
  );
}
