/**
 * BRIEF-10 TICKET-AG11 — GET /api/agence/verification-queue (admin)
 *
 * Liste les fans en attente de validation handle (access_level='pending_upgrade').
 * Tri : created_at ASC (les plus anciens en premier).
 * Scope : root = tous / model = sa propre model uniquement.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  // NB 2026-04-24 — colonnes réelles uniquement (agence_clients n'a pas
  // pseudo / display_name / avatar_url). Pseudo humain résolu côté FE via
  // getConversationPseudo() (src/shared/lib/messaging/conversation-display).
  let q = db
    .from("agence_clients")
    .select(
      "id, model, pseudo_insta, pseudo_snap, nickname, firstname, created_at, age_certified, age_certified_at, access_level"
    )
    .eq("access_level", "pending_upgrade")
    .order("created_at", { ascending: true })
    .limit(200);

  if (user.role === "model") {
    const userSlug = String(user.sub || "").toLowerCase();
    q = q.eq("model", toModelId(userSlug));
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    queue: data || [],
    count: (data || []).length,
  });
}
