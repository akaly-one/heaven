// ══════════════════════════════════════════════════════════════════════════
//  supabase-rls.ts — Server-side RLS context helpers
//
//  Heaven uses a custom JWT (jose-signed), NOT Supabase Auth.
//  Scoped RLS policies (introduced in migration 032) read per-session GUCs
//  set via the set_session_context() RPC.
//
//  Usage (inside an API route that does scoped reads/writes) :
//
//    import { getServerSupabase } from "@/lib/supabase-server";
//    import { withRLS } from "@/lib/supabase-rls";
//
//    const supabase = getServerSupabase();
//    if (!supabase) return NextResponse.json({ error: "DB" }, { status: 502 });
//
//    const { data } = await withRLS(supabase, { model_slug: "yumi", role_tier: "root" }, () =>
//      supabase.from("agence_clients").select("*").eq("model", "m2")
//    );
//
//  Service-role key bypasses RLS anyway, but calling withRLS makes the session
//  intent explicit and enables future enforcement without code changes.
// ══════════════════════════════════════════════════════════════════════════

import type { SupabaseClient } from "@supabase/supabase-js";

export type RoleTier = "root" | "model" | "anon";

export interface RLSContext {
  /** Model slug the caller acts on (yumi / paloma / ruby). */
  model_slug: string;
  /** Role tier : root (agency master) or model (own scope). */
  role_tier: RoleTier;
}

/**
 * Inject Postgres session GUCs before running a scoped query.
 * Safe to call repeatedly ; GUCs are local to the session.
 */
export async function applyRLS(
  supabase: SupabaseClient,
  ctx: RLSContext,
): Promise<void> {
  const { error } = await supabase.rpc("set_session_context", {
    p_model_slug: ctx.model_slug,
    p_role_tier: ctx.role_tier,
  });
  if (error) {
    console.warn("[supabase-rls] set_session_context failed :", error.message);
  }
}

/**
 * Wrap an async callback : applyRLS first, then run fn.
 * Returns whatever fn returns.
 */
export async function withRLS<T>(
  supabase: SupabaseClient,
  ctx: RLSContext,
  fn: () => Promise<T>,
): Promise<T> {
  await applyRLS(supabase, ctx);
  return fn();
}

/**
 * Resolve an RLS context from an existing AuthUser (getAuthUser result).
 * Falls back to anonymous context if nothing useful is found.
 */
export function rlsFromUser(user: {
  role?: string;
  sub?: string;
  slug?: string;
} | null): RLSContext {
  if (!user) return { model_slug: "", role_tier: "anon" };
  const role_tier: RoleTier = user.role === "root" ? "root" : user.role === "model" ? "model" : "anon";
  const model_slug = user.slug || user.sub || "";
  return { model_slug, role_tier };
}
