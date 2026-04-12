"use client";

import { useRef } from "react";
import { X, ArrowLeft, ExternalLink, Send, ArrowRight, Ghost, Instagram } from "lucide-react";

interface MessageItem {
  id: string; client_id: string; content: string; created_at: string;
  sender_type: string; read?: boolean; model?: string;
}
interface ClientItem {
  id: string; pseudo_snap: string | null; pseudo_insta: string | null;
  model: string; tier: string | null; last_active: string | null; created_at: string;
  verified_status?: string | null; lead_source?: string | null;
}

interface MessagesDropdownProps {
  dropdownBox: string;
  dropdownStyle: React.CSSProperties;
  activeChat: { clientId: string; pseudo: string } | null;
  chatMessages: MessageItem[];
  replyText: string;
  sending: boolean;
  recentMessages: MessageItem[];
  clients: ClientItem[];
  onSetActiveChat: (chat: { clientId: string; pseudo: string } | null) => void;
  onSetReplyText: (text: string) => void;
  onSendReply: () => void;
  onOpenChat: (clientId: string, pseudo: string) => void;
  onClose: () => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  replyInputRef: React.RefObject<HTMLInputElement | null>;
}

/* ── Platform avatar helper ── */
function PlatformAvatar({ client, pseudo, size = "md", hasUnread = false }: {
  client?: ClientItem | null; pseudo?: string; size?: "sm" | "md"; hasUnread?: boolean;
}) {
  const isSnap = !!client?.pseudo_snap;
  const isInsta = !isSnap && !!client?.pseudo_insta;
  const s = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  let bg: string;
  let color: string;
  if (isSnap) {
    bg = "rgba(255,252,0,0.12)";
    color = "#FFFC00";
  } else if (isInsta) {
    bg = "rgba(193,53,132,0.12)";
    color = "#C13584";
  } else {
    bg = hasUnread ? "rgba(230,51,41,0.12)" : "rgba(0,0,0,0.06)";
    color = hasUnread ? "var(--accent)" : "var(--text-muted)";
  }

  return (
    <div className={`${s} rounded-full flex items-center justify-center shrink-0`}
      style={{ background: bg, color }}>
      {isSnap ? <Ghost className={iconSize} /> : isInsta ? <Instagram className={iconSize} /> : (
        <span className={size === "sm" ? "text-[9px] font-bold" : "text-[11px] font-bold"}>
          {(pseudo || "?").charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function MessagesDropdown({
  dropdownBox, dropdownStyle,
  activeChat, chatMessages, replyText, sending,
  recentMessages, clients,
  onSetActiveChat, onSetReplyText, onSendReply, onOpenChat, onClose,
  chatEndRef, replyInputRef,
}: MessagesDropdownProps) {
  return (
    <div className={dropdownBox} style={{ ...dropdownStyle, overflow: "hidden" }}>
      {/* ── Active Chat View ── */}
      {activeChat ? (
        <>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <button onClick={() => onSetActiveChat(null)}
              className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer shrink-0"
              style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            {(() => {
              const cl = clients.find(c => c.id === activeChat.clientId);
              return <PlatformAvatar client={cl} pseudo={activeChat.pseudo} size="sm" />;
            })()}
            <span className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>@{activeChat.pseudo}</span>
            {(() => {
              const cl = clients.find(c => c.id === activeChat.clientId);
              if (!cl) return null;
              const isSnap = !!cl.pseudo_snap;
              const profileUrl = isSnap ? `https://snapchat.com/add/${cl.pseudo_snap}` : cl.pseudo_insta ? `https://instagram.com/${cl.pseudo_insta}` : null;
              return profileUrl ? (
                <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 no-underline ml-auto">
                  <ExternalLink className="w-3 h-3" style={{ color: isSnap ? "#C4A600" : "#C13584" }} />
                </a>
              ) : null;
            })()}
            <button onClick={() => { onSetActiveChat(null); onClose(); }}
              className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer shrink-0 ml-auto"
              style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-y-auto px-3 py-3 space-y-2" style={{ maxHeight: "50vh", minHeight: 120 }}>
            {chatMessages.length === 0 && (
              <p className="text-[11px] text-center py-6" style={{ color: "var(--text-muted)" }}>Debut de la conversation</p>
            )}
            {chatMessages.map(m => {
              const chatClient = clients.find(c => c.id === m.client_id);
              return (
                <div key={m.id} className={`flex gap-1.5 ${m.sender_type === "model" ? "justify-end" : "justify-start"}`}>
                  {m.sender_type === "client" && (
                    <PlatformAvatar client={chatClient} pseudo={activeChat.pseudo} size="sm" />
                  )}
                  <div className="max-w-[75%] px-3 py-2 rounded-2xl" style={{
                    background: m.sender_type === "model" ? "var(--accent)" : "var(--bg)",
                    color: m.sender_type === "model" ? "#fff" : "var(--text)",
                    border: m.sender_type === "model" ? "none" : "1px solid var(--border)",
                    borderBottomRightRadius: m.sender_type === "model" ? 4 : 16,
                    borderBottomLeftRadius: m.sender_type === "model" ? 16 : 4,
                  }}>
                    <p className="text-[11px] whitespace-pre-wrap break-words">{m.content}</p>
                    <p className="text-[9px] mt-0.5" style={{ opacity: 0.6 }}>
                      {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderTop: "1px solid var(--border)" }}>
            <input ref={replyInputRef} value={replyText} onChange={e => onSetReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendReply(); } }}
              placeholder="Repondre..."
              className="flex-1 text-xs bg-transparent outline-none px-3 py-2 rounded-xl"
              style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
            <button onClick={onSendReply} disabled={!replyText.trim() || sending}
              className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 shrink-0 disabled:opacity-30"
              style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      ) : (
        <>
          {/* ── Conversations List ── */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Messages</span>
            <button onClick={onClose} className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
              style={{ background: "none", border: "none", color: "var(--text-muted)" }}><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto">
            {(() => {
              const convMap = new Map<string, { clientId: string; pseudo: string; lastMsg: MessageItem; unread: number }>();
              recentMessages.forEach(m => {
                const cid = m.client_id;
                if (!cid) return;
                const existing = convMap.get(cid);
                const isNewer = !existing || new Date(m.created_at).getTime() > new Date(existing.lastMsg.created_at).getTime();
                if (isNewer || !existing) {
                  const cl = clients.find(c => c.id === cid);
                  const pseudo = cl ? (cl.pseudo_snap || cl.pseudo_insta || cid.slice(0, 8)) : cid.slice(0, 10);
                  convMap.set(cid, {
                    clientId: cid,
                    pseudo,
                    lastMsg: m,
                    unread: (existing?.unread || 0) + (!m.read && m.sender_type === "client" ? 1 : 0),
                  });
                } else if (!m.read && m.sender_type === "client") {
                  existing.unread++;
                }
              });
              const conversations = Array.from(convMap.values())
                .sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime());

              if (conversations.length === 0) {
                return <p className="text-[11px] text-center py-8" style={{ color: "var(--text-muted)" }}>Aucun message</p>;
              }

              return conversations.map(conv => {
                const cl = clients.find(c => c.id === conv.clientId);
                return (
                  <button key={conv.clientId} onClick={() => onOpenChat(conv.clientId, conv.pseudo)}
                    className="flex items-start gap-2.5 px-4 py-3 w-full text-left cursor-pointer transition-colors hover:brightness-95"
                    style={{ background: conv.unread > 0 ? "rgba(230,51,41,0.04)" : "transparent", border: "none", borderBlockEnd: "1px solid var(--border)" }}>
                    <PlatformAvatar client={cl} pseudo={conv.pseudo} hasUnread={conv.unread > 0} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold truncate" style={{ color: "var(--text)" }}>@{conv.pseudo}</span>
                        <span className="text-[10px] shrink-0 ml-auto" style={{ color: "var(--text-muted)" }}>
                          {new Date(conv.lastMsg.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-[11px] truncate mt-0.5" style={{ color: conv.unread > 0 ? "var(--text)" : "var(--text-muted)", fontWeight: conv.unread > 0 ? 600 : 400 }}>
                        {conv.lastMsg.sender_type === "model" ? "Vous: " : ""}{conv.lastMsg.content}
                      </p>
                    </div>
                    {conv.unread > 0 && (
                      <span className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shrink-0 mt-1"
                        style={{ background: "var(--accent)", color: "#fff", fontSize: "10px", fontWeight: 700 }}>
                        {conv.unread}
                      </span>
                    )}
                  </button>
                );
              });
            })()}
          </div>
          <a href="/agence/clients" className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold no-underline"
            style={{ color: "var(--accent)", borderTop: "1px solid var(--border)" }}>
            Voir tout <ArrowRight className="w-3 h-3" />
          </a>
        </>
      )}
    </div>
  );
}
