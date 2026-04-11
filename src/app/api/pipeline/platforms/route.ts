import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";
import { toModelId } from "@/lib/model-utils";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/pipeline/platforms — Platform Accounts CRUD
   ══════════════════════════════════════════════ */

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// ── GET: list platform accounts ──
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const model = req.nextUrl.searchParams.get("model");

  // Model-scoping: model role can only access their own data
  const user = await getAuthUser();
  if (user && user.role === "model") {
    if (model && toModelId(model) !== toModelId(user.sub)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
    }
  }
  try {
    const supabase = requireSupabase();
    let q = supabase
      .from("agence_platform_accounts")
      .select("*")
      .order("platform", { ascending: true });

    if (model) q = q.eq("model_slug", toModelId(model));

    const { data, error } = await q;

    if (error) {
      console.error("[API/platforms] GET error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors }
      );
    }

    return NextResponse.json({ accounts: data || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/platforms] GET:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}

// ── POST: add platform account ──
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (body.model_slug && toModelId(body.model_slug) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }
    const supabase = requireSupabase();

    const payload = {
      model_slug: toModelId(body.model_slug),
      platform: body.platform,
      handle: body.handle,
      profile_url: body.profile_url || null,
      status: body.status || "active",
      subscribers_count: body.subscribers_count || 0,
      monthly_revenue: body.monthly_revenue || 0,
      commission_rate: body.commission_rate ?? 25.0,
      notes: body.notes || null,
    };

    if (!isValidModelSlug(body.model_slug)) {
      return NextResponse.json({ error: "model_slug requis" }, { status: 400, headers: cors });
    }
    if (!payload.platform || !payload.handle) {
      return NextResponse.json(
        { error: "Platform and handle are required" },
        { status: 400, headers: cors }
      );
    }

    const { data, error } = await supabase
      .from("agence_platform_accounts")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[API/platforms] POST error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors }
      );
    }

    return NextResponse.json(
      { success: true, account: data },
      { status: 201, headers: cors }
    );
  } catch (err) {
    console.error("[API/platforms] POST:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}

// ── PUT: update platform account ──
export async function PUT(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { id, model_slug, ...updates } = body;
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (model_slug && toModelId(model_slug) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400, headers: cors }
      );
    }

    if (!isValidModelSlug(model_slug)) {
      return NextResponse.json(
        { error: "model_slug requis" },
        { status: 400, headers: cors }
      );
    }
    const normalizedModel = toModelId(model_slug);

    const supabase = requireSupabase();

    const allowedFields = [
      "handle",
      "profile_url",
      "status",
      "subscribers_count",
      "monthly_revenue",
      "commission_rate",
      "notes",
      "synced_at",
    ];

    const sanitized: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowedFields) {
      if (key in updates) sanitized[key] = updates[key];
    }

    const { data, error } = await supabase
      .from("agence_platform_accounts")
      .update(sanitized)
      .eq("id", id)
      .eq("model_slug", normalizedModel)
      .select()
      .single();

    if (error) {
      console.error("[API/platforms] PUT error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors }
      );
    }

    return NextResponse.json(
      { success: true, account: data },
      { headers: cors }
    );
  } catch (err) {
    console.error("[API/platforms] PUT:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}
