import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";
import { toModelId } from "@/lib/model-utils";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/pipeline/fans — Fan Lifecycle CRUD
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

// ── GET: list fans ──
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const model = req.nextUrl.searchParams.get("model");
  const stage = req.nextUrl.searchParams.get("stage");
  const churnRisk = req.nextUrl.searchParams.get("churn_risk");

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
      .from("agence_fan_lifecycle")
      .select("*, agence_clients(pseudo_snap, pseudo_insta, firstname, tier)")
      .order("last_interaction", { ascending: false });

    if (model) q = q.eq("model_slug", model);
    if (stage) q = q.eq("stage", stage);
    if (churnRisk) q = q.eq("churn_risk", churnRisk);

    const { data, error } = await q;

    if (error) {
      console.error("[API/fans] GET error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors }
      );
    }

    return NextResponse.json({ fans: data || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/fans] GET:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}

// ── PUT: update fan stage/data ──
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

    const supabase = requireSupabase();

    const allowedFields = [
      "stage",
      "source_platform",
      "last_interaction",
      "total_spent",
      "messages_count",
      "tips_total",
      "ppv_purchased",
      "churn_risk",
      "tags",
      "notes",
    ];

    const sanitized: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowedFields) {
      if (key in updates) sanitized[key] = updates[key];
    }

    const { data, error } = await supabase
      .from("agence_fan_lifecycle")
      .update(sanitized)
      .eq("id", id)
      .eq("model_slug", model_slug)
      .select()
      .single();

    if (error) {
      console.error("[API/fans] PUT error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors }
      );
    }

    return NextResponse.json({ success: true, fan: data }, { headers: cors });
  } catch (err) {
    console.error("[API/fans] PUT:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}
