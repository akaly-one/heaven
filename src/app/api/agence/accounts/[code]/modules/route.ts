// ══════════════════════════════════════════════════════════════════════════
//  /api/agence/accounts/[code]/modules — toggle modules per-compte
//
//  Agent 10.A Phase 10 : activation/desactivation des 5 modules cockpit :
//  agent_dm, finance, ops, strategie, dmca.
//
//  PATCH body : { module: 'agent_dm'|'finance'|'ops'|'strategie'|'dmca', enabled: boolean }
//  Admin only (role='root' OR model=yumi OR scope manage_entities/*).
//  Met a jour activable_modules.{module}.enabled + .activated_at + .activated_by.
// ══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

const AGENCY_ADMIN_SLUGS = ["yumi"];
const VALID_MODULES = ["agent_dm", "finance", "ops", "strategie", "dmca"] as const;
type ModuleKey = typeof VALID_MODULES[number];

type SessionLike = {
  role?: string;
  sub?: string;
  model_slug?: string | null;
  display_name?: string;
  scopes?: string[];
} | null;

function isAdminSession(user: SessionLike): boolean {
  if (!user) return false;
  if (user.role === "root") return true;
  const slug = String(user.sub || user.model_slug || "").toLowerCase();
  if (user.role === "model" && AGENCY_ADMIN_SLUGS.includes(slug)) return true;
  const scopes = user.scopes ?? [];
  if (scopes.includes("*") || scopes.includes("manage_entities")) return true;
  return false;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminSession(user)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { code } = await ctx.params;
  if (!code) return NextResponse.json({ error: "code requis" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { module: moduleKey, enabled } = body as { module?: string; enabled?: boolean };

  if (!moduleKey || !VALID_MODULES.includes(moduleKey as ModuleKey)) {
    return NextResponse.json(
      { error: `module invalide. Attendu: ${VALID_MODULES.join(", ")}` },
      { status: 400 },
    );
  }
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled doit etre un boolean" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  // Fetch current activable_modules (jsonb)
  const { data: current, error: fetchErr } = await db
    .from("agence_accounts")
    .select("id, code, activable_modules")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

  const existing = (current.activable_modules ?? {}) as Record<string, unknown>;
  const activatedBy = String(user?.display_name || user?.sub || "admin").slice(0, 80);
  const nextModule: Record<string, unknown> = {
    enabled,
    activated_at: enabled ? new Date().toISOString() : null,
    activated_by: enabled ? activatedBy : null,
  };
  const nextModules = { ...existing, [moduleKey]: nextModule };

  const { data: updated, error: updErr } = await db
    .from("agence_accounts")
    .update({ activable_modules: nextModules })
    .eq("id", current.id)
    .select("id, code, activable_modules")
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Ne pas logger le code en clair
  return NextResponse.json({
    success: true,
    account_id: updated.id,
    module: moduleKey,
    enabled,
    activable_modules: updated.activable_modules,
  });
}
