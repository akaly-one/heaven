/**
 * BRIEF-10 TICKET-AG10 — POST /api/agence/clients/[id]/validate (admin)
 *
 * Admin valide le handle fourni par le fan (IG/Snap).
 * Conséquences :
 *  - UPDATE agence_clients SET access_level='validated', validated_at=NOW(),
 *    validated_by=<admin_code>, rejected_at=null, rejected_reason=null
 *  - INSERT agence_age_gate_events event_type='validated' (audit)
 *
 * Auth : root ou model (scope sa propre model uniquement).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing client id" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const { data: client, error: clientErr } = await db
    .from("agence_clients")
    .select("id, model, access_level")
    .eq("id", id)
    .maybeSingle();

  if (clientErr || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Scope model role à sa propre model
  if (user.role === "model") {
    const userModelId = toModelId(user.sub);
    if (String(client.model).toLowerCase() !== userModelId.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (client.access_level === "validated") {
    return NextResponse.json({ error: "Already validated" }, { status: 409 });
  }

  const adminCode = String(user.sub || "root");
  const nowIso = new Date().toISOString();

  const { error: updateErr } = await db
    .from("agence_clients")
    .update({
      access_level: "validated",
      validated_at: nowIso,
      validated_by: adminCode,
      rejected_at: null,
      rejected_reason: null,
    })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Audit log
  await db.from("agence_age_gate_events").insert({
    client_id: id,
    event_type: "certified",
    actor: `admin:${adminCode}`,
    reason: "Handle validé par admin",
  });

  return NextResponse.json({
    ok: true,
    client_id: id,
    access_level: "validated",
    validated_by: adminCode,
    validated_at: nowIso,
  });
}
