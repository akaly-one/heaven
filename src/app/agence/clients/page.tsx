"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Search,
  AlertTriangle,
  Clock,
  DollarSign,
  Shield,
  ShieldOff,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Star,
  Send,
  CheckCircle2,
  XCircle,
  Timer,
  Filter,
  Smartphone,
  Camera,
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";

// ── Types & Constants (centralized) ──
import type { AccessCode, ClientInfo, ClientWithSubs } from "@/types/heaven";
import { TIER_COLORS } from "@/constants/tiers";

// ── Helpers ──

function getTimeLeft(expiresAt: string): { text: string; urgent: boolean } {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { text: "Expire", urgent: false };
  const hours = Math.floor(diff / 3600000);
  if (hours < 6) return { text: `${hours}h`, urgent: true };
  if (hours < 24) return { text: `${hours}h`, urgent: true };
  const days = Math.floor(hours / 24);
  if (days <= 2) return { text: `${days}j`, urgent: true };
  return { text: `${days}j`, urgent: false };
}

function getClientStatus(codes: AccessCode[]): "active" | "expiring" | "expired" | "blocked" {
  const now = Date.now();
  const active = codes.filter(c => c.active && !c.revoked && new Date(c.expiresAt).getTime() > now);
  if (active.length === 0) return "expired";
  const soonest = active.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0];
  const hoursLeft = (new Date(soonest.expiresAt).getTime() - now) / 3600000;
  if (hoursLeft <= 24) return "expiring";
  return "active";
}

// ── Component ──

export default function ClientsPage() {
  const { currentModel, authHeaders } = useModel();
  const modelSlug = currentModel || "yumi";

  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expiring" | "expired">("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  // ── Load data ──
  useEffect(() => {
    const headers = authHeaders();
    setLoading(true);
    Promise.all([
      fetch(`/api/codes?model=${modelSlug}`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`/api/clients?model=${modelSlug}`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([c, cl]) => {
      setCodes(c || []);
      setClients(cl || []);
    }).finally(() => setLoading(false));
  }, [modelSlug, authHeaders]);

  // ── Build enriched client list ──
  const enriched: ClientWithSubs[] = useMemo(() => {
    const clientMap = new Map<string, ClientInfo>();
    clients.forEach(c => clientMap.set(c.id, c));

    // Group codes by client name
    const byClient = new Map<string, AccessCode[]>();
    codes.forEach(c => {
      const key = c.client || "inconnu";
      if (!byClient.has(key)) byClient.set(key, []);
      byClient.get(key)!.push(c);
    });

    const result: ClientWithSubs[] = [];
    byClient.forEach((clientCodes, clientName) => {
      const now = Date.now();
      const activeCodes = clientCodes.filter(c => c.active && !c.revoked && new Date(c.expiresAt).getTime() > now);
      const activeCode = activeCodes.sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime())[0] || null;
      const status = getClientStatus(clientCodes);
      const clientInfo = clientMap.get(clientName) || { id: clientName, firstname: clientName };
      const tl = activeCode ? getTimeLeft(activeCode.expiresAt) : { text: "—", urgent: false };

      result.push({
        client: clientInfo,
        codes: clientCodes.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()),
        activeCode,
        status: clientInfo.is_blocked ? "blocked" : status,
        timeLeft: tl.text,
      });
    });

    return result.sort((a, b) => {
      const priority = { expiring: 0, active: 1, blocked: 2, expired: 3 };
      return priority[a.status] - priority[b.status];
    });
  }, [codes, clients]);

  // ── Filtered ──
  const filtered = useMemo(() => {
    return enriched.filter(e => {
      const name = (e.client.firstname || e.client.id || "").toLowerCase();
      const snap = (e.client.pseudo_snap || "").toLowerCase();
      const insta = (e.client.pseudo_insta || "").toLowerCase();
      const q = search.toLowerCase();
      if (q && !name.includes(q) && !snap.includes(q) && !insta.includes(q)) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (tierFilter !== "all") {
        const tier = e.activeCode?.tier || e.codes[0]?.tier || "";
        if (tier !== tierFilter) return false;
      }
      return true;
    });
  }, [enriched, search, statusFilter, tierFilter]);

  // ── KPIs ──
  const kpis = useMemo(() => ({
    total: enriched.length,
    active: enriched.filter(e => e.status === "active").length,
    expiring: enriched.filter(e => e.status === "expiring").length,
    expired: enriched.filter(e => e.status === "expired").length,
    revenue: enriched.reduce((sum, e) => sum + (e.client.total_spent || 0), 0),
  }), [enriched]);

  const STATUS_CONFIG = {
    active: { label: "Actif", color: "var(--success)", icon: CheckCircle2 },
    expiring: { label: "Expire bientot", color: "var(--warning)", icon: Timer },
    expired: { label: "Expire", color: "var(--text-muted)", icon: XCircle },
    blocked: { label: "Bloque", color: "var(--danger)", icon: ShieldOff },
  };

  return (
    <OsLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 fade-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))" }}>
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Clients</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Gestion des abonnements et suivi client</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 fade-up-1">
          {[
            { label: "Total", value: kpis.total, icon: Users, color: "var(--accent)" },
            { label: "Actifs", value: kpis.active, icon: CheckCircle2, color: "var(--success)" },
            { label: "Expirent", value: kpis.expiring, icon: Timer, color: "var(--warning)" },
            { label: "Expires", value: kpis.expired, icon: XCircle, color: "var(--text-muted)" },
            { label: "Revenu total", value: `${kpis.revenue}€`, icon: DollarSign, color: "var(--accent)" },
          ].map((kpi) => (
            <div key={kpi.label} className="card-premium p-3 stat-glow" style={{ "--glow-color": `${kpi.color}15` } as React.CSSProperties}>
              <div className="flex items-center gap-1.5 mb-1">
                <kpi.icon className="w-3 h-3" style={{ color: kpi.color }} />
                <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{kpi.label}</span>
              </div>
              <p className="text-xl font-bold tabular-nums" style={{ color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Expiring alert */}
        {kpis.expiring > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4 fade-up-2" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "var(--warning)" }} />
            <p className="text-xs" style={{ color: "var(--warning)" }}>
              <strong>{kpis.expiring} abonnement{kpis.expiring > 1 ? "s" : ""}</strong> expire{kpis.expiring > 1 ? "nt" : ""} dans moins de 24h — renouvellement necessaire.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 fade-up-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Rechercher par nom, snap, insta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs"
              style={{ background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text)", outline: "none" }}
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5">
            {(["all", "active", "expiring", "expired"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all"
                style={{
                  background: statusFilter === s ? "rgba(230,51,41,0.15)" : "var(--surface)",
                  color: statusFilter === s ? "var(--accent)" : "var(--text-muted)",
                  border: `1px solid ${statusFilter === s ? "rgba(230,51,41,0.3)" : "var(--border2)"}`,
                }}
              >
                {s === "all" ? "Tous" : s === "active" ? "Actifs" : s === "expiring" ? "Expirent" : "Expires"}
              </button>
            ))}
          </div>

          {/* Tier filter */}
          <div className="flex gap-1.5">
            {["all", "vip", "gold", "diamond", "platinum"].map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className="px-2.5 py-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all"
                style={{
                  background: tierFilter === t ? `${TIER_COLORS[t] || "var(--accent)"}20` : "var(--surface)",
                  color: tierFilter === t ? (TIER_COLORS[t] || "var(--accent)") : "var(--text-muted)",
                  border: `1px solid ${tierFilter === t ? `${TIER_COLORS[t] || "var(--accent)"}40` : "var(--border2)"}`,
                }}
              >
                {t === "all" ? "Tous" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Client list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun client trouve</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((e) => {
              const expanded = expandedClient === e.client.id;
              const statusCfg = STATUS_CONFIG[e.status];
              const tierColor = TIER_COLORS[e.activeCode?.tier || e.codes[0]?.tier || ""] || "var(--text-muted)";
              const tl = e.activeCode ? getTimeLeft(e.activeCode.expiresAt) : { text: "—", urgent: false };

              return (
                <div key={e.client.id} className="card-premium overflow-hidden">
                  {/* Row */}
                  <button
                    onClick={() => setExpandedClient(expanded ? null : e.client.id)}
                    className="w-full flex items-center gap-3 p-3 sm:p-4 cursor-pointer text-left"
                    style={{ background: "transparent", border: "none", color: "var(--text)" }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 uppercase"
                      style={{ background: `${tierColor}15`, color: tierColor }}
                    >
                      {(e.client.firstname || e.client.id || "?").slice(0, 2)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold truncate">{e.client.firstname || e.client.id}</span>
                        <span className="badge" style={{ background: `${statusCfg.color}15`, color: statusCfg.color, fontSize: 9 }}>
                          <statusCfg.icon className="w-2.5 h-2.5" />
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {e.client.pseudo_snap && (
                          <span className="flex items-center gap-1">
                            <Smartphone className="w-3 h-3" /> {e.client.pseudo_snap}
                          </span>
                        )}
                        {e.client.pseudo_insta && (
                          <span className="flex items-center gap-1">
                            <Camera className="w-3 h-3" /> {e.client.pseudo_insta}
                          </span>
                        )}
                        <span>
                          {e.codes.length} code{e.codes.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Tier badge */}
                    <div className="hidden sm:flex items-center gap-3">
                      {e.activeCode && (
                        <div className="text-right">
                          <span className="text-xs font-bold capitalize" style={{ color: tierColor }}>
                            {e.activeCode.tier}
                          </span>
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{e.activeCode.platform}</p>
                        </div>
                      )}
                    </div>

                    {/* Time left */}
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold tabular-nums ${tl.urgent ? "" : ""}`} style={{ color: tl.urgent ? "var(--warning)" : "var(--text-secondary)" }}>
                        {tl.text}
                      </p>
                      {e.client.total_spent ? (
                        <p className="text-[10px] tabular-nums" style={{ color: "var(--success)" }}>{e.client.total_spent}€</p>
                      ) : null}
                    </div>

                    {/* Chevron */}
                    <div style={{ color: "var(--text-muted)" }}>
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded */}
                  {expanded && (
                    <div className="px-4 pb-4 animate-fade-in" style={{ borderTop: "1px solid var(--border2)" }}>
                      <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* Client info */}
                        <div className="flex flex-col gap-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Informations client</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: "Tier", value: e.activeCode?.tier || "—", color: tierColor },
                              { label: "Plateforme", value: e.activeCode?.platform || "—" },
                              { label: "Snap", value: e.client.pseudo_snap || "—" },
                              { label: "Insta", value: e.client.pseudo_insta || "—" },
                              { label: "Depense totale", value: `${e.client.total_spent || 0}€` },
                              { label: "Tokens achetes", value: `${e.client.total_tokens_bought || 0}` },
                              { label: "Derniere activite", value: e.client.last_active ? new Date(e.client.last_active).toLocaleDateString("fr-BE") : "—" },
                              { label: "Tag", value: e.client.tag || "—" },
                            ].map((item) => (
                              <div key={item.label} className="p-2 rounded-lg" style={{ background: "var(--bg3)" }}>
                                <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                                <p className="text-xs font-medium capitalize" style={{ color: "color" in item ? item.color : "var(--text)" }}>
                                  {item.value}
                                </p>
                              </div>
                            ))}
                          </div>
                          {e.client.notes && (
                            <div className="p-2 rounded-lg" style={{ background: "var(--bg3)" }}>
                              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Notes</p>
                              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{e.client.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Subscription history */}
                        <div className="flex flex-col gap-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Historique abonnements</p>
                          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto scrollbar-hide">
                            {e.codes.map((code) => {
                              const isActive = code.active && !code.revoked && new Date(code.expiresAt).getTime() > Date.now();
                              const isRevoked = code.revoked;
                              return (
                                <div
                                  key={code.code}
                                  className="flex items-center gap-3 p-2.5 rounded-lg"
                                  style={{
                                    background: isActive ? "rgba(16,185,129,0.06)" : "var(--bg3)",
                                    border: isActive ? "1px solid rgba(16,185,129,0.2)" : "1px solid var(--border2)",
                                  }}
                                >
                                  <div
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{
                                      background: isActive ? "var(--success)" : isRevoked ? "var(--danger)" : "var(--text-muted)",
                                      boxShadow: isActive ? "0 0 6px rgba(16,185,129,0.5)" : "none",
                                    }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-mono font-medium" style={{ color: "var(--text)" }}>{code.code}</span>
                                      <span className="text-[10px] capitalize" style={{ color: TIER_COLORS[code.tier] || "var(--text-muted)" }}>{code.tier}</span>
                                    </div>
                                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                      {code.platform} · {code.type} · {code.duration}h
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-[10px]" style={{ color: isActive ? "var(--success)" : "var(--text-muted)" }}>
                                      {isActive ? getTimeLeft(code.expiresAt).text : isRevoked ? "Revoque" : "Expire"}
                                    </p>
                                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                      {new Date(code.created).toLocaleDateString("fr-BE")}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </OsLayout>
  );
}
