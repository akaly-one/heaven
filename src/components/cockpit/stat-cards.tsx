"use client";

import { Key, Users, DollarSign, Clock } from "lucide-react";

interface StatCardsProps {
  activeCodes: number;
  totalCodes: number;
  revenue: number;
  pendingCount: number;
  uniqueClients?: number;
}

export function StatCards({ activeCodes, totalCodes, revenue, pendingCount, uniqueClients }: StatCardsProps) {
  const stats = [
    { icon: Key, value: activeCodes, label: "Actifs", sub: `/${totalCodes}`, color: "#C9A84C" },
    { icon: Users, value: uniqueClients ?? 0, label: "Clients", color: "#F43F5E" },
    { icon: DollarSign, value: `${revenue}€`, label: "Revenue", color: "#10B981" },
    { icon: Clock, value: pendingCount, label: "Attente", color: "#F59E0B" },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
      {stats.map((s, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0"
          style={{ background: `${s.color}08`, border: `1px solid ${s.color}15` }}>
          <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
          <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text)" }}>
            {s.value}
            {s.sub && <span className="text-[10px] font-normal" style={{ color: "var(--text-muted)" }}>{s.sub}</span>}
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}
