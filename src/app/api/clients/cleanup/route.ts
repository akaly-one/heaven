import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";
import { requireRoot } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

/**
 * DELETE /api/clients/cleanup
 * Auto-purge unverified clients older than 7 days.
 * Called by cron or manually by root.
 */
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try { await requireRoot(); } catch {
    return NextResponse.json({ error: "Root access required" }, { status: 403, headers: cors });
  }
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    const model = req.nextUrl.searchParams.get("model");
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let q = supabase
      .from("agence_clients")
      .delete()
      .eq("verified_status", "pending")
      .lt("created_at", cutoff);

    if (model) q = q.eq("model", model);

    const { data, error, count } = await q.select("id");

    if (error) {
      // If verified_status column doesn't exist yet, skip gracefully
      if (error.message?.includes("verified_status")) {
        return NextResponse.json({ purged: 0, message: "Migration not applied yet" }, { headers: cors });
      }
      throw error;
    }

    const purged = data?.length || 0;
    console.log(`[Cleanup] Purged ${purged} unverified clients older than 7 days${model ? ` for ${model}` : ""}`);

    return NextResponse.json({ purged, cutoff }, { headers: cors });
  } catch (err) {
    console.error("[API/clients/cleanup] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

/**
 * GET /api/clients/cleanup?model=xxx
 * Preview: count unverified clients that would be purged.
 */
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try { await requireRoot(); } catch {
    return NextResponse.json({ error: "Root access required" }, { status: 403, headers: cors });
  }
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    const model = req.nextUrl.searchParams.get("model");
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let q = supabase
      .from("agence_clients")
      .select("id, pseudo_snap, pseudo_insta, created_at", { count: "exact" })
      .eq("verified_status", "pending")
      .lt("created_at", cutoff);

    if (model) q = q.eq("model", model);

    const { data, count, error } = await q;

    if (error) {
      if (error.message?.includes("verified_status")) {
        return NextResponse.json({ pending_purge: 0, message: "Migration not applied yet" }, { headers: cors });
      }
      throw error;
    }

    return NextResponse.json({ pending_purge: count || 0, clients: data || [], cutoff }, { headers: cors });
  } catch (err) {
    console.error("[API/clients/cleanup] GET error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}
