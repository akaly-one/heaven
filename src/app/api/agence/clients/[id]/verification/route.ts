/**
 * BRIEF-15 Lot C — GET /api/agence/clients/[id]/verification (admin)
 *
 * Retourne la verification la plus récente (pending ou sent) pour un client,
 * afin que le drawer admin puisse afficher le lien + code à copier sans
 * avoir besoin d'en générer une nouvelle si une verif est déjà active.
 *
 * Auth : root ou model (scope sa propre model uniquement).
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

interface VerificationRow {
  id: string;
  client_id: string;
  target_handle: string;
  target_platform: "snap" | "insta";
  token: string;
  code_6digit: string | null;
  status: "pending" | "sent" | "validated" | "expired" | "revoked";
  sent_at: string | null;
  sent_via_platform: "snap" | "insta" | "manual" | null;
  expires_at: string;
  created_at: string;
  validated_at: string | null;
}

export async function GET(
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

  const { data, error } = await db
    .from("agence_client_verifications")
    .select(
      "id, client_id, target_handle, target_platform, token, code_6digit, status, sent_at, sent_via_platform, expires_at, created_at, validated_at"
    )
    .eq("client_id", id)
    .in("status", ["pending", "sent"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<VerificationRow>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ verification: null });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://heaven-os.vercel.app";
  return NextResponse.json({
    verification: {
      id: data.id,
      client_id: data.client_id,
      target_handle: data.target_handle,
      target_platform: data.target_platform,
      code: data.code_6digit,
      link: `${baseUrl}/verify/${data.token}`,
      status: data.status,
      sent_at: data.sent_at,
      sent_via_platform: data.sent_via_platform,
      expires_at: data.expires_at,
      created_at: data.created_at,
      validated_at: data.validated_at,
    },
  });
}
