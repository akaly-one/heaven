import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { generateVerification } from "@/lib/verification/generate";

// BRIEF-13 UV04 — POST /api/agence/clients/[id]/verification/generate
// Admin génère un lien + code 6 chiffres à envoyer manuellement via Snap/IG
// Rate limit : 5/jour par client

interface GenerateBody {
  platform?: "snap" | "insta";
  handle?: string;
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

  const body = (await req.json().catch(() => ({}))) as GenerateBody;
  const platform = body.platform;
  if (platform !== "snap" && platform !== "insta") {
    return NextResponse.json({ error: "platform must be 'snap' or 'insta'" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  // Load client (check exists + scope model)
  const { data: client, error: clientErr } = await db
    .from("agence_clients")
    .select("id, model, pseudo_snap, pseudo_insta, access_level")
    .eq("id", id)
    .maybeSingle();

  if (clientErr || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Scope check for model role
  if (user.role === "model") {
    const userSlug = String(user.sub || "").toLowerCase();
    if (String(client.model).toLowerCase() !== userSlug) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (client.access_level === "validated") {
    return NextResponse.json({ error: "Client already validated" }, { status: 409 });
  }

  // Resolve handle : body.handle prioritaire, sinon lire depuis client
  let handle = typeof body.handle === "string" ? body.handle.trim() : "";
  if (!handle) {
    handle = platform === "snap" ? String(client.pseudo_snap || "") : String(client.pseudo_insta || "");
  }
  if (!handle) {
    return NextResponse.json({ error: `No ${platform} handle on client` }, { status: 400 });
  }
  if (platform === "snap" && (handle.startsWith("visiteur-") || handle.startsWith("guest-"))) {
    return NextResponse.json({ error: "Cannot verify anonymous snap pseudo" }, { status: 400 });
  }

  // Rate limit : 5 verifications / client / 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("agence_client_verifications")
    .select("id", { count: "exact", head: true })
    .eq("client_id", id)
    .gte("created_at", since);

  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: "Rate limit exceeded (5/day per client)" },
      { status: 429 }
    );
  }

  const adminCode = String(user.sub || "root");
  const result = await generateVerification({
    clientId: id,
    handle,
    platform,
    adminCode,
    req: req as unknown as Request,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
