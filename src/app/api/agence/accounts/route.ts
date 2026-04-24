// ══════════════════════════════════════════════════════════════════════════
//  /api/agence/accounts — Liste + PATCH role/scopes
//
//  Agent 10.A Phase 10 : gestion unifiee Comptes + Modules + Codes.
//
//  GET   → liste comptes actifs, scope-filtered
//          - admin (role='root' OU model=yumi) : tous les comptes
//          - model (paloma/ruby)               : uniquement son propre compte
//          - query ?with_code=true : si admin, inclut `code` en clair (masque sinon)
//  PATCH → met a jour role / scopes / display_name / active d'un compte (admin)
//
//  Codes jamais loggues en clair. Scope admin enforcement via hasScope('*') OR
//  role='root' OR model_slug='yumi'.
// ══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

const AGENCY_ADMIN_SLUGS = ["yumi"];
const ROOT_MASTER_MARKERS = new Set(["m0", "root"]);

type SessionLike = {
  role?: string;
  sub?: string;
  model_slug?: string | null;
  scopes?: string[];
} | null;

function isAdminSession(user: SessionLike): boolean {
  if (!user) return false;
  if (user.role === "root") return true;
  const slug = String(user.sub || user.model_slug || "").toLowerCase();
  if (user.role === "model" && AGENCY_ADMIN_SLUGS.includes(slug)) return true;
  // scope-based admin (manage_entities or wildcard)
  const scopes = user.scopes ?? [];
  if (scopes.includes("*") || scopes.includes("manage_entities")) return true;
  return false;
}

function authorize(user: SessionLike): { ok: true } | { ok: false; status: number; error: string } {
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true };
}

// Hiérarchie (même logique que reset-code) : Root Master > Yumi > Paloma/Ruby
function isRootMaster(user: SessionLike): boolean {
  if (!user || user.role !== "root") return false;
  const slug = String(user.sub || user.model_slug || "").toLowerCase();
  return slug === "" || slug === "root";
}

type TargetAccount = { model_id?: string | null; model_slug?: string | null; role?: string | null };

function canEditTarget(user: SessionLike, target: TargetAccount): boolean {
  if (!user) return false;
  const targetIsRootMaster =
    ROOT_MASTER_MARKERS.has(String(target.model_id ?? "").toLowerCase()) ||
    ROOT_MASTER_MARKERS.has(String(target.model_slug ?? "").toLowerCase()) ||
    (target.role === "root" && !target.model_slug);
  if (isRootMaster(user)) return true;
  const userSlug = String(user.sub || user.model_slug || "").toLowerCase();
  if (user.role === "root" && AGENCY_ADMIN_SLUGS.includes(userSlug)) return !targetIsRootMaster;
  if (user.role === "model") return userSlug === String(target.model_slug ?? "").toLowerCase();
  return false;
}

// GET /api/agence/accounts?with_code=true
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  const auth = authorize(user);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = isAdminSession(user);
  const withCode = req.nextUrl.searchParams.get("with_code") === "true";

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  // Ordre hiérarchique demandé par NB :
  //   1. Root dev SQWENSY (role=root, model_id=NULL, scopes=["*"])
  //   2. Yumi admin agence (role=root, model_id=m1)
  //   3. Paloma (role=model, model_id=m2)
  //   4. Ruby (role=model, model_id=m3)
  // Mécanisme : role DESC ("root" > "model" alphabétiquement) puis model_id ASC NULLS FIRST
  let q = db
    .from("agence_accounts")
    .select("id, code, role, model_id, model_slug, display_name, active, scopes, activable_modules, created_at, last_login, login_aliases")
    .eq("active", true)
    .order("role", { ascending: false })
    .order("model_id", { ascending: true, nullsFirst: true });

  // Model (non-admin) : uniquement son propre compte
  if (!admin) {
    const slug = String(user?.sub || user?.model_slug || "").toLowerCase();
    if (!slug) return NextResponse.json({ accounts: [] });
    q = q.eq("model_slug", slug);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Masque le code par defaut (sauf admin + with_code=true)
  const accounts = (data || []).map((a) => ({
    ...a,
    code: admin && withCode ? a.code : null, // null = cote client affiche "••••••"
    has_password: !!a.code,                   // Phase 1.3 : ajout marqueur (migration prep vers bcrypt)
  }));

  return NextResponse.json({ accounts, admin });
}

// PATCH /api/agence/accounts — body { id, display_name?, active?, role?, scopes? }
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  const auth = authorize(user);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isAdminSession(user)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, display_name, active, role, scopes, login_aliases, model_id, model_slug } = body as {
    id?: string;
    display_name?: string;
    active?: boolean;
    role?: "root" | "model";
    scopes?: string[];
    login_aliases?: string[];
    model_id?: string | null;
    model_slug?: string | null;
  };

  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (display_name !== undefined) updates.display_name = display_name;
  if (active !== undefined) updates.active = Boolean(active);
  if (role !== undefined) {
    if (!["root", "model"].includes(role)) {
      return NextResponse.json({ error: "role invalide" }, { status: 400 });
    }
    updates.role = role;
  }
  if (scopes !== undefined) {
    if (!Array.isArray(scopes)) {
      return NextResponse.json({ error: "scopes doit etre un tableau" }, { status: 400 });
    }
    updates.scopes = scopes;
  }
  // model_id / model_slug (admin root only — bind un compte à un CP)
  if (model_id !== undefined) {
    if (model_id !== null && !/^m\d+$/.test(model_id)) {
      return NextResponse.json({ error: "model_id format mN invalide" }, { status: 400 });
    }
    updates.model_id = model_id;
  }
  if (model_slug !== undefined) {
    if (model_slug !== null && !/^[a-z0-9_-]{2,32}$/.test(model_slug)) {
      return NextResponse.json({ error: "model_slug format invalide" }, { status: 400 });
    }
    updates.model_slug = model_slug;
  }
  // NB 2026-04-24 : login_aliases = username(s) pour login. Format 4-32 chars alphanum + _ - .
  if (login_aliases !== undefined) {
    if (!Array.isArray(login_aliases)) {
      return NextResponse.json({ error: "login_aliases doit être un tableau" }, { status: 400 });
    }
    const regex = /^[a-zA-Z0-9_\-.]{4,32}$/;
    for (const a of login_aliases) {
      if (typeof a !== "string" || !regex.test(a)) {
        return NextResponse.json({
          error: `login_alias invalide : "${a}" — 4-32 caractères alphanumériques + _ - .`,
        }, { status: 400 });
      }
    }
    updates.login_aliases = login_aliases;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "rien a mettre a jour" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  // Check hiérarchie : fetch target avant update, vérifie permission
  const { data: target, error: tErr } = await db
    .from("agence_accounts")
    .select("id, role, model_id, model_slug")
    .eq("id", id)
    .maybeSingle();
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!target) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  if (!canEditTarget(user, target)) {
    return NextResponse.json({
      error: "Accès refusé : hiérarchie. Seul Root peut modifier ce compte.",
    }, { status: 403 });
  }

  const { data, error } = await db
    .from("agence_accounts")
    .update(updates)
    .eq("id", id)
    .select("id, code, role, model_id, model_slug, display_name, active, scopes, activable_modules")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ne jamais leaker le code en clair dans la reponse PATCH
  return NextResponse.json({ account: { ...data, code: null } });
}
