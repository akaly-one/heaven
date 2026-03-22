import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/uploads — Supabase (agence_uploads) + globalThis fallback
   ══════════════════════════════════════════════ */

interface UploadRow {
  id: string; tier: string; type: string; label: string;
  dataUrl: string; uploadedAt: string; isNew?: boolean;
  visibility?: string; tokenPrice?: number;
}

const g = globalThis as unknown as { _uploads: Record<string, UploadRow[]> };
if (!g._uploads) g._uploads = {};

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const sb = () => getServerSupabase();

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

// ── GET ──
export async function GET(req: NextRequest) {
  const model = req.nextUrl.searchParams.get("model") || "yumi";
  try {
    const supabase = sb();
    if (supabase) {
      const { data, error } = await supabase.from("agence_uploads").select("*").eq("model", model).order("created_at", { ascending: false });
      if (!error && data) {
        const mapped = data.map(mapFromDb);
        g._uploads[model] = mapped; // cache
        return NextResponse.json({ uploads: mapped }, { headers: cors });
      }
    }
    return NextResponse.json({ uploads: g._uploads[model] || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/uploads] GET:", err);
    return NextResponse.json({ uploads: g._uploads[model] || [] }, { headers: cors });
  }
}

// ── POST ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const model = body.model || "yumi";
    const supabase = sb();

    // Bulk sync
    if (body.action === "sync") {
      const uploads = (body.uploads || []) as UploadRow[];
      if (supabase) {
        await supabase.from("agence_uploads").delete().eq("model", model);
        if (uploads.length > 0) {
          const rows = uploads.map(u => mapToDb(u, model));
          await supabase.from("agence_uploads").insert(rows);
        }
      }
      g._uploads[model] = uploads;
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

    if (supabase) {
      const { data, error } = await supabase.from("agence_uploads").insert(mapToDb(newUpload, model)).select().single();
      if (!error && data) {
        const mapped = mapFromDb(data);
        if (!g._uploads[model]) g._uploads[model] = [];
        g._uploads[model].push(mapped);
        return NextResponse.json({ success: true, upload: mapped }, { status: 201, headers: cors });
      }
      if (error?.code === "23505") return NextResponse.json({ error: "Upload deja existant" }, { status: 409, headers: cors });
    }

    // Fallback
    if (!g._uploads[model]) g._uploads[model] = [];
    if (g._uploads[model].some(u => u.id === newUpload.id)) {
      return NextResponse.json({ error: "Upload deja existant" }, { status: 409, headers: cors });
    }
    g._uploads[model].push(newUpload);
    return NextResponse.json({ success: true, upload: newUpload }, { status: 201, headers: cors });
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

    const supabase = sb();
    if (supabase && body.updates) {
      const dbUpdates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(body.updates as Record<string, unknown>)) {
        dbUpdates[({ dataUrl: "data_url", tokenPrice: "token_price", isNew: "is_new" } as Record<string, string>)[k] || k] = v;
      }
      const { data } = await supabase.from("agence_uploads").update(dbUpdates).eq("model", model).eq("id", id).select().single();
      if (data) {
        const mapped = mapFromDb(data);
        const list = g._uploads[model] || [];
        const idx = list.findIndex(u => u.id === id);
        if (idx >= 0) list[idx] = mapped;
        return NextResponse.json({ success: true, upload: mapped }, { headers: cors });
      }
    }

    // Fallback
    const list = g._uploads[model] || [];
    const idx = list.findIndex(u => u.id === id);
    if (idx === -1) return NextResponse.json({ error: "Upload introuvable" }, { status: 404, headers: cors });
    if (body.updates) Object.assign(list[idx], body.updates);
    return NextResponse.json({ success: true, upload: list[idx] }, { headers: cors });
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
    const supabase = sb();
    if (supabase) {
      await supabase.from("agence_uploads").delete().eq("model", model).eq("id", id);
    }
    const list = g._uploads[model] || [];
    const before = list.length;
    g._uploads[model] = list.filter(u => u.id !== id);
    if (!supabase && g._uploads[model].length === before) {
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
