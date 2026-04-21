import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { toModelId } from "@/lib/model-utils";

export const runtime = "nodejs";

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/feed?model=yumi (or m1)
//
// Public (no JWT) — unified feed that aggregates manual posts, wall posts
// and Instagram syncs from agence_feed_items, ordered by pinned + posted_at.
// ═══════════════════════════════════════════════════════════════════════════

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const rawModel = req.nextUrl.searchParams.get("model") || "yumi";

  if (!isValidModelSlug(rawModel)) {
    return NextResponse.json({ error: "invalid model" }, { status: 400, headers: cors });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 502, headers: cors });
  }

  // Resolve slug → model_id via DB (falls back to slugOrId if unknown model).
  let modelId = toModelId(rawModel);
  try {
    const { data: m } = await db
      .from("agence_models")
      .select("model_id")
      .or(`slug.eq.${rawModel},model_id.eq.${rawModel}`)
      .maybeSingle();
    if (m?.model_id) modelId = m.model_id as string;
  } catch {
    /* non-blocking — already have best-effort modelId from toModelId */
  }

  try {
    const { data, error } = await db
      .from("agence_feed_items")
      .select("*")
      .eq("model", modelId)
      .is("deleted_at", null)
      .order("pinned", { ascending: false })
      .order("posted_at", { ascending: false })
      .limit(50);

    if (error) {
      // Table may not exist yet (migration 038 pending) — return empty so
      // the frontend gracefully falls back to the legacy rendering path.
      const msg = error.message || "";
      if (msg.includes("does not exist") || msg.includes("relation")) {
        return NextResponse.json(
          { items: [], fallback: "table_missing" },
          { headers: { ...cors, "Cache-Control": "public, max-age=30" } }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500, headers: cors });
    }

    return NextResponse.json(
      { items: data || [], model: modelId },
      { headers: { ...cors, "Cache-Control": "public, max-age=60" } }
    );
  } catch (err) {
    console.error("[API/feed] GET:", err);
    return NextResponse.json({ items: [] }, { headers: cors });
  }
}
