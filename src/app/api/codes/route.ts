import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/codes — Supabase-only (agence_codes)
   ══════════════════════════════════════════════ */

import type { CodeRow } from "@/types/heaven";

class DbConnectionError extends Error {
  constructor() { super("Supabase not configured"); this.name = "DbConnectionError"; }
}

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new DbConnectionError();
  return supabase;
}

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// ── GET ──
// Supports pagination: ?page=1&limit=50 (default: return all for backward compat)
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const model = req.nextUrl.searchParams.get("model");
  const clientId = req.nextUrl.searchParams.get("client_id");
  const statusFilter = req.nextUrl.searchParams.get("status"); // "active" = active + not revoked + not expired
  if (model && !isValidModelSlug(model)) {
    return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
  }
  try {
    const supabase = requireSupabase();

    const pageParam = req.nextUrl.searchParams.get("page");
    const limitParam = req.nextUrl.searchParams.get("limit");
    const paginated = pageParam !== null;
    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(limitParam || "50", 10) || 50));
    const offset = (page - 1) * limit;

    if (paginated) {
      // Paginated mode: return page + total count
      let countQ = supabase.from("agence_codes").select("*", { count: "exact", head: true });
      if (model) countQ = countQ.eq("model", model);
      if (clientId) countQ = countQ.eq("client_id", clientId);
      if (statusFilter === "active") {
        countQ = countQ.eq("active", true).eq("revoked", false).gt("expires_at", new Date().toISOString());
      }
      const { count } = await countQ;
      const total = count ?? 0;

      let q = supabase.from("agence_codes").select("*").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      if (model) q = q.eq("model", model);
      if (clientId) q = q.eq("client_id", clientId);
      if (statusFilter === "active") {
        q = q.eq("active", true).eq("revoked", false).gt("expires_at", new Date().toISOString());
      }
      const { data, error } = await q;

      if (error) {
        console.error("[API/codes] GET Supabase error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
      }

      const mapped = (data || []).map(mapFromDb);
      return NextResponse.json({
        codes: mapped,
        total,
        page,
        limit,
        hasMore: offset + limit < total,
      }, { headers: cors });
    }

    // Legacy mode: return all (backward compat)
    let q = supabase.from("agence_codes").select("*").order("created_at", { ascending: false }).limit(500);
    if (model) q = q.eq("model", model);
    if (clientId) q = q.eq("client_id", clientId);
    if (statusFilter === "active") {
      q = q.eq("active", true).eq("revoked", false).gt("expires_at", new Date().toISOString());
    }
    const { data, error } = await q;

    if (error) {
      console.error("[API/codes] GET Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }

    const mapped = (data || []).map(mapFromDb);
    return NextResponse.json({ codes: mapped }, { headers: cors });
  } catch (err) {
    console.error("[API/codes] GET:", err);
    const errStatus = err instanceof DbConnectionError ? 502 : 500;
    return NextResponse.json({ error: errStatus === 502 ? "DB non configuree" : "Erreur serveur" }, { status: errStatus, headers: cors });
  }
}

// ── POST (create or validate) ──
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const supabase = requireSupabase();

    // ── VALIDATE ──
    if (body.action === "validate") {
      const trimmed = (body.code || "").trim().toUpperCase().replace(/\s+/g, "");
      const model = body.model;
      if (!trimmed) return NextResponse.json({ error: "Code requis" }, { status: 400, headers: cors });
      if (!isValidModelSlug(model)) return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });

      const { data: found, error } = await supabase
        .from("agence_codes").select("*")
        .ilike("code", trimmed).eq("model", model).eq("revoked", false)
        .maybeSingle();

      if (error) {
        console.error("[API/codes] validate error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
      }
      if (!found) return NextResponse.json({ error: "Code invalide ou revoque." }, { status: 404, headers: cors });
      if (!found.active) return NextResponse.json({ error: "Code desactive." }, { status: 403, headers: cors });
      if (new Date(found.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "Code expire." }, { status: 410, headers: cors });

      // Atomic update: only succeeds if code is still unused (prevents double-validation race)
      const { data: updated, error: updateErr } = await supabase
        .from("agence_codes")
        .update({ used: true, last_used: new Date().toISOString() })
        .eq("id", found.id)
        .eq("used", false)
        .select()
        .maybeSingle();
      if (updateErr) {
        console.error("[API/codes] validate update error:", updateErr);
        return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
      }
      if (!updated) {
        return NextResponse.json({ error: "Code deja utilise." }, { status: 409, headers: cors });
      }
      const mapped = mapFromDb(updated);
      return NextResponse.json({ code: mapped }, { headers: cors });
    }

    // ── CREATE ──
    const normalizedClient = (body.client || "").trim().toLowerCase();
    const model = body.model;
    if (!isValidModelSlug(model)) return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    const platform = body.platform || "snapchat";

    const newCode: CodeRow = {
      code: body.code,
      model,
      client: normalizedClient,
      platform,
      role: body.role || "client",
      tier: body.tier || "vip",
      pack: body.pack || body.tier || "vip",
      type: body.type || "paid",
      duration: body.duration || 72,
      expiresAt: body.expiresAt || new Date(Date.now() + 72 * 3600000).toISOString(),
      created: body.created || new Date().toISOString(),
      used: false, active: true, revoked: false,
      isTrial: body.isTrial || false,
      lastUsed: null,
    };

    // Auto-link to agence_clients (search both pseudo fields)
    let clientId: string | null = null;
    if (normalizedClient) {
      const primaryField = platform === "instagram" ? "pseudo_insta" : "pseudo_snap";
      const secondaryField = platform === "instagram" ? "pseudo_snap" : "pseudo_insta";

      // Try primary field first
      let { data: existingClient } = await supabase
        .from("agence_clients").select("id")
        .eq("model", model).ilike(primaryField, normalizedClient)
        .maybeSingle();

      // Fallback: try secondary field
      if (!existingClient) {
        const { data: fallback } = await supabase
          .from("agence_clients").select("id")
          .eq("model", model).ilike(secondaryField, normalizedClient)
          .maybeSingle();
        existingClient = fallback;
      }

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const insertData: Record<string, unknown> = { model, last_active: new Date().toISOString() };
        insertData[primaryField] = normalizedClient;
        const { data: newClient } = await supabase
          .from("agence_clients").insert(insertData).select("id").single();
        if (newClient) clientId = newClient.id;
      }
    }

    const insertPayload: Record<string, unknown> = {
      code: newCode.code, model: newCode.model, client: normalizedClient,
      platform: newCode.platform, role: newCode.role, tier: newCode.tier,
      pack: newCode.pack, type: newCode.type, duration: newCode.duration,
      expires_at: newCode.expiresAt, is_trial: newCode.isTrial,
    };
    if (clientId) insertPayload.client_id = clientId;

    const { data, error } = await supabase.from("agence_codes").insert(insertPayload).select().single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Code deja existant" }, { status: 409, headers: cors });
      console.error("[API/codes] POST Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }

    const mapped = mapFromDb(data);
    return NextResponse.json({ success: true, code: mapped }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/codes] POST:", err);
    const status = err instanceof DbConnectionError ? 502 : 500;
    return NextResponse.json({ error: status === 502 ? "DB non configuree" : "Erreur serveur" }, { status, headers: cors });
  }
}

// ── PUT ──
export async function PUT(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const target = (body.code || "").toUpperCase();
    const supabase = requireSupabase();

    const { data: found, error: findErr } = await supabase
      .from("agence_codes").select("*").ilike("code", target).maybeSingle();

    if (findErr) {
      console.error("[API/codes] PUT find error:", findErr);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    if (!found) return NextResponse.json({ error: "Code introuvable" }, { status: 404, headers: cors });

    let updates: Record<string, unknown> = {};
    if (body.action === "pause") updates = { active: false };
    else if (body.action === "reactivate") updates = { active: true, revoked: false };
    else if (body.action === "revoke") updates = { active: false, revoked: true };
    else if (body.action === "renew") {
      const base = new Date(found.expires_at).getTime() > Date.now() ? new Date(found.expires_at).getTime() : Date.now();
      updates = { expires_at: new Date(base + (body.hours || 72) * 3600000).toISOString(), active: true, revoked: false };
    } else if (body.updates) {
      updates = mapToDb(body.updates);
    }

    const { data, error } = await supabase
      .from("agence_codes").update(updates).eq("id", found.id).select().single();

    if (error) {
      console.error("[API/codes] PUT update error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }

    const mapped = mapFromDb(data);
    return NextResponse.json({ success: true, code: mapped }, { headers: cors });
  } catch (err) {
    console.error("[API/codes] PUT:", err);
    const status = err instanceof DbConnectionError ? 502 : 500;
    return NextResponse.json({ error: status === 502 ? "DB non configuree" : "Erreur serveur" }, { status, headers: cors });
  }
}

// ── DELETE ──
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code) return NextResponse.json({ error: "Code requis" }, { status: 400, headers: cors });
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("agence_codes").delete().ilike("code", code).select();

    if (error) {
      console.error("[API/codes] DELETE error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Code introuvable" }, { status: 404, headers: cors });
    }
    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/codes] DELETE:", err);
    const status = err instanceof DbConnectionError ? 502 : 500;
    return NextResponse.json({ error: status === 502 ? "DB non configuree" : "Erreur serveur" }, { status, headers: cors });
  }
}

// PATCH /api/codes — Update code fields (client reassignment for merge)
export async function PATCH(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { code, model, updates } = body;
    if (!code || !model || !updates) {
      return NextResponse.json({ error: "code, model, updates requis" }, { status: 400, headers: cors });
    }
    const supabase = requireSupabase();
    const dbUpdates = mapToDb(updates);
    const { error } = await supabase
      .from("agence_codes")
      .update(dbUpdates)
      .ilike("code", code)
      .eq("model", model);
    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/codes] PATCH:", err);
    const status = err instanceof DbConnectionError ? 502 : 500;
    return NextResponse.json({ error: status === 502 ? "DB non configuree" : "Erreur serveur" }, { status, headers: cors });
  }
}

// ── Mappers ──
/* eslint-disable @typescript-eslint/no-explicit-any */
function mapFromDb(row: any): CodeRow {
  return {
    code: row.code, model: row.model, client: row.client, platform: row.platform,
    role: row.role, tier: row.tier, pack: row.pack, type: row.type,
    duration: row.duration, expiresAt: row.expires_at || row.expiresAt,
    created: row.created_at || row.created, used: row.used, active: row.active,
    revoked: row.revoked, isTrial: row.is_trial ?? row.isTrial, lastUsed: row.last_used ?? row.lastUsed,
    clientId: row.client_id || undefined,
  };
}
function mapToDb(u: Record<string, unknown>) {
  const m: Record<string, string> = { expiresAt: "expires_at", isTrial: "is_trial", lastUsed: "last_used" };
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(u)) r[m[k] || k] = v;
  return r;
}
