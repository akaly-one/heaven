"use client";

/**
 * FinancesOwnPanel — réglages finances propres au modèle (Paloma/Ruby).
 *
 * Scope : visible uniquement aux comptes model (paloma, ruby).
 * Affiche les finances scope own (/api/finances?model=<slug>) avec synthèse
 * rapide. Pas d'accès aux finances des autres modèles ni à la vue agrégée
 * (qui reste scope admin via /agence/finances).
 */

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { useActiveModelSlug } from "@/lib/use-active-model";
import { toModelId } from "@/lib/model-utils";

interface FinanceData {
  loading: boolean;
  revenueMonth: number;
  revenueTotal: number;
  paymentsCount: number;
  error?: string;
}

interface Props {
  authHeaders: () => HeadersInit;
}

export function FinancesOwnPanel({ authHeaders }: Props) {
  const slug = useActiveModelSlug();
  const [data, setData] = useState<FinanceData>({
    loading: true,
    revenueMonth: 0,
    revenueTotal: 0,
    paymentsCount: 0,
  });

  useEffect(() => {
    if (!slug) {
      setData({ loading: false, revenueMonth: 0, revenueTotal: 0, paymentsCount: 0 });
      return;
    }
    const mid = toModelId(slug);
    fetch(`/api/finances?model=${encodeURIComponent(mid)}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) { setData((p) => ({ ...p, loading: false, error: "Données indisponibles" })); return; }
        const payments = (d.payments || []) as { amount?: number; completed_at?: string; created_at?: string }[];
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        let month = 0, total = 0;
        for (const p of payments) {
          const amount = Number(p.amount || 0);
          total += amount;
          const d = new Date(p.completed_at || p.created_at || 0);
          if (d >= monthStart) month += amount;
        }
        setData({ loading: false, revenueMonth: month, revenueTotal: total, paymentsCount: payments.length });
      })
      .catch(() => setData({ loading: false, revenueMonth: 0, revenueTotal: 0, paymentsCount: 0, error: "Erreur réseau" }));
  }, [slug, authHeaders]);

  return (
    <div
      className="rounded-2xl p-4 md:p-5 space-y-4"
      style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <DollarSign className="w-4 h-4" style={{ color: "#10B981" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Mes finances</h2>
      </div>
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Revenus propres à ton compte. Scope model_id — tu ne vois pas les données des autres modèles.
      </p>

      {data.loading ? (
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>Chargement…</div>
      ) : data.error ? (
        <div className="text-xs" style={{ color: "#F59E0B" }}>{data.error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl p-3" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              <Calendar className="w-3 h-3" /> Ce mois
            </div>
            <div className="text-xl font-bold mt-1" style={{ color: "var(--text)" }}>
              {data.revenueMonth.toFixed(2)} €
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              <TrendingUp className="w-3 h-3" /> Total cumulé
            </div>
            <div className="text-xl font-bold mt-1" style={{ color: "var(--text)" }}>
              {data.revenueTotal.toFixed(2)} €
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              <DollarSign className="w-3 h-3" /> Paiements
            </div>
            <div className="text-xl font-bold mt-1" style={{ color: "var(--text)" }}>
              {data.paymentsCount}
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
        Besoin d'un détail / export ? Contacter Yumi (admin agence) via Messagerie.
      </p>
    </div>
  );
}
