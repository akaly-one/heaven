"use client";

import { MessageCircle, Activity, Bot, Clock } from "lucide-react";

export interface IgConversation {
  id: string;
  ig_username: string;
  mode: "agent" | "human";
  last_message_at: string;
  last_message_preview: string;
  unread: boolean;
}

interface StatsBarProps {
  conversations: IgConversation[];
}

export function StatsBar({ conversations }: StatsBarProps) {
  const total = conversations.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeToday = conversations.filter(
    (c) => new Date(c.last_message_at).getTime() >= today.getTime()
  ).length;

  const agentCount = conversations.filter((c) => c.mode === "agent").length;
  const agentPct = total > 0 ? Math.round((agentCount / total) * 100) : 0;

  // Simulated avg response time (placeholder until real metric available)
  const avgResponseMin = total > 0 ? "< 1 min" : "--";

  const stats = [
    {
      icon: MessageCircle,
      value: total,
      label: "Conversations",
      color: "#8B5CF6",
    },
    {
      icon: Activity,
      value: activeToday,
      label: "Actives aujourd'hui",
      color: "#F59E0B",
    },
    {
      icon: Bot,
      value: `${agentPct}%`,
      label: "Mode Agent",
      color: "#818CF8",
    },
    {
      icon: Clock,
      value: avgResponseMin,
      label: "Temps moyen",
      color: "#22C55E",
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
      {stats.map((s, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0"
          style={{
            background: `${s.color}10`,
            border: `1px solid ${s.color}30`,
          }}
        >
          <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: "var(--text)" }}
          >
            {s.value}
          </span>
          <span
            className="text-[10px] whitespace-nowrap"
            style={{ color: "var(--text-muted)" }}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
