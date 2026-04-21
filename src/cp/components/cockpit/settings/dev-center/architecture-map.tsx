"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle, XCircle,
  Zap, Database, Globe, Layout, ArrowRight, Code, Lock,
} from "lucide-react";

// ═══════════════════════════════════════════════
// ARCHITECTURE MAP — Heaven (déplacé depuis /agence/architecture)
// P1-6 cleanup : /agence/clients → redirect vers /agence/messagerie?view=contacts
// ═══════════════════════════════════════════════

type Status = "ok" | "dead" | "redundant" | "warning";

interface Node {
  id: string;
  label: string;
  type: "page" | "api" | "component" | "db" | "external" | "storage" | "action";
  status: Status;
  note?: string;
  connections?: { target: string; label: string; status: Status }[];
  buttons?: { label: string; action: string; status: Status; note?: string }[];
}

// ─── Cleaned architecture (P1-6) ───
// - /agence/clients : status "redundant" (plus "dead") — redirect vers /agence/messagerie?view=contacts
// - /agence/architecture : retiré de la top-level (cette map vit désormais dans Settings > Dev Center)
const ARCHITECTURE: Node[] = [
  {
    id: "login", label: "/login", type: "page", status: "ok",
    note: "JWT session + scopes granulaires (yumi admin, paloma/ruby own scope)",
    buttons: [{ label: "Entrer", action: "POST /api/auth/login → JWT", status: "ok" }],
    connections: [{ target: "session-heaven_auth", label: "write session", status: "ok" }],
  },
  {
    id: "cockpit", label: "/agence (Dashboard)", type: "page", status: "ok",
    note: "Dashboard principal — renommé depuis Cockpit (brief B9)",
    connections: [
      { target: "api-codes", label: "GET codes", status: "ok" },
      { target: "api-clients", label: "GET fans/contacts", status: "ok" },
      { target: "api-models", label: "GET model info", status: "ok" },
    ],
  },
  {
    id: "messagerie", label: "/agence/messagerie", type: "page", status: "ok",
    note: "Inbox unifiée web + Snap + Insta + Fanvue (brief B7)",
    connections: [
      { target: "api-messaging-inbox", label: "GET inbox", status: "ok" },
      { target: "api-messaging-contact", label: "GET/PATCH contacts", status: "ok" },
    ],
  },
  {
    id: "clients-redirect", label: "/agence/clients", type: "page", status: "redundant",
    note: "Redirect vers /agence/messagerie?view=contacts (brief B7 — fusion)",
    connections: [{ target: "messagerie", label: "redirect", status: "redundant" }],
  },
  {
    id: "settings", label: "/agence/settings", type: "page", status: "ok",
    note: "3 tabs consolidés : Général / Comptes / Dev Center (briefs B1 + B2)",
    buttons: [
      { label: "Update profile", action: "PUT /api/models/[slug]", status: "ok" },
      { label: "Toggle module", action: "PUT /api/accounts modules", status: "ok" },
      { label: "Reset code", action: "PUT /api/accounts code", status: "ok" },
    ],
    connections: [
      { target: "api-accounts", label: "CRUD accounts", status: "ok" },
      { target: "api-models", label: "GET/PUT model", status: "ok" },
    ],
  },
  {
    id: "finances", label: "/agence/finances", type: "page", status: "ok",
    connections: [{ target: "api-clients", label: "GET purchases", status: "ok" }],
  },
  {
    id: "ops", label: "/agence/ops", type: "page", status: "ok",
    note: "Ops metrics + health checks",
    connections: [{ target: "api-ops", label: "GET metrics", status: "ok" }],
  },
  {
    id: "model-profile", label: "/m/[slug] (Profil public)", type: "page", status: "ok",
    note: "Page publique — skeleton commun yumi/paloma/ruby (brief B4)",
    connections: [
      { target: "api-wall", label: "GET/POST wall", status: "ok" },
      { target: "api-packs", label: "GET packs", status: "ok" },
      { target: "api-messages", label: "GET/POST messages", status: "ok" },
      { target: "api-credits-purchase", label: "POST purchase", status: "ok" },
    ],
  },

  // ─── API ROUTES ───
  { id: "api-auth", label: "API /api/auth/login", type: "api", status: "ok", note: "JWT + scopes" },
  { id: "api-codes", label: "API /api/codes", type: "api", status: "ok",
    connections: [{ target: "db-codes", label: "agence_codes", status: "ok" }] },
  { id: "api-clients", label: "API /api/clients", type: "api", status: "ok",
    connections: [{ target: "db-clients", label: "agence_clients", status: "ok" }] },
  { id: "api-accounts", label: "API /api/accounts", type: "api", status: "ok",
    note: "requireRoot() auth check (Phase 1 livré)",
    connections: [{ target: "db-accounts", label: "agence_accounts", status: "ok" }] },
  { id: "api-models", label: "API /api/models/[slug]", type: "api", status: "ok",
    connections: [{ target: "db-models", label: "agence_models", status: "ok" }] },
  { id: "api-packs", label: "API /api/packs", type: "api", status: "ok",
    connections: [{ target: "db-packs", label: "agence_packs", status: "ok" }] },
  { id: "api-wall", label: "API /api/wall", type: "api", status: "ok",
    connections: [{ target: "db-wall", label: "agence_wall_posts", status: "ok" }] },
  { id: "api-messaging-inbox", label: "API /api/agence/messaging/inbox", type: "api", status: "ok",
    connections: [{ target: "db-messages", label: "agence_messages", status: "ok" }] },
  { id: "api-messaging-contact", label: "API /api/agence/messaging/contact", type: "api", status: "ok",
    connections: [{ target: "db-clients", label: "fusion contacts", status: "ok" }] },
  { id: "api-messages", label: "API /api/messages", type: "api", status: "ok",
    connections: [{ target: "db-messages", label: "agence_messages", status: "ok" }] },
  { id: "api-credits-purchase", label: "API /api/credits/purchase", type: "api", status: "ok",
    connections: [{ target: "db-purchases", label: "agence_purchases", status: "ok" }] },
  { id: "api-ops", label: "API /api/agence/ops", type: "api", status: "ok" },

  // ─── DATABASE ───
  { id: "db-accounts", label: "agence_accounts", type: "db", status: "ok" },
  { id: "db-codes", label: "agence_codes", type: "db", status: "ok" },
  { id: "db-clients", label: "agence_clients", type: "db", status: "ok" },
  { id: "db-messages", label: "agence_messages", type: "db", status: "ok" },
  { id: "db-packs", label: "agence_packs", type: "db", status: "ok" },
  { id: "db-wall", label: "agence_wall_posts", type: "db", status: "ok" },
  { id: "db-models", label: "agence_models", type: "db", status: "ok" },
  { id: "db-purchases", label: "agence_purchases", type: "db", status: "ok" },

  // ─── STORAGE ───
  { id: "session-heaven_auth", label: "sessionStorage: heaven_auth", type: "storage", status: "ok" },

  // ─── EXTERNAL ───
  { id: "ext-cloudinary", label: "Cloudinary CDN", type: "external", status: "ok" },
  { id: "ext-supabase", label: "Supabase (PostgreSQL)", type: "external", status: "ok" },
  { id: "ext-vercel", label: "Vercel (Hosting)", type: "external", status: "ok" },
];

// ─── ISSUES (P1-6 refs morts nettoyées) ───
interface Issue {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  affected: string[];
  fix: string;
}

const ISSUES: Issue[] = [
  {
    severity: "info",
    title: "Navigation consolidée (briefs B1 + B2)",
    detail: "Settings = 3 tabs (Général / Comptes / Dev Center). Packs et Codes standalone supprimés.",
    affected: ["settings"],
    fix: "✅ Livré Phase 2 Agent 2.C",
  },
  {
    severity: "info",
    title: "/agence/clients → redirect",
    detail: "Page morte transformée en redirect vers /agence/messagerie?view=contacts (brief B7).",
    affected: ["clients-redirect", "messagerie"],
    fix: "✅ Agent 4.B (Phase 4) finalise le merge UX",
  },
  {
    severity: "info",
    title: "/agence/architecture retiré de la top-level",
    detail: "Map déplacée dans Settings > Dev Center > Architecture (brief B1). Ancien chemin redirect.",
    affected: [],
    fix: "✅ Livré Phase 2 Agent 2.C",
  },
];

// ─── UI Styling ───

const STATUS_COLORS: Record<Status, string> = {
  ok: "#10B981",
  dead: "#EF4444",
  redundant: "#F59E0B",
  warning: "#F97316",
};

const STATUS_ICONS: Record<Status, typeof CheckCircle> = {
  ok: CheckCircle,
  dead: XCircle,
  redundant: AlertTriangle,
  warning: AlertTriangle,
};

const TYPE_ICONS: Record<string, typeof Zap> = {
  page: Layout,
  api: Code,
  component: Zap,
  db: Database,
  external: Globe,
  storage: Lock,
  action: ArrowRight,
};

const TYPE_COLORS: Record<string, string> = {
  page: "#7C3AED",
  api: "#10B981",
  db: "#3B82F6",
  external: "#8B5CF6",
  storage: "#F59E0B",
  action: "#EC4899",
  component: "#EC4899",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  warning: "#F97316",
  info: "#3B82F6",
};

function NodeCard({ node }: { node: Node }) {
  const [open, setOpen] = useState(false);
  const Icon = TYPE_ICONS[node.type] || Zap;
  const StatusIcon = STATUS_ICONS[node.status];
  const hasDetails = (node.buttons && node.buttons.length > 0) || (node.connections && node.connections.length > 0) || !!node.note;

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all hover:opacity-90"
        style={{
          background: `${TYPE_COLORS[node.type] || "#666"}11`,
          border: `1px solid ${STATUS_COLORS[node.status]}33`,
          marginBottom: 4,
        }}
        onClick={() => setOpen(!open)}
      >
        {hasDetails ? (
          open ? <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-muted)" }} /> :
            <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        ) : <div className="w-3" />}
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: TYPE_COLORS[node.type] }} />
        <span className="text-xs font-mono font-semibold flex-1 truncate" style={{ color: "var(--text)" }}>{node.label}</span>
        <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: STATUS_COLORS[node.status] }} />
        <span
          className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded"
          style={{ background: `${STATUS_COLORS[node.status]}22`, color: STATUS_COLORS[node.status] }}
        >
          {node.status}
        </span>
      </div>

      {open && hasDetails && (
        <div className="ml-6 mb-2 space-y-1">
          {node.note && (
            <p className="text-[11px] px-2 py-1 rounded" style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.02)" }}>
              {node.note}
            </p>
          )}
          {node.buttons && node.buttons.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold px-2" style={{ color: "var(--text-muted)" }}>Boutons</span>
              {node.buttons.map((btn, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1 rounded text-[11px]"
                  style={{ background: `${STATUS_COLORS[btn.status]}08`, borderLeft: `2px solid ${STATUS_COLORS[btn.status]}` }}
                >
                  <span style={{ color: "var(--text)" }}>{btn.label}</span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{btn.action}</span>
                  {btn.note && <span className="text-[10px] ml-auto" style={{ color: STATUS_COLORS[btn.status] }}>{btn.note}</span>}
                </div>
              ))}
            </div>
          )}
          {node.connections && node.connections.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold px-2" style={{ color: "var(--text-muted)" }}>Connexions</span>
              {node.connections.map((conn, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1 text-[11px]">
                  <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: STATUS_COLORS[conn.status] }} />
                  <span style={{ color: "var(--text-muted)" }}>{conn.label}</span>
                  <span className="font-mono text-[10px]" style={{ color: TYPE_COLORS.api }}>{conn.target}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ArchitectureMap() {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [section, setSection] = useState<"map" | "issues">("map");

  const pages = ARCHITECTURE.filter((n) => n.type === "page");
  const apis = ARCHITECTURE.filter((n) => n.type === "api");
  const dbs = ARCHITECTURE.filter((n) => n.type === "db");
  const stores = ARCHITECTURE.filter((n) => n.type === "storage");
  const externals = ARCHITECTURE.filter((n) => n.type === "external");

  const filtered = (nodes: Node[]) =>
    filter === "all" ? nodes : nodes.filter((n) =>
      n.status === filter ||
      n.buttons?.some((b) => b.status === filter) ||
      n.connections?.some((c) => c.status === filter)
    );

  const counts = {
    ok: ARCHITECTURE.filter((n) => n.status === "ok").length,
    warning: ARCHITECTURE.filter((n) => n.status === "warning").length,
    dead: ARCHITECTURE.filter((n) => n.status === "dead").length,
    redundant: ARCHITECTURE.filter((n) => n.status === "redundant").length,
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="card-premium p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Architecture Heaven</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Nodes", value: ARCHITECTURE.length, color: "#7C3AED" },
            { label: "OK", value: counts.ok, color: STATUS_COLORS.ok },
            { label: "Warnings", value: counts.warning, color: STATUS_COLORS.warning },
            { label: "Morts", value: counts.dead, color: STATUS_COLORS.dead },
            { label: "Redondants", value: counts.redundant, color: STATUS_COLORS.redundant },
          ].map((s, i) => (
            <div
              key={i}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
              style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}25` }}
            >
              {s.value} {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      <div className="segmented-control">
        <button onClick={() => setSection("map")} className={section === "map" ? "active" : ""}>
          <Layout className="w-3.5 h-3.5 inline mr-1.5" /> Map
        </button>
        <button onClick={() => setSection("issues")} className={section === "issues" ? "active" : ""}>
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" /> Issues ({ISSUES.length})
        </button>
      </div>

      {/* Filter */}
      {section === "map" && (
        <div className="flex gap-1 flex-wrap">
          {(["all", "ok", "warning", "dead", "redundant"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
              style={{
                background: filter === f ? `${f === "all" ? "#7C3AED" : STATUS_COLORS[f]}22` : "rgba(255,255,255,0.03)",
                color: filter === f ? (f === "all" ? "#7C3AED" : STATUS_COLORS[f]) : "var(--text-muted)",
              }}
            >
              {f === "all" ? "Tout" : f.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Map */}
      {section === "map" && (
        <div className="space-y-5">
          {[
            { title: "Pages", icon: Layout, nodes: filtered(pages), color: TYPE_COLORS.page },
            { title: "API Routes", icon: Code, nodes: filtered(apis), color: TYPE_COLORS.api },
            { title: "Database", icon: Database, nodes: filtered(dbs), color: TYPE_COLORS.db },
            { title: "Storage", icon: Lock, nodes: filtered(stores), color: TYPE_COLORS.storage },
            { title: "External", icon: Globe, nodes: filtered(externals), color: TYPE_COLORS.external },
          ].map((group) => (
            <div key={group.title}>
              <div className="flex items-center gap-2 mb-2">
                <group.icon className="w-4 h-4" style={{ color: group.color }} />
                <h4 className="text-sm font-bold" style={{ color: group.color }}>
                  {group.title} ({group.nodes.length})
                </h4>
              </div>
              <div className="space-y-0.5">
                {group.nodes.map((node) => <NodeCard key={node.id} node={node} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issues */}
      {section === "issues" && (
        <div className="space-y-3">
          {ISSUES.map((issue, i) => (
            <div
              key={i}
              className="rounded-xl p-4"
              style={{
                background: `${SEVERITY_COLORS[issue.severity]}08`,
                border: `1px solid ${SEVERITY_COLORS[issue.severity]}25`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" style={{ color: SEVERITY_COLORS[issue.severity] }} />
                <span
                  className="text-[10px] uppercase font-bold px-2 py-0.5 rounded"
                  style={{ background: `${SEVERITY_COLORS[issue.severity]}22`, color: SEVERITY_COLORS[issue.severity] }}
                >
                  {issue.severity}
                </span>
                <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{issue.title}</span>
              </div>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{issue.detail}</p>
              {issue.affected.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {issue.affected.map((a) => (
                    <span
                      key={a}
                      className="text-[10px] font-mono px-2 py-0.5 rounded"
                      style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3" style={{ color: "#10B981" }} />
                <span className="text-xs font-medium" style={{ color: "#10B981" }}>{issue.fix}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
