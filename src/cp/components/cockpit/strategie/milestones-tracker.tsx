"use client";

/**
 * MilestonesTracker — Phase 7 Agent 7.A (B6)
 *
 * Composant réutilisable pour afficher la progression d'un modèle
 * vers un milestone BP donné (M3, M6, M9, M12).
 *
 * Cibles hardcodées (alignées BP Heaven §9 + plans/01-strategy/ROADMAP-v1) :
 * - M3 : 500 abonnés free Fanvue + 100 € cumulés
 * - M6 : 2 modèles B actives + 400 €/mois A+B
 * - M9 : 750 €/mois A+B + marge ≥ 150 €
 * - M12 : 1 150 €/mois + 1 cliente C
 *
 * Lit :
 * - /api/clients?model={id}        → total_spent (revenue) + count (abonnés)
 * - /api/models (pour M6/M12)       → nombre profils actifs
 * - /api/finances?model={id}        → revenus mensuels (optionnel, best-effort)
 *
 * Affiche une barre de progression + statut textuel ("En cours", "Atteint",
 * "En retard") selon % progression.
 */

import { useEffect, useMemo, useState } from "react";
import { Target, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { useModel } from "@/lib/model-context";
import { toModelId } from "@/lib/model-utils";

export type MilestoneId = "M3" | "M6" | "M9" | "M12";

/* ─────────────────────────────────────────
   Milestone targets (BP + ROADMAP v1)
   ───────────────────────────────────────── */

interface MilestoneTarget {
  id: MilestoneId;
  label: string;
  description: string;
  subscribersTarget?: number;
  revenueCumulativeTarget?: number;
  monthlyRevenueTarget?: number;
  activeModelsBTarget?: number;
  clientsCTarget?: number;
  marginTarget?: number;
}

const MILESTONE_TARGETS: Record<MilestoneId, MilestoneTarget> = {
  M3: {
    id: "M3",
    label: "M3",
    description: "500 abonnés free Fanvue + 100 € cumulés",
    subscribersTarget: 500,
    revenueCumulativeTarget: 100,
  },
  M6: {
    id: "M6",
    label: "M6",
    description: "2 modèles B actives + 400 €/mois A+B",
    activeModelsBTarget: 2,
    monthlyRevenueTarget: 400,
  },
  M9: {
    id: "M9",
    label: "M9",
    description: "750 €/mois A+B + marge ≥ 150 €",
    monthlyRevenueTarget: 750,
    marginTarget: 150,
  },
  M12: {
    id: "M12",
    label: "M12",
    description: "1 150 €/mois A+B + 1 cliente C",
    monthlyRevenueTarget: 1150,
    clientsCTarget: 1,
  },
};

interface Props {
  modelId?: string; // slug yumi / paloma / ruby, défaut = current
  milestone: MilestoneId;
}

interface LiveData {
  subscribers: number;
  revenueCumulative: number;
  monthlyRevenue: number;
  activeModelsB: number;
  loading: boolean;
}

export function MilestonesTracker({ modelId, milestone }: Props) {
  const { currentModel, authHeaders, models } = useModel();
  const slug = modelId || currentModel || "yumi";
  const target = MILESTONE_TARGETS[milestone];

  const [data, setData] = useState<LiveData>({
    subscribers: 0,
    revenueCumulative: 0,
    monthlyRevenue: 0,
    activeModelsB: 0,
    loading: true,
  });

  useEffect(() => {
    let cancel = false;
    const headers = authHeaders();
    const mid = toModelId(slug);
    const safe = (url: string) =>
      fetch(url, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

    setData((prev) => ({ ...prev, loading: true }));

    Promise.all([
      safe(`/api/clients?model=${mid}`),
      safe(`/api/finances?model=${mid}`),
    ]).then(([clientsRes, financesRes]) => {
      if (cancel) return;
      const clients = clientsRes?.clients || [];
      const subscribers = clients.length;
      const revenueCumulative = clients.reduce(
        (sum: number, c: { total_spent?: number }) =>
          sum + Number(c.total_spent || 0),
        0,
      );
      const payments = financesRes?.payments || [];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRevenue = payments
        .filter((p: { completed_at?: string | null; created_at: string }) => {
          const d = new Date(p.completed_at || p.created_at);
          return d >= monthStart;
        })
        .reduce((s: number, p: { amount: number | string }) => s + Number(p.amount || 0), 0);
      const activeModelsB = models.length; // proxy : tous modèles visibles
      setData({
        subscribers,
        revenueCumulative,
        monthlyRevenue,
        activeModelsB,
        loading: false,
      });
    });

    return () => {
      cancel = true;
    };
  }, [slug, authHeaders, models.length]);

  // Compute progress per KPI, take minimum (weakest link)
  const progression = useMemo(() => {
    const parts: { label: string; current: number; target: number; unit: string; pct: number }[] = [];
    if (target.subscribersTarget !== undefined) {
      parts.push({
        label: "Abonnés",
        current: data.subscribers,
        target: target.subscribersTarget,
        unit: "",
        pct: Math.min((data.subscribers / target.subscribersTarget) * 100, 100),
      });
    }
    if (target.revenueCumulativeTarget !== undefined) {
      parts.push({
        label: "Revenu cumul",
        current: data.revenueCumulative,
        target: target.revenueCumulativeTarget,
        unit: "€",
        pct: Math.min((data.revenueCumulative / target.revenueCumulativeTarget) * 100, 100),
      });
    }
    if (target.monthlyRevenueTarget !== undefined) {
      parts.push({
        label: "Revenu/mois",
        current: data.monthlyRevenue,
        target: target.monthlyRevenueTarget,
        unit: "€",
        pct: Math.min((data.monthlyRevenue / target.monthlyRevenueTarget) * 100, 100),
      });
    }
    if (target.activeModelsBTarget !== undefined) {
      parts.push({
        label: "Modèles B actives",
        current: data.activeModelsB,
        target: target.activeModelsBTarget,
        unit: "",
        pct: Math.min((data.activeModelsB / target.activeModelsBTarget) * 100, 100),
      });
    }
    if (target.clientsCTarget !== undefined) {
      // Placeholder : pas de clientes C actives en base aujourd'hui
      parts.push({
        label: "Clientes C",
        current: 0,
        target: target.clientsCTarget,
        unit: "",
        pct: 0,
      });
    }
    if (target.marginTarget !== undefined) {
      // Proxy : on considère marge = monthlyRevenue * 0.3 (30% part Sqwensy)
      const margin = data.monthlyRevenue * 0.3;
      parts.push({
        label: "Marge",
        current: margin,
        target: target.marginTarget,
        unit: "€",
        pct: Math.min((margin / target.marginTarget) * 100, 100),
      });
    }
    const overallPct = parts.length > 0 ? Math.min(...parts.map((p) => p.pct)) : 0;
    return { parts, overallPct };
  }, [target, data]);

  const status = progression.overallPct >= 100
    ? { label: "Atteint", color: "#22C55E", Icon: CheckCircle2 }
    : progression.overallPct >= 50
      ? { label: "En cours", color: "#D4AF37", Icon: TrendingUp }
      : { label: "Démarrage", color: "#F59E0B", Icon: AlertCircle };

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: "#D4AF37" }} />
          <div>
            <span
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text)" }}
            >
              Milestone {target.label}
            </span>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {target.description}
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: `${status.color}14`, color: status.color }}
        >
          <status.Icon className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase">{status.label}</span>
        </div>
      </div>

      {data.loading ? (
        <div
          className="h-16 rounded-lg animate-pulse"
          style={{ background: "rgba(255,255,255,0.03)" }}
        />
      ) : (
        <div className="space-y-2">
          {progression.parts.map((p) => (
            <div key={p.label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {p.label}
                </span>
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: p.pct >= 100 ? "#22C55E" : "var(--text)" }}
                >
                  {p.current.toLocaleString("fr-FR", {
                    maximumFractionDigits: 0,
                  })}
                  {p.unit} / {p.target.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                  {p.unit}
                </span>
              </div>
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(p.pct, 2)}%`,
                    background:
                      p.pct >= 100
                        ? "linear-gradient(90deg, #22C55E, #16A34A)"
                        : "linear-gradient(90deg, #D4AF37, #B89528)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MilestonesTracker;
