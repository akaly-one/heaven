"use client";

/**
 * DashboardOverview — NB 2026-04-26 (correctif feedback)
 * ───────────────────────────────────────────────────────
 * Remplace HomePanel pour le tab Dashboard /agence.
 *
 * NB rappel directif :
 * - "ta compris que le feed doit plus etre en cp car on la unifier en profil"
 *   → composer + timeline RETIRÉS (déjà dans /m/[slug] admin overlay BRIEF-22+23)
 * - "l'onglet messagerie je te demandé un widget qui resumé les types de clients
 *   et demandé classé par tag"
 *   → widget classification clients par tag inclus ici
 *
 * Composition :
 * 1. KPIs cards grand format (Revenue / Abos / Posts / Rétention / Codes actifs)
 * 2. Widget "Clients par tag" (groupBy clients.tag, counts visibles)
 * 3. BotActivityPanel (récap activité agent IA + conversions)
 *
 * Pas de composer, pas de timeline feed — ces vues sont natives sur le profil
 * admin overlay (Profile-as-Hub pattern).
 */

import { Users, TrendingUp, Activity, Coins, Tag } from "lucide-react";
import { BotActivityPanel } from "./bot-activity-panel";
import type { ClientInfo } from "@/types/heaven";

interface DashboardOverviewProps {
  modelSlug: string;
  revenue: number;
  uniqueClients: number;
  activeCodes: number;
  retentionRate: number;
  postsCount: number;
  clients: ClientInfo[];
}

interface TagBucket {
  tag: string;
  count: number;
  totalSpent: number;
  color: string;
}

const TAG_COLORS: Record<string, string> = {
  vip: "#D4AF37",
  hot: "#EF4444",
  recurring: "#10B981",
  cold: "#64748B",
  custom: "#8B5CF6",
  new: "#3B82F6",
};

const TAG_LABELS: Record<string, string> = {
  vip: "VIP",
  hot: "Hot lead",
  recurring: "Récurrent",
  cold: "À relancer",
  custom: "Custom",
  new: "Nouveau",
  untagged: "Sans tag",
};

function classifyClient(c: ClientInfo): string {
  // NB 2026-04-26 : si client a un tag explicite, on l'utilise.
  // Sinon, classification heuristique sur total_spent + last_active.
  if (c.tag && c.tag.trim()) return c.tag.toLowerCase();
  const spent = c.total_spent || 0;
  if (spent >= 200) return "vip";
  if (spent >= 50) return "recurring";
  if (spent > 0) return "hot";
  return "cold";
}

export function DashboardOverview({
  modelSlug,
  revenue,
  uniqueClients,
  activeCodes,
  retentionRate,
  postsCount,
  clients,
}: DashboardOverviewProps) {
  // ── Aggrégation clients par tag ──
  const tagBuckets: TagBucket[] = (() => {
    const buckets = new Map<string, { count: number; totalSpent: number }>();
    for (const c of clients) {
      const tag = classifyClient(c);
      const existing = buckets.get(tag) || { count: 0, totalSpent: 0 };
      existing.count += 1;
      existing.totalSpent += c.total_spent || 0;
      buckets.set(tag, existing);
    }
    return Array.from(buckets.entries())
      .map(([tag, { count, totalSpent }]) => ({
        tag,
        count,
        totalSpent,
        color: TAG_COLORS[tag] || "#64748B",
      }))
      .sort((a, b) => b.count - a.count);
  })();

  const totalClients = clients.length;

  return (
    <div className="space-y-4 px-3 sm:px-4 md:px-6 pt-3 pb-4">
      {/* ══════ KPIs grand format ══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <KpiCard label="Revenu" value={`${revenue.toFixed(0)}€`} icon={Coins} accent="#D4AF37" />
        <KpiCard label="Clients" value={uniqueClients} icon={Users} accent="#3B82F6" />
        <KpiCard label="Codes actifs" value={activeCodes} icon={Activity} accent="#10B981" />
        <KpiCard label="Posts" value={postsCount} icon={TrendingUp} accent="#8B5CF6" />
        <KpiCard label="Rétention" value={`${retentionRate}%`} icon={TrendingUp} accent="#EF4444" />
      </div>

      {/* ══════ Widget Clients par tag ══════ */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
          <Tag className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span className="text-sm font-bold flex-1" style={{ color: "var(--text)" }}>Clients par tag</span>
          <span className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>{totalClients} total</span>
        </div>
        {tagBuckets.length === 0 ? (
          <div className="py-8 text-center px-4">
            <Tag className="w-7 h-7 mx-auto mb-1.5" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Pas encore de clients</p>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
              Les tags apparaîtront automatiquement dès la 1ère conversion
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {tagBuckets.map((b) => {
              const pct = totalClients > 0 ? Math.round((b.count / totalClients) * 100) : 0;
              return (
                <div key={b.tag} className="px-3 sm:px-4 py-2.5 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: b.color }}>
                        {TAG_LABELS[b.tag] || b.tag}
                      </span>
                      <span className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                        {b.count} ({pct}%) · {b.totalSpent.toFixed(0)}€
                      </span>
                    </div>
                    {/* Bar progress */}
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg2)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: b.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════ Widget Activité Agent IA ══════ */}
      <BotActivityPanel modelSlug={modelSlug} />
    </div>
  );
}

// ── KPI Card sub-component ──
function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  accent: string;
}) {
  return (
    <div className="rounded-xl p-2.5 sm:p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3" style={{ color: accent }} />
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <div className="text-base sm:text-lg font-black tabular-nums truncate" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}
