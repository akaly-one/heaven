"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle, XCircle,
  Zap, Database, Globe, Layout, Shield, ArrowRight, ExternalLink,
  Code, Users, MessageSquare, Camera, DollarSign, Settings, FileText,
  Upload, Lock, Send, Trash2, Edit,
  Copy, Pause
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";

// ═══════════════════════════════════════════════
// ARCHITECTURE MAP — Heaven Studio
// ═══════════════════════════════════════════════

type Status = "ok" | "dead" | "redundant" | "warning";

interface Node {
  id: string;
  label: string;
  type: "page" | "api" | "component" | "db" | "external" | "storage" | "action";
  status: Status;
  note?: string;
  children?: Node[];
  connections?: { target: string; label: string; status: Status }[];
  buttons?: { label: string; action: string; status: Status; note?: string }[];
}

const ARCHITECTURE: Node[] = [
  // ─── PAGES ───
  {
    id: "login", label: "/login", type: "page", status: "ok",
    note: "Codes admin Phase 0 (yumi, ruby, paloma)",
    buttons: [
      { label: "Entrer", action: "sessionStorage.setItem → router.push(/agence)", status: "ok" },
    ],
    connections: [
      { target: "session-heaven_auth", label: "write session", status: "ok" },
    ],
  },
  {
    id: "root-page", label: "/ (root)", type: "page", status: "redundant",
    note: "Redirige vers /agence — page inutile, pourrait etre supprimee",
    connections: [
      { target: "cockpit", label: "redirect", status: "redundant" },
    ],
  },
  {
    id: "cockpit", label: "/agence (Cockpit)", type: "page", status: "ok",
    note: "Dashboard principal — codes, clients, stats",
    buttons: [
      { label: "View Profile", action: "href → /m/{slug}", status: "ok" },
      { label: "Edit Profile", action: "href → /m/{slug}?edit=true", status: "ok" },
      { label: "FAB Generate", action: "open GenerateModal", status: "ok" },
      { label: "Copy code", action: "clipboard.writeText", status: "ok" },
      { label: "Pause code", action: "PUT /api/codes action=pause", status: "ok" },
      { label: "Reactivate", action: "PUT /api/codes action=reactivate", status: "ok" },
      { label: "Revoke code", action: "PUT /api/codes action=revoke", status: "ok" },
      { label: "Delete code", action: "DELETE /api/codes", status: "ok" },
    ],
    connections: [
      { target: "api-codes", label: "GET codes", status: "ok" },
      { target: "api-clients", label: "GET clients", status: "ok" },
      { target: "api-packs", label: "GET packs", status: "ok" },
      { target: "api-models", label: "GET model info", status: "ok" },
      { target: "session-heaven_auth", label: "read session", status: "ok" },
    ],
  },
  {
    id: "clients-page", label: "/agence/clients", type: "page", status: "dead",
    note: "REDIRECT vers /agence — page morte, a supprimer du routeur",
    connections: [
      { target: "cockpit", label: "redirect (redundant)", status: "dead" },
    ],
  },
  {
    id: "messages", label: "/agence/messages", type: "page", status: "warning",
    note: "Tab Avis utilise localStorage au lieu de Supabase — donnees volatiles",
    buttons: [
      { label: "Send message", action: "POST /api/messages", status: "ok" },
      { label: "Delete message", action: "DELETE /api/messages", status: "ok" },
      { label: "Approve review", action: "localStorage update", status: "warning", note: "Reviews en localStorage — se perdent si cache vide" },
      { label: "Reject review", action: "localStorage update", status: "warning", note: "Meme probleme localStorage" },
    ],
    connections: [
      { target: "api-messages", label: "GET/POST/DELETE messages", status: "ok" },
      { target: "api-clients", label: "GET clients", status: "ok" },
      { target: "ls-reviews", label: "read/write reviews", status: "warning" },
    ],
  },
  {
    id: "cms", label: "/agence/cms", type: "page", status: "warning",
    note: "Donnees 100% localStorage — pas syncees avec Supabase. Auth gate custom (redundante avec AuthGuard)",
    buttons: [
      { label: "Generate code", action: "localStorage code gen", status: "redundant", note: "DOUBLON — /agence a deja generation de codes via API" },
      { label: "Copy code", action: "clipboard", status: "ok" },
      { label: "Delete code", action: "localStorage remove", status: "warning", note: "Codes CMS != codes API — deux systemes paralleles" },
      { label: "Add collaborator", action: "localStorage add", status: "warning", note: "Pas lie a agence_accounts" },
      { label: "Modifier page", action: "not implemented", status: "dead", note: "Bouton present mais aucune action" },
      { label: "Preview client", action: "not implemented", status: "dead", note: "Bouton present mais aucune action" },
    ],
    connections: [
      { target: "ls-cms-codes", label: "read/write CMS codes", status: "warning" },
      { target: "ls-cms-pages", label: "read/write CMS pages", status: "warning" },
      { target: "ls-cms-collabs", label: "read/write collabs", status: "warning" },
    ],
  },
  {
    id: "finances", label: "/agence/finances", type: "page", status: "ok",
    note: "Stats revenue calcules depuis clients.total_spent",
    connections: [
      { target: "api-clients", label: "GET clients", status: "ok" },
    ],
  },
  {
    id: "settings", label: "/agence/settings", type: "page", status: "ok",
    note: "Security alerts + accounts management",
    buttons: [
      { label: "Add account", action: "POST /api/accounts", status: "ok" },
      { label: "Toggle active", action: "PUT /api/accounts", status: "ok" },
      { label: "Delete account", action: "DELETE /api/accounts (cascade)", status: "ok" },
      { label: "Warn client", action: "POST /api/messages (warning)", status: "ok" },
      { label: "Revoke client", action: "PUT /api/clients is_blocked", status: "ok" },
    ],
    connections: [
      { target: "api-accounts", label: "CRUD accounts", status: "ok" },
      { target: "api-security", label: "GET alerts", status: "ok" },
      { target: "api-messages", label: "POST warning", status: "ok" },
    ],
  },
  {
    id: "model-profile", label: "/m/[slug] (Profil public)", type: "page", status: "ok",
    note: "Page publique client — 1700+ lignes, tres complexe",
    buttons: [
      { label: "Post wall", action: "POST /api/wall", status: "ok" },
      { label: "Like post", action: "PUT /api/posts action=like", status: "ok" },
      { label: "Comment", action: "PUT /api/posts action=comment", status: "ok" },
      { label: "Buy pack", action: "unlocks tier content", status: "ok" },
      { label: "Topup credits", action: "POST /api/credits/topup", status: "ok" },
      { label: "Buy media", action: "POST /api/credits/purchase", status: "ok" },
      { label: "Send chat", action: "POST /api/messages", status: "ok" },
      { label: "Save profile (edit)", action: "PUT /api/models/[slug]", status: "ok" },
      { label: "Save packs (edit)", action: "POST /api/packs", status: "ok" },
      { label: "Upload media (edit)", action: "POST /api/upload → Cloudinary", status: "ok" },
      { label: "Delete media (edit)", action: "DELETE /api/upload", status: "ok" },
    ],
    connections: [
      { target: "api-wall", label: "GET/POST wall", status: "ok" },
      { target: "api-posts", label: "GET/PUT posts", status: "ok" },
      { target: "api-packs", label: "GET packs", status: "ok" },
      { target: "api-uploads", label: "GET/POST/PUT/DELETE uploads", status: "ok" },
      { target: "api-messages", label: "GET/POST messages", status: "ok" },
      { target: "api-clients", label: "POST register client", status: "ok" },
      { target: "api-credits-balance", label: "GET balance", status: "ok" },
      { target: "api-credits-purchase", label: "POST purchase", status: "ok" },
      { target: "api-credits-topup", label: "POST topup", status: "ok" },
      { target: "api-models", label: "GET/PUT model", status: "ok" },
      { target: "api-codes", label: "POST validate code", status: "ok" },
      { target: "api-cloudinary", label: "POST/DELETE media", status: "ok" },
      { target: "api-security", label: "POST screenshot alert", status: "ok" },
    ],
  },

  // ─── API ROUTES ───
  { id: "api-codes", label: "API /api/codes", type: "api", status: "ok", note: "CRUD codes — Supabase agence_codes",
    connections: [{ target: "db-codes", label: "agence_codes", status: "ok" }, { target: "db-clients", label: "auto-link client", status: "ok" }] },
  { id: "api-clients", label: "API /api/clients", type: "api", status: "ok", note: "CRUD clients — agence_clients",
    connections: [{ target: "db-clients", label: "agence_clients", status: "ok" }] },
  { id: "api-clients-id", label: "API /api/clients/[id]", type: "api", status: "ok", note: "Detail client + messages + codes",
    connections: [{ target: "db-clients", label: "agence_clients", status: "ok" }, { target: "db-messages", label: "agence_messages", status: "ok" }, { target: "db-codes", label: "agence_codes", status: "ok" }] },
  { id: "api-messages", label: "API /api/messages", type: "api", status: "ok", note: "Messages model↔client",
    connections: [{ target: "db-messages", label: "agence_messages", status: "ok" }] },
  { id: "api-accounts", label: "API /api/accounts", type: "api", status: "warning", note: "CRUD accounts — AUCUNE auth check (Phase 0). N'importe qui peut creer/supprimer des comptes.",
    connections: [{ target: "db-accounts", label: "agence_accounts", status: "ok" }, { target: "db-codes", label: "cascade delete", status: "ok" }] },
  { id: "api-packs", label: "API /api/packs", type: "api", status: "ok", note: "Config packs par model",
    connections: [{ target: "db-packs", label: "agence_packs", status: "ok" }] },
  { id: "api-posts", label: "API /api/posts", type: "api", status: "ok", note: "Posts gallery + likes/comments",
    connections: [{ target: "db-posts", label: "agence_posts", status: "ok" }] },
  { id: "api-wall", label: "API /api/wall", type: "api", status: "ok", note: "Wall public — XSS sanitized",
    connections: [{ target: "db-wall", label: "agence_wall_posts", status: "ok" }] },
  { id: "api-models", label: "API /api/models/[slug]", type: "api", status: "ok", note: "Profil model GET/PUT",
    connections: [{ target: "db-models", label: "agence_models", status: "ok" }, { target: "db-accounts", label: "agence_accounts", status: "ok" }] },
  { id: "api-uploads", label: "API /api/uploads", type: "api", status: "ok", note: "Media metadata Supabase",
    connections: [{ target: "db-uploads", label: "agence_uploads", status: "ok" }] },
  { id: "api-cloudinary", label: "API /api/upload", type: "api", status: "ok", note: "Upload/delete fichiers Cloudinary",
    connections: [{ target: "ext-cloudinary", label: "Cloudinary CDN", status: "ok" }] },
  { id: "api-credits-balance", label: "API /api/credits/balance", type: "api", status: "ok",
    connections: [{ target: "db-clients", label: "tokens_bought - tokens_spent", status: "ok" }] },
  { id: "api-credits-purchase", label: "API /api/credits/purchase", type: "api", status: "ok",
    connections: [{ target: "db-clients", label: "debit credits", status: "ok" }, { target: "db-purchases", label: "agence_purchases", status: "ok" }] },
  { id: "api-credits-topup", label: "API /api/credits/topup", type: "api", status: "ok",
    connections: [{ target: "db-clients", label: "add credits", status: "ok" }, { target: "db-purchases", label: "log transaction", status: "ok" }] },
  { id: "api-security", label: "API /api/security/screenshot-alert", type: "api", status: "ok",
    connections: [{ target: "db-security", label: "agence_security_alerts", status: "ok" }, { target: "db-clients", label: "screenshot_count++", status: "ok" }, { target: "db-messages", label: "auto-warn message", status: "ok" }] },

  // ─── DATABASE ───
  { id: "db-accounts", label: "agence_accounts", type: "db", status: "ok" },
  { id: "db-codes", label: "agence_codes", type: "db", status: "ok", note: "FK: client_id → agence_clients" },
  { id: "db-clients", label: "agence_clients", type: "db", status: "ok" },
  { id: "db-messages", label: "agence_messages", type: "db", status: "ok", note: "FK: client_id → agence_clients" },
  { id: "db-packs", label: "agence_packs", type: "db", status: "ok" },
  { id: "db-posts", label: "agence_posts", type: "db", status: "ok" },
  { id: "db-wall", label: "agence_wall_posts", type: "db", status: "ok" },
  { id: "db-models", label: "agence_models", type: "db", status: "ok" },
  { id: "db-uploads", label: "agence_uploads", type: "db", status: "ok" },
  { id: "db-security", label: "agence_security_alerts", type: "db", status: "ok", note: "FK: client_id → agence_clients" },
  { id: "db-purchases", label: "agence_purchases", type: "db", status: "ok", note: "FK: client_id, upload_id" },

  // ─── STORAGE ───
  { id: "session-heaven_auth", label: "sessionStorage: heaven_auth", type: "storage", status: "ok" },
  { id: "ls-reviews", label: "localStorage: reviews", type: "storage", status: "warning", note: "Volatil — pas en DB" },
  { id: "ls-cms-codes", label: "localStorage: cms_codes", type: "storage", status: "warning", note: "DOUBLON avec agence_codes en DB" },
  { id: "ls-cms-pages", label: "localStorage: cms_pages", type: "storage", status: "warning", note: "Pas en DB" },
  { id: "ls-cms-collabs", label: "localStorage: cms_collabs", type: "storage", status: "warning", note: "DOUBLON potentiel avec agence_accounts" },

  // ─── EXTERNAL ───
  { id: "ext-cloudinary", label: "Cloudinary CDN", type: "external", status: "ok" },
  { id: "ext-supabase", label: "Supabase (PostgreSQL)", type: "external", status: "ok" },
  { id: "ext-vercel", label: "Vercel (Hosting)", type: "external", status: "ok" },
];

// ─── ISSUES DETECTEES ───
interface Issue {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  affected: string[];
  fix: string;
}

const ISSUES: Issue[] = [
  {
    severity: "critical", title: "API sans auth (Phase 0)",
    detail: "Toutes les API sont accessibles sans authentification. N'importe qui peut CRUD les comptes, messages, codes.",
    affected: ["api-accounts", "api-codes", "api-clients", "api-messages", "api-posts", "api-uploads"],
    fix: "Phase 1: Reimplementer auth middleware (Supabase Auth ou middleware Next.js)",
  },
  {
    severity: "warning", title: "CMS doublon systeme codes",
    detail: "Le CMS genere ses propres codes en localStorage, independants de /api/codes (Supabase). Deux systemes paralleles.",
    affected: ["cms", "ls-cms-codes", "api-codes"],
    fix: "Supprimer la generation de codes du CMS ou la connecter a /api/codes",
  },
  {
    severity: "warning", title: "Reviews en localStorage",
    detail: "Les avis clients sont stockes en localStorage — se perdent si le cache est vide. Pas synces entre devices/navigateurs.",
    affected: ["messages", "ls-reviews"],
    fix: "Creer table agence_reviews en Supabase",
  },
  {
    severity: "warning", title: "CMS 100% localStorage",
    detail: "Pages, codes et collaborateurs du CMS existent uniquement en localStorage. Pas de persistance serveur.",
    affected: ["cms", "ls-cms-codes", "ls-cms-pages", "ls-cms-collabs"],
    fix: "Migrer vers Supabase ou supprimer le CMS si non utilise",
  },
  {
    severity: "info", title: "Page /agence/clients morte",
    detail: "Ne fait que rediriger vers /agence. Fichier peut etre supprime.",
    affected: ["clients-page"],
    fix: "Supprimer src/app/agence/clients/page.tsx",
  },
  {
    severity: "info", title: "Page / (root) redondante",
    detail: "Redirige simplement vers /agence. Pas necessaire.",
    affected: ["root-page"],
    fix: "Supprimer ou garder comme landing page future",
  },
  {
    severity: "warning", title: "Boutons CMS non implementes",
    detail: "'Modifier' et 'Preview client' dans le CMS n'ont aucune action.",
    affected: ["cms"],
    fix: "Implementer ou supprimer les boutons morts",
  },
  {
    severity: "info", title: "Collaborateurs CMS vs Accounts",
    detail: "Les collaborateurs CMS (localStorage) et agence_accounts (Supabase) sont deux systemes separes pour gerer des users.",
    affected: ["cms", "ls-cms-collabs", "api-accounts"],
    fix: "Unifier: utiliser uniquement agence_accounts pour la gestion des acces",
  },
];

// ─── UI ───

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
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  warning: "#F97316",
  info: "#3B82F6",
};

function NodeCard({ node, depth = 0 }: { node: Node; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  const Icon = TYPE_ICONS[node.type] || Zap;
  const StatusIcon = STATUS_ICONS[node.status];
  const hasDetails = (node.buttons && node.buttons.length > 0) || (node.connections && node.connections.length > 0) || node.note;

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
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
        <span className="text-xs font-mono font-semibold flex-1" style={{ color: "var(--text)" }}>{node.label}</span>
        <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: STATUS_COLORS[node.status] }} />
        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded"
          style={{ background: `${STATUS_COLORS[node.status]}22`, color: STATUS_COLORS[node.status] }}>
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
                <div key={i} className="flex items-center gap-2 px-2 py-1 rounded text-[11px]"
                  style={{ background: `${STATUS_COLORS[btn.status]}08`, borderLeft: `2px solid ${STATUS_COLORS[btn.status]}` }}>
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

export default function ArchitecturePage() {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [section, setSection] = useState<"map" | "issues" | "circuit">("map");

  const pages = ARCHITECTURE.filter(n => n.type === "page");
  const apis = ARCHITECTURE.filter(n => n.type === "api");
  const dbs = ARCHITECTURE.filter(n => n.type === "db");
  const stores = ARCHITECTURE.filter(n => n.type === "storage");
  const externals = ARCHITECTURE.filter(n => n.type === "external");

  const filtered = (nodes: Node[]) =>
    filter === "all" ? nodes : nodes.filter(n =>
      n.status === filter ||
      n.buttons?.some(b => b.status === filter) ||
      n.connections?.some(c => c.status === filter)
    );

  const counts = {
    ok: ARCHITECTURE.filter(n => n.status === "ok").length,
    warning: ARCHITECTURE.filter(n => n.status === "warning").length,
    dead: ARCHITECTURE.filter(n => n.status === "dead").length,
    redundant: ARCHITECTURE.filter(n => n.status === "redundant").length,
  };

  const totalButtons = ARCHITECTURE.reduce((sum, n) => sum + (n.buttons?.length || 0), 0);
  const totalConnections = ARCHITECTURE.reduce((sum, n) => sum + (n.connections?.length || 0), 0);
  const deadButtons = ARCHITECTURE.reduce((sum, n) => sum + (n.buttons?.filter(b => b.status === "dead").length || 0), 0);
  const warnButtons = ARCHITECTURE.reduce((sum, n) => sum + (n.buttons?.filter(b => b.status === "warning" || b.status === "redundant").length || 0), 0);

  return (
    <OsLayout cpId="agence">
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--bg)" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))" }}>
              <Zap className="w-5 h-5" style={{ color: "#fff" }} />
            </div>
            <div>
              <h1 className="text-xl font-black" style={{ color: "var(--text)" }}>Architecture Map</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Heaven Studio — Circuit complet backend + frontend</p>
            </div>
          </div>

          {/* Summary stats */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { label: "Nodes", value: ARCHITECTURE.length, color: "#7C3AED" },
              { label: "Boutons", value: totalButtons, color: "#10B981" },
              { label: "Connexions", value: totalConnections, color: "#3B82F6" },
              { label: "OK", value: counts.ok, color: STATUS_COLORS.ok },
              { label: "Warnings", value: counts.warning, color: STATUS_COLORS.warning },
              { label: "Morts", value: counts.dead, color: STATUS_COLORS.dead },
              { label: "Redondants", value: counts.redundant, color: STATUS_COLORS.redundant },
              { label: "Boutons morts", value: deadButtons, color: "#EF4444" },
              { label: "Boutons warns", value: warnButtons, color: "#F97316" },
            ].map((s, i) => (
              <div key={i} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}25` }}>
                {s.value} {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: "var(--bg2)" }}>
          {(["map", "issues", "circuit"] as const).map(tab => (
            <button key={tab} onClick={() => setSection(tab)}
              className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: section === tab ? "rgba(230,51,41,0.15)" : "transparent",
                color: section === tab ? "var(--accent)" : "var(--text-muted)",
              }}>
              {tab === "map" ? "Map Complete" : tab === "issues" ? `Issues (${ISSUES.length})` : "Circuit Flow"}
            </button>
          ))}
        </div>

        {/* Filter */}
        {section === "map" && (
          <div className="flex gap-1 mb-4">
            {(["all", "ok", "warning", "dead", "redundant"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                style={{
                  background: filter === f ? `${f === "all" ? "#7C3AED" : STATUS_COLORS[f]}22` : "rgba(255,255,255,0.03)",
                  color: filter === f ? (f === "all" ? "#7C3AED" : STATUS_COLORS[f]) : "var(--text-muted)",
                }}>
                {f === "all" ? "Tout" : f.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Map View */}
        {section === "map" && (
          <div className="space-y-6">
            {[
              { title: "Pages", icon: Layout, nodes: filtered(pages), color: TYPE_COLORS.page },
              { title: "API Routes", icon: Code, nodes: filtered(apis), color: TYPE_COLORS.api },
              { title: "Database Tables", icon: Database, nodes: filtered(dbs), color: TYPE_COLORS.db },
              { title: "Client Storage", icon: Lock, nodes: filtered(stores), color: TYPE_COLORS.storage },
              { title: "External Services", icon: Globe, nodes: filtered(externals), color: TYPE_COLORS.external },
            ].map((group) => (
              <div key={group.title}>
                <div className="flex items-center gap-2 mb-2">
                  <group.icon className="w-4 h-4" style={{ color: group.color }} />
                  <h2 className="text-sm font-bold" style={{ color: group.color }}>
                    {group.title} ({group.nodes.length})
                  </h2>
                </div>
                <div className="space-y-0.5">
                  {group.nodes.map(node => <NodeCard key={node.id} node={node} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Issues View */}
        {section === "issues" && (
          <div className="space-y-3">
            {ISSUES.map((issue, i) => (
              <div key={i} className="rounded-xl p-4" style={{
                background: `${SEVERITY_COLORS[issue.severity]}08`,
                border: `1px solid ${SEVERITY_COLORS[issue.severity]}25`,
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: SEVERITY_COLORS[issue.severity] }} />
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded"
                    style={{ background: `${SEVERITY_COLORS[issue.severity]}22`, color: SEVERITY_COLORS[issue.severity] }}>
                    {issue.severity}
                  </span>
                  <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{issue.title}</span>
                </div>
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{issue.detail}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {issue.affected.map(a => (
                    <span key={a} className="text-[10px] font-mono px-2 py-0.5 rounded"
                      style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}>
                      {a}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" style={{ color: "#10B981" }} />
                  <span className="text-xs font-medium" style={{ color: "#10B981" }}>{issue.fix}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Circuit View */}
        {section === "circuit" && (
          <div className="space-y-6">
            {/* Login → Cockpit flow */}
            <div className="rounded-xl p-4" style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: "#7C3AED" }}>Circuit 1: Login → Cockpit</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[
                  { label: "/login", type: "page" },
                  { label: "→ sessionStorage", type: "storage" },
                  { label: "→ AuthGuard", type: "component" },
                  { label: "→ ModelProvider", type: "component" },
                  { label: "→ /agence", type: "page" },
                  { label: "→ GET /api/codes", type: "api" },
                  { label: "→ agence_codes", type: "db" },
                ].map((step, i) => (
                  <span key={i} className="px-2 py-1 rounded font-mono"
                    style={{ background: `${TYPE_COLORS[step.type] || "#666"}15`, color: TYPE_COLORS[step.type] || "var(--text)" }}>
                    {step.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Code generation flow */}
            <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: "#10B981" }}>Circuit 2: Generation → Livraison code</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[
                  { label: "FAB button", type: "page" },
                  { label: "→ GenerateModal", type: "component" },
                  { label: "→ POST /api/codes", type: "api" },
                  { label: "→ agence_codes", type: "db" },
                  { label: "→ auto-link client", type: "db" },
                  { label: "→ agence_clients", type: "db" },
                  { label: "→ Copy link", type: "action" },
                  { label: "→ Snap/Insta DM", type: "external" },
                ].map((step, i) => (
                  <span key={i} className="px-2 py-1 rounded font-mono"
                    style={{ background: `${TYPE_COLORS[step.type] || "#666"}15`, color: TYPE_COLORS[step.type] || "var(--text)" }}>
                    {step.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Client access flow */}
            <div className="rounded-xl p-4" style={{ background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.15)" }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: "#F43F5E" }}>Circuit 3: Client → Profil model</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[
                  { label: "/m/slug?access=CODE", type: "page" },
                  { label: "→ POST /api/codes validate", type: "api" },
                  { label: "→ agence_codes", type: "db" },
                  { label: "→ unlock tier", type: "action" },
                  { label: "→ Gallery filtree", type: "page" },
                  { label: "→ GET /api/uploads", type: "api" },
                  { label: "→ agence_uploads", type: "db" },
                ].map((step, i) => (
                  <span key={i} className="px-2 py-1 rounded font-mono"
                    style={{ background: `${TYPE_COLORS[step.type] || "#666"}15`, color: TYPE_COLORS[step.type] || "var(--text)" }}>
                    {step.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Credits flow */}
            <div className="rounded-xl p-4" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: "#F59E0B" }}>Circuit 4: Credits (achat media)</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[
                  { label: "Client click Buy", type: "page" },
                  { label: "→ GET /api/credits/balance", type: "api" },
                  { label: "→ agence_clients", type: "db" },
                  { label: "→ if low: POST topup", type: "api" },
                  { label: "→ POST /api/credits/purchase", type: "api" },
                  { label: "→ agence_purchases", type: "db" },
                  { label: "→ debit client", type: "db" },
                  { label: "→ unlock media", type: "action" },
                ].map((step, i) => (
                  <span key={i} className="px-2 py-1 rounded font-mono"
                    style={{ background: `${TYPE_COLORS[step.type] || "#666"}15`, color: TYPE_COLORS[step.type] || "var(--text)" }}>
                    {step.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Screenshot detection flow */}
            <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: "#EF4444" }}>Circuit 5: Screenshot detection</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[
                  { label: "Client screenshot", type: "action" },
                  { label: "→ useScreenshotDetection", type: "component" },
                  { label: "→ blur + overlay", type: "page" },
                  { label: "→ POST /api/security", type: "api" },
                  { label: "→ agence_security_alerts", type: "db" },
                  { label: "→ screenshot_count++", type: "db" },
                  { label: "→ if ≥2: auto-warn msg", type: "api" },
                  { label: "→ Settings alerts", type: "page" },
                ].map((step, i) => (
                  <span key={i} className="px-2 py-1 rounded font-mono"
                    style={{ background: `${TYPE_COLORS[step.type] || "#666"}15`, color: TYPE_COLORS[step.type] || "var(--text)" }}>
                    {step.label}
                  </span>
                ))}
              </div>
            </div>

            {/* CMS isolated circuit */}
            <div className="rounded-xl p-4" style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.25)" }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: "#F97316" }} />
                <span style={{ color: "#F97316" }}>Circuit 6: CMS (ISOLE — pas connecte au backend)</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[
                  { label: "/agence/cms", type: "page" },
                  { label: "→ localStorage codes", type: "storage" },
                  { label: "✗ PAS agence_codes", type: "db" },
                  { label: "→ localStorage pages", type: "storage" },
                  { label: "✗ PAS en DB", type: "db" },
                  { label: "→ localStorage collabs", type: "storage" },
                  { label: "✗ PAS agence_accounts", type: "db" },
                ].map((step, i) => (
                  <span key={i} className="px-2 py-1 rounded font-mono"
                    style={{
                      background: step.label.startsWith("✗") ? "rgba(239,68,68,0.1)" : `${TYPE_COLORS[step.type] || "#666"}15`,
                      color: step.label.startsWith("✗") ? "#EF4444" : (TYPE_COLORS[step.type] || "var(--text)"),
                    }}>
                    {step.label}
                  </span>
                ))}
              </div>
              <p className="text-[11px] mt-2" style={{ color: "#F97316" }}>
                Le CMS est un circuit ferme. Ses donnees ne sont pas connectees au reste du systeme.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 text-center" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-[10px] tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
            Heaven Studio Architecture &middot; Generated 2026-03-22
          </p>
        </div>
      </div>
    </div>
    </OsLayout>
  );
}
