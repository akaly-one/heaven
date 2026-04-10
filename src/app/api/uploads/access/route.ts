import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";
import { toModelId } from "@/lib/model-utils";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════════════
   /api/uploads/access — Photo-to-client access (sales)
   Table: agence_photo_access
   ══════════════════════════════════════════════════════ */

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// ── GET — List accesses (with joined client info) ──
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const params = req.nextUrl.searchParams;
  const model = params.get("model");

  if (!isValidModelSlug(model)) {
    return NextResponse.json({ error: "model requis" }, { status: 400, headers: cors });
  }

  // Model-scoping: model role can only access their own data
  const user = await getAuthUser();
  if (user && user.role === "model") {
    if (model && toModelId(model) !== toModelId(user.sub)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
    }
  }

  try {
    const supabase = requireSupabase();

    let query = supabase
      .from("agence_photo_access")
      .select("*, agence_clients(handle, tier, display_name)")
      .eq("model", model)
      .order("granted_at", { ascending: false });

    // Optional filters
    const uploadId = params.get("upload_id");
    if (uploadId) query = query.eq("upload_id", uploadId);

    const clientId = params.get("client_id");
    if (clientId) query = query.eq("client_id", clientId);

    // active_only defaults to true
    const activeOnly = params.get("active_only") !== "false";
    if (activeOnly) query = query.is("revoked_at", null);

    const { data, error } = await query;

    if (error) {
      console.error("[API/uploads/access] GET Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }

    return NextResponse.json({ accesses: data || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/uploads/access] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// ── POST — Grant access (sell a photo to a client) ──
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const model = body.model;

    if (!isValidModelSlug(model)) {
      return NextResponse.json({ error: "model requis" }, { status: 400, headers: cors });
    }

    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (model && toModelId(model) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }

    // Validate required fields
    const { upload_id, client_id, source_tier, price } = body;
    if (!upload_id || !client_id) {
      return NextResponse.json({ error: "upload_id et client_id requis" }, { status: 400, headers: cors });
    }

    const supabase = requireSupabase();

    const { data, error } = await supabase
      .from("agence_photo_access")
      .insert({
        model,
        upload_id,
        client_id,
        source_tier: source_tier || null,
        price: price ?? 0,
        granted_at: new Date().toISOString(),
        notes: body.notes || null,
      })
      .select("*, agence_clients(handle, tier, display_name)")
      .single();

    if (error) {
      console.error("[API/uploads/access] POST Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }

    return NextResponse.json({ success: true, access: data }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/uploads/access] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// ── DELETE — Revoke access (soft delete) ──
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const params = req.nextUrl.searchParams;
  const model = params.get("model");
  const id = params.get("id");

  if (!isValidModelSlug(model)) {
    return NextResponse.json({ error: "model requis" }, { status: 400, headers: cors });
  }
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });
  }

  // Model-scoping: model role can only access their own data
  const user = await getAuthUser();
  if (user && user.role === "model") {
    if (model && toModelId(model) !== toModelId(user.sub)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
    }
  }

  try {
    const supabase = requireSupabase();

    const { data, error } = await supabase
      .from("agence_photo_access")
      .update({ revoked_at: new Date().toISOString() })
      .eq("model", model)
      .eq("id", id)
      .is("revoked_at", null)
      .select()
      .single();

    if (error) {
      console.error("[API/uploads/access] DELETE Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    if (!data) {
      return NextResponse.json({ error: "Access introuvable ou deja revoque" }, { status: 404, headers: cors });
    }

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/uploads/access] DELETE:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}
