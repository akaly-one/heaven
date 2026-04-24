import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

// BRIEF-13 UV04 — POST /api/agence/clients/[id]/verification/[vid]/mark-sent
// Admin marque une verification comme "sent" après avoir envoyé le lien+code
// manuellement via Snap/Insta/autre canal

interface MarkSentBody {
  via?: "snap" | "insta" | "manual";
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; vid: string }> }
): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, vid } = await ctx.params;
  if (!id || !vid) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as MarkSentBody;
  const via = body.via;
  if (via !== "snap" && via !== "insta" && via !== "manual") {
    return NextResponse.json(
      { error: "via must be 'snap', 'insta' or 'manual'" },
      { status: 400 }
    );
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  // Scope check model → client owner
  if (user.role === "model") {
    const { data: client } = await db
      .from("agence_clients")
      .select("model")
      .eq("id", id)
      .maybeSingle();
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    const userModelId = toModelId(user.sub);
    if (String(client.model).toLowerCase() !== userModelId.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const adminCode = String(user.sub || "root");

  const { data, error } = await db
    .from("agence_client_verifications")
    .update({
      status: "sent",
      sent_by: adminCode,
      sent_via_platform: via,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", vid)
    .eq("client_id", id)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Verification not found or not in pending state" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, verification: data });
}
