import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/uploads — Supabase-only (agence_uploads)
   ══════════════════════════════════════════════ */

interface UploadRow {
  id: string; tier: string; type: string; label: string;
  dataUrl: string; uploadedAt: string; isNew?: boolean;
  visibility?: string; tokenPrice?: number;
}

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

// ── GET ──
export async function GET(req: NextRequest) {
  const model = req.nextUrl.searchParams.get("model") || "yumi";
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("agence_uploads").select("*")
      .eq("model", model)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API/uploads] GET Supabase error:", error);
      return NextResponse.json({ error: "Database error", detail: error.message }, { status: 502, headers: cors });
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
  try {
    const body = await req.json();
    const model = body.model || "yumi";
    const supabase = requireSupabase();

    // Bulk sync
    if (body.action === "sync") {
      const uploads = (body.uploads || []) as UploadRow[];
      const { error: delErr } = await supabase.from("agence_uploads").delete().eq("model", model);
      if (delErr) {
        console.error("[API/uploads] sync delete error:", delErr);
        return NextResponse.json({ error: "Database error", detail: delErr.message }, { status: 502, headers: cors });
      }
      if (uploads.length > 0) {
        const rows = uploads.map(u => mapToDb(u, model));
        const { error: insErr } = await supabase.from("agence_uploads").insert(rows);
        if (insErr) {
          console.error("[API/uploads] sync insert error:", insErr);
          return NextResponse.json({ error: "Database error", detail: insErr.message }, { status: 502, headers: cors });
        }
      }
      return NextResponse.json({ success: true, count: uploads.length }, { headers: cors });
    }

    // Single upload
    const newUpload: UploadRow = {
      id: body.id || `upl-${Date.now()}`,
      tier: body.tier || "promo",
      type: body.type || "photo",
      label: body.label || "",
      dataUrl: body.dataUrl || "",
      uploadedAt: body.uploadedAt || new Date().toISOString(),
      isNew: body.isNew ?? true,
      visibility: body.visibility || "promo",
      tokenPrice: body.tokenPrice ?? 0,
    };

    const { data, error } = await supabase
      .from("agence_uploads")
      .insert(mapToDb(newUpload, model))
      .select().single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Upload deja existant" }, { status: 409, headers: cors });
      console.error("[API/uploads] POST Supabase error:", error);
      return NextResponse.json({ error: "Database error", detail: error.message }, { status: 502, headers: cors });
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
  try {
    const body = await req.json();
    const model = body.model || "yumi";
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

    const supabase = requireSupabase();
    const dbUpdates: Record<string, unknown> = {};
    const allowedFields: Record<string, string> = {
      tier: "tier", label: "label", visibility: "visibility", type: "type",
      dataUrl: "data_url", tokenPrice: "token_price", isNew: "is_new",
    };
    for (const [k, v] of Object.entries(body.updates || {})) {
      const dbKey = allowedFields[k];
      if (dbKey) dbUpdates[dbKey] = v;
    }

    const { data, error } = await supabase
      .from("agence_uploads")
      .update(dbUpdates)
      .eq("model", model).eq("id", id)
      .select().single();

    if (error) {
      console.error("[API/uploads] PUT Supabase error:", error);
      return NextResponse.json({ error: "Database error", detail: error.message }, { status: 502, headers: cors });
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
  const model = req.nextUrl.searchParams.get("model") || "yumi";
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("agence_uploads")
      .delete()
      .eq("model", model).eq("id", id)
      .select();

    if (error) {
      console.error("[API/uploads] DELETE Supabase error:", error);
      return NextResponse.json({ error: "Database error", detail: error.message }, { status: 502, headers: cors });
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
    id: row.id, tier: row.tier, type: row.type, label: row.label,
    dataUrl: row.data_url ?? row.dataUrl, uploadedAt: row.created_at ?? row.uploadedAt,
    isNew: row.is_new ?? row.isNew, visibility: row.visibility,
    tokenPrice: row.token_price ?? row.tokenPrice,
  };
}
function mapToDb(u: any, model: string) {
  return {
    id: u.id || undefined, model, tier: u.tier || "promo", type: u.type || "photo",
    label: u.label || "", data_url: u.dataUrl || u.data_url || "",
    visibility: u.visibility || "promo", token_price: u.tokenPrice ?? u.token_price ?? 0,
    is_new: u.isNew ?? u.is_new ?? true,
  };
}
