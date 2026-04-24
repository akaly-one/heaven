/**
 * BRIEF-10 TICKET-AG06 — POST /api/agence/clients/[id]/age-gate/revoke (admin)
 *
 * Admin révoque la certification majorité d'un fan (suspicion fraude, photo
 * mineure, langage révélateur, etc.). Conséquences :
 *  - UPDATE agence_clients SET age_certified=false, age_certified_at=null,
 *    access_level='anonymous' (sauf si déjà 'rejected')
 *  - INSERT agence_age_gate_events event_type='revoked' (audit, reason requis)
 *
 * Body : { reason?: string } — optionnel mais recommandé.
 * Auth : root uniquement (décision lourde).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";

interface RevokeBody {
  reason?: string;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user || user.role !== "root") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing client id" }, { status: 400 });
  }

  const body: RevokeBody = await req.json().catch(() => ({}));
  const reason =
    typeof body.reason === "string" && body.reason.trim() !== ""
      ? body.reason.trim().slice(0, 500)
      : null;

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const { data: client, error: clientErr } = await db
    .from("agence_clients")
    .select("id, age_certified, access_level")
    .eq("id", id)
    .maybeSingle();

  if (clientErr || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const adminCode = String(user.sub || "root");
  const newLevel =
    client.access_level === "rejected" ? "rejected" : "anonymous";

  const { error: updateErr } = await db
    .from("agence_clients")
    .update({
      age_certified: false,
      age_certified_at: null,
      age_certified_ip_hash: null,
      access_level: newLevel,
    })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await db.from("agence_age_gate_events").insert({
    client_id: id,
    event_type: "revoked",
    actor: `admin:${adminCode}`,
    reason,
  });

  return NextResponse.json({
    ok: true,
    client_id: id,
    age_certified: false,
    access_level: newLevel,
  });
}
