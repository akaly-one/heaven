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
  const { id, display_name, active, role, scopes } = body as {
    id?: string;
    display_name?: string;
    active?: boolean;
    role?: "root" | "model";
    scopes?: string[];
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

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "rien a mettre a jour" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

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
