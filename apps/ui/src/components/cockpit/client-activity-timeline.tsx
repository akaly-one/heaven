"use client";

import { Newspaper, MessageCircle, KeyRound, ShoppingBag } from "lucide-react";
import type { AccessCode, WallPost } from "@/types/heaven";
import { TIER_COLORS } from "@/constants/tiers";

interface Message {
  id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

interface Purchase {
  id: string;
  upload_id: string;
  price: number;
  created_at: string;
}

interface ClientActivityTimelineProps {
  wallPosts: WallPost[];
  messages: Message[];
  codes: AccessCode[];
  purchases: Purchase[];
}

type TimelineItem = {
  id: string;
  type: "wall_post" | "message" | "code_event" | "purchase";
  date: string;
  content: string;
  meta?: string;
  color: string;
};

const TYPE_CONFIG = {
  wall_post: { icon: Newspaper, label: "Wall", color: "#6366F1" },
  message: { icon: MessageCircle, label: "Message", color: "#E1306C" },
  code_event: { icon: KeyRound, label: "Code", color: "#D4A017" },
  purchase: { icon: ShoppingBag, label: "Achat", color: "#16A34A" },
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "A l'instant";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}j`;
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function ClientActivityTimeline({ wallPosts, messages, codes, purchases }: ClientActivityTimelineProps) {
  // Build unified timeline
  const items: TimelineItem[] = [
    ...wallPosts.map(p => ({
      id: `wall-${p.id}`,
      type: "wall_post" as const,
      date: p.created_at,
      content: p.content || "(photo)",
      color: TYPE_CONFIG.wall_post.color,
    })),
    ...messages.map(m => ({
      id: `msg-${m.id}`,
      type: "message" as const,
      date: m.created_at,
      content: m.content,
      meta: m.sender_type === "client" ? "envoye" : "recu",
      color: TYPE_CONFIG.message.color,
    })),
    ...codes.map(c => ({
      id: `code-${c.code}`,
      type: "code_event" as const,
      date: c.created,
      content: `${c.code} — ${c.tier}`,
      meta: c.active && !c.revoked ? "actif" : c.revoked ? "revoque" : "expire",
      color: TIER_COLORS[c.tier] || TYPE_CONFIG.code_event.color,
    })),
    ...purchases.map(p => ({
      id: `purch-${p.id}`,
      type: "purchase" as const,
      date: p.created_at,
      content: `-${p.price} credits`,
      color: TYPE_CONFIG.purchase.color,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (items.length === 0) {
    return (
      <p className="text-[11px] py-4 text-center" style={{ color: "var(--text-muted)" }}>
        Aucune activite enregistree
      </p>
    );
  }

  return (
    <div className="relative pl-6 space-y-0.5 max-h-72 overflow-y-auto scrollbar-hide">
      {/* Vertical line */}
      <div className="absolute left-[9px] top-2 bottom-2 w-px" style={{ background: "var(--border2)" }} />

      {items.slice(0, 30).map(item => {
        const cfg = TYPE_CONFIG[item.type];
        const Icon = cfg.icon;
        return (
          <div key={item.id} className="relative flex items-start gap-3 py-1.5">
            {/* Dot */}
            <div className="absolute left-[-15px] top-2.5 w-[7px] h-[7px] rounded-full z-10"
              style={{ background: item.color, boxShadow: `0 0 4px ${item.color}40` }} />
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Icon className="w-3 h-3 shrink-0" style={{ color: item.color }} />
                <span className="text-[10px] font-semibold uppercase" style={{ color: item.color }}>{cfg.label}</span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(item.date)}</span>
                {item.meta && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${item.color}10`, color: item.color }}>{item.meta}</span>
                )}
              </div>
              <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>{item.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
