"use client";

/**
 * KpiStrip — Phase 3 Agent 3.A (B9).
 *
 * 6-card horizontal KPI strip for the `/agence` dashboard.
 * Reads /api/agence/dashboard/kpis and self-refreshes every 60 s.
 *
 * Cards :
 *   1. Revenus (period)        — sum of agence_revenus_modele over 30/7/1j
 *   2. Abonnés (fans actifs)   — unique client_id having bought (placeholder : Fanvue free count when available)
 *   3. Conv. PPV %             — purchases / active fans
 *   4. Panier moyen PPV        — avg price per paid PPV transaction
 *   5. IG followers            — live from Meta Graph (null-safe when offline)
 *   6. IG posts                — media_count
 *
 * Cibles BP (displayed inline under each card when relevant) :
 *   - Abonnés : 80-150 nouveaux/sem pour M6 (rough target, kept static for now)
 *
 * P0-12 / P1-7 : the last-sync badge is exposed via `lastSyncAt` so the parent
 * (home-panel / agence-header) can surface it directly in the header.
 *
 * Responsive : flex-wrap on mobile, single row on md+.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Euro,
  Users,
  TrendingUp,
  ShoppingBag,
  Instagram,
  Image as ImageIcon,
} from "lucide-react";

export interface KpiStripProps {
  modelId: string;
  /** Period in days. Default 30. */
  period?: 1 | 7 | 30;
  /** Called with {last_sync_at} each successful fetch so the shell can surface a sync pill. */
  onSyncUpdate?: (lastSyncAt: string | null) => void;
}

interface KpiPayload {
  model_id: string;
  period_days: number;
  revenus_total: number;
  revenus_count: number;
  fans_actifs: number;
  conv_ppv_pct: number;
  panier_moyen_ppv: number;
  ig_followers: number | null;
  ig_follows: number | null;
  ig_media: number | null;
  ig_username: string | null;
  last_sync_at: string | null;
}

const fmtEur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const fmtNum = new Intl.NumberFormat("fr-FR");

function formatCompactNumber(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return fmtNum.format(n);
}

export function KpiStrip({ modelId, period = 30, onSyncUpdate }: KpiStripProps) {
  const [data, setData] = useState<KpiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKpis = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ model_id: modelId, period: String(period) });
      const res = await fetch(`/api/agence/dashboard/kpis?${qs}`, { cache: "no-store" });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as KpiPayload;
      setData(json);
      setError(null);
      onSyncUpdate?.(json.last_sync_at);
    } catch (err) {
      setError(String(err).slice(0, 80));
    } finally {
      setLoading(false);
    }
  }, [modelId, period, onSyncUpdate]);

  useEffect(() => {
    fetchKpis();
    const poll = setInterval(fetchKpis, 60_000);
    return () => clearInterval(poll);
  }, [fetchKpis]);

  const cards = [
    {
      key: "revenus",
      icon: Euro,
      label: `Revenus ${period}j`,
      value: data ? fmtEur.format(data.revenus_total) : "—",
      hint: data ? `${data.revenus_count} transac` : null,
      color: "#D4AF37",
    },
    {
      key: "fans",
      icon: Users,
      label: "Abonnés actifs",
      value: data ? fmtNum.format(data.fans_actifs) : "—",
      hint: "cible 80-150/sem",
      color: "#22C55E",
    },
    {
      key: "conv",
      icon: TrendingUp,
      label: "Conv. PPV",
      value: data ? `${data.conv_ppv_pct}%` : "—",
      hint: null,
      color: "#38BDF8",
    },
    {
      key: "basket",
      icon: ShoppingBag,
      label: "Panier moyen",
      value: data ? fmtEur.format(data.panier_moyen_ppv) : "—",
      hint: "PPV",
      color: "#A855F7",
    },
    {
      key: "ig_followers",
      icon: Instagram,
      label: "IG followers",
      value: formatCompactNumber(data?.ig_followers ?? null),
      hint: data?.ig_username ? `@${data.ig_username}` : null,
      color: "#E1306C",
    },
    {
      key: "ig_media",
      icon: ImageIcon,
      label: "IG posts",
      value: formatCompactNumber(data?.ig_media ?? null),
      hint: null,
      color: "#F77737",
    },
  ] as const;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px" style={{ background: "rgba(255,255,255,0.04)" }}>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="p-3 md:p-4 flex flex-col gap-1"
              style={{ background: "var(--bg, #0B0B0F)" }}
            >
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: card.color }} />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-white/40">
                  {card.label}
                </span>
              </div>
              <div
                className="text-lg md:text-xl font-black tabular-nums leading-tight"
                style={{ color: loading && !data ? "var(--w25, rgba(255,255,255,0.25))" : card.color }}
              >
                {card.value}
              </div>
              {card.hint && (
                <span className="text-[10px] text-white/25">{card.hint}</span>
              )}
            </div>
          );
        })}
      </div>
      {error && (
        <div className="px-3 py-1.5 text-[10px] text-red-400 border-t border-white/[0.06]">
          KPIs offline — {error}
        </div>
      )}
    </div>
  );
}

export default KpiStrip;
