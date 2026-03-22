"use client";

import { Key, Users, DollarSign, Clock, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: typeof Key;
  color: string;
  trend?: { value: string; positive: boolean };
}

function StatCard({ label, value, icon: Icon, color, trend }: StatCardProps) {
  return (
    <div
      className="stat-glow card-premium p-4 min-w-[140px] flex-shrink-0"
      style={{ "--glow-color": `${color}10` } as React.CSSProperties}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            {trend.positive ? (
              <TrendingUp className="w-3 h-3" style={{ color: "var(--success)" }} />
            ) : (
              <TrendingDown className="w-3 h-3" style={{ color: "var(--danger)" }} />
            )}
            <span className="text-[10px] font-semibold" style={{ color: trend.positive ? "var(--success)" : "var(--danger)" }}>
              {trend.value}
            </span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold tabular-nums fade-up" style={{ color: "var(--text)" }}>{value}</p>
      <p className="text-[11px] font-medium mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

interface StatCardsProps {
  activeCodes: number;
  totalCodes: number;
  revenue: number;
  pendingCount: number;
}

export function StatCards({ activeCodes, totalCodes, revenue, pendingCount }: StatCardsProps) {
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4">
      <StatCard
        label="Codes actifs"
        value={activeCodes}
        icon={Key}
        color="#C9A84C"
        trend={totalCodes > 0 ? { value: `${totalCodes} total`, positive: true } : undefined}
      />
      <StatCard
        label="Abonnés"
        value={activeCodes}
        icon={Users}
        color="#F43F5E"
      />
      <StatCard
        label="Revenue"
        value={`${revenue}€`}
        icon={DollarSign}
        color="#10B981"
      />
      <StatCard
        label="En attente"
        value={pendingCount}
        icon={Clock}
        color="#F59E0B"
      />
    </div>
  );
}
