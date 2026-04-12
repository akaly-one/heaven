import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { normalizeTier } from "@/lib/tier-utils";
import { getAuthUser } from "@/lib/api-auth";
import { toModelId } from "@/lib/model-utils";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/uploads — Supabase-only (agence_uploads)
   ══════════════════════════════════════════════ */

interface UploadRow {
  id: string; tier: string; type: string; label: string;
  dataUrl: string; uploadedAt: string; isNew?: boolean;
  visibility?: string; tokenPrice?: number;
  groupLabel?: string | null; clientId?: string | null;
}

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// ── GET ──
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const model = req.nextUrl.searchParams.get("model");
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
    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ uploads: [] }, { headers: cors });
    }
    const normalizedModel = toModelId(model);
    const { data, error } = await supabase
      .from("agence_uploads").select("*")
      .eq("model", normalizedModel)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API/uploads] GET Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }

    const mapped = (data || []).map(mapFromDb);
    return NextResponse.json({ uploads: mapped }, { headers: cors });
  } catch (err) {
    console.error("[API/uploads] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// ── POST ──
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const model = body.model;
    if (!isValidModelSlug(model)) return NextResponse.json({ error: "model requis" }, { status: 400, headers: cors });
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (model && toModelId(model) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }
    const supabase = requireSupabase();

    const normalizedModel = toModelId(model);
    // Bulk sync
    if (body.action === "sync") {
      const uploads = (body.uploads || []) as UploadRow[];
      const { error: delErr } = await supabase.from("agence_uploads").delete().eq("model", normalizedModel);
      if (delErr) {
        console.error("[API/uploads] sync delete error:", delErr);
        return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
      }
      if (uploads.length > 0) {
        const rows = uploads.map(u => mapToDb(u, normalizedModel));
        const { error: insErr } = await supabase.from("agence_uploads").insert(rows);
        if (insErr) {
          console.error("[API/uploads] sync insert error:", insErr);
          return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
        }
      }
      return NextResponse.json({ success: true, count: uploads.length }, { headers: cors });
    }

    // Single upload
    const newUpload: UploadRow = {
      id: body.id || `upl-${Date.now()}`,
      tier: body.tier === "custom" ? "custom" : body.tier ? normalizeTier(body.tier) : "p0",
      type: body.type || "photo",
      label: body.label || "",
      dataUrl: body.dataUrl || "",
      uploadedAt: body.uploadedAt || new Date().toISOString(),
      isNew: body.isNew ?? true,
      visibility: body.visibility || "p0",
      tokenPrice: body.tokenPrice ?? 0,
      groupLabel: body.groupLabel || null,
      clientId: body.clientId || null,
    };

    const { data, error } = await supabase
      .from("agence_uploads")
      .insert(mapToDb(newUpload, normalizedModel))
      .select().single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Upload deja existant" }, { status: 409, headers: cors });
      console.error("[API/uploads] POST Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }

    const mapped = mapFromDb(data);
    return NextResponse.json({ success: true, upload: mapped }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/uploads] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// ── PUT ──
export async function PUT(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const model = body.model;
    if (!isValidModelSlug(model)) return NextResponse.json({ error: "model requis" }, { status: 400, headers: cors });
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (model && toModelId(model) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

    const normalizedModel = toModelId(model);
    const supabase = requireSupabase();
    const dbUpdates: Record<string, unknown> = {};
    const allowedFields: Record<string, string> = {
      tier: "tier", label: "label", visibility: "visibility", type: "type",
      dataUrl: "data_url", tokenPrice: "token_price", isNew: "is_new",
      groupLabel: "group_label", clientId: "client_id",
    };
    for (const [k, v] of Object.entries(body.updates || {})) {
      const dbKey = allowedFields[k];
      if (dbKey) dbUpdates[dbKey] = dbKey === "tier" ? normalizeTier(v as string) : v;
    }

    const { data, error } = await supabase
      .from("agence_uploads")
      .update(dbUpdates)
      .eq("model", normalizedModel).eq("id", id)
      .select().single();

    if (error) {
      console.error("[API/uploads] PUT Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    if (!data) return NextResponse.json({ error: "Upload introuvable" }, { status: 404, headers: cors });

    const mapped = mapFromDb(data);
    return NextResponse.json({ success: true, upload: mapped }, { headers: cors });
  } catch (err) {
    console.error("[API/uploads] PUT:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// ── DELETE ──
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const model = req.nextUrl.searchParams.get("model");
  if (!isValidModelSlug(model)) return NextResponse.json({ error: "model requis" }, { status: 400, headers: cors });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });
  // Model-scoping: model role can only access their own data
  const user = await getAuthUser();
  if (user && user.role === "model") {
    if (model && toModelId(model) !== toModelId(user.sub)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
    }
  }
  try {
    const normalizedModel = toModelId(model);
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("agence_uploads")
      .delete()
      .eq("model", normalizedModel).eq("id", id)
      .select();

    if (error) {
      console.error("[API/uploads] DELETE Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Upload introuvable" }, { status: 404, headers: cors });
    }
    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/uploads] DELETE:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapFromDb(row: any): UploadRow {
  return {
    id: row.id, tier: row.tier === "custom" ? "custom" : normalizeTier(row.tier), type: row.type, label: row.label,
    dataUrl: row.data_url ?? row.dataUrl, uploadedAt: row.created_at ?? row.uploadedAt,
    isNew: row.is_new ?? row.isNew, visibility: row.visibility,
    tokenPrice: row.token_price ?? row.tokenPrice,
    groupLabel: row.group_label ?? row.groupLabel ?? null,
    clientId: row.client_id ?? row.clientId ?? null,
  };
}
function mapToDb(u: any, model: string) {
  return {
    id: u.id || undefined, model, tier: u.tier === "custom" ? "custom" : u.tier ? normalizeTier(u.tier) : "p0", type: u.type || "photo",
    label: u.label || "", data_url: u.dataUrl || u.data_url || "",
    visibility: u.visibility || "p0", token_price: u.tokenPrice ?? u.token_price ?? 0,
    is_new: u.isNew ?? u.is_new ?? true,
    group_label: u.groupLabel ?? u.group_label ?? null,
    client_id: u.clientId ?? u.client_id ?? null,
  };
}
