/**
 * BRIEF-10 TICKET-AG10 — POST /api/agence/clients/[id]/reject (admin)
 *
 * Admin rejette le handle fourni par le fan (pseudo non conforme, fake, etc).
 * Conséquences :
 *  - UPDATE agence_clients SET access_level='rejected', rejected_at=NOW(),
 *    rejected_reason=<raison>
 *  - INSERT agence_age_gate_events event_type='rejected' (audit)
 *
 * Body : { reason: string } — obligatoire.
 * Auth : root ou model (scope sa propre model uniquement).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

interface RejectBody {
  reason?: string;
}

export async function POST(
  req: NextRequest,
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

  const body: RejectBody = await req.json().catch(() => ({}));
  const reason =
    typeof body.reason === "string" && body.reason.trim() !== ""
      ? body.reason.trim().slice(0, 500)
      : null;

  if (!reason) {
    return NextResponse.json(
      { error: "reason required (string, non-empty)" },
      { status: 400 }
    );
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

  if (user.role === "model") {
    const userModelId = toModelId(user.sub);
    if (String(client.model).toLowerCase() !== userModelId.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const adminCode = String(user.sub || "root");
  const nowIso = new Date().toISOString();

  const { error: updateErr } = await db
    .from("agence_clients")
    .update({
      access_level: "rejected",
      rejected_at: nowIso,
      rejected_reason: reason,
      validated_at: null,
      validated_by: null,
    })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await db.from("agence_age_gate_events").insert({
    client_id: id,
    event_type: "rejected",
    actor: `admin:${adminCode}`,
    reason,
  });

  return NextResponse.json({
    ok: true,
    client_id: id,
    access_level: "rejected",
    rejected_reason: reason,
    rejected_at: nowIso,
  });
}
