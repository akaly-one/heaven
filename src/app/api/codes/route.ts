import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/codes — Supabase (agence_codes) + globalThis fallback
   ══════════════════════════════════════════════ */

interface CodeRow {
  code: string; model: string; client: string; platform: string;
  role: string; tier: string; pack: string; type: string;
  duration: number; expiresAt: string; created: string;
  used: boolean; active: boolean; revoked: boolean;
  isTrial: boolean; lastUsed: string | null;
}

// globalThis fallback (warm instances on Vercel)
const g = globalThis as unknown as { _codes: CodeRow[] };
if (!g._codes) g._codes = [];

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const sb = () => getServerSupabase();

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

// ── GET ──
export async function GET(req: NextRequest) {
  const model = req.nextUrl.searchParams.get("model");
  try {
    const supabase = sb();
    if (supabase) {
      let q = supabase.from("agence_codes").select("*").order("created_at", { ascending: false });
      if (model) q = q.eq("model", model);
      const { data, error } = await q;
      if (!error && data) {
        // Sync to globalThis cache
        const mapped = data.map(mapFromDb);
        if (model) {
          g._codes = g._codes.filter(c => c.model !== model).concat(mapped);
        } else {
          g._codes = mapped;
        }
        return NextResponse.json({ codes: mapped }, { headers: cors });
      }
    }
    // Fallback
    const codes = model ? g._codes.filter(c => c.model === model) : g._codes;
    return NextResponse.json({ codes }, { headers: cors });
  } catch (err) {
    console.error("[API/codes] GET:", err);
    const codes = model ? g._codes.filter(c => c.model === model) : g._codes;
    return NextResponse.json({ codes }, { headers: cors });
  }
}

// ── POST (create or validate) ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── VALIDATE ──
    if (body.action === "validate") {
      const trimmed = (body.code || "").trim().toUpperCase().replace(/\s+/g, "");
      const model = body.model || "yumi";
      if (!trimmed) return NextResponse.json({ error: "Code requis" }, { status: 400, headers: cors });

      const supabase = sb();
      if (supabase) {
        const { data: found } = await supabase
          .from("agence_codes").select("*")
          .ilike("code", trimmed).eq("model", model).eq("revoked", false)
          .maybeSingle();
        if (found) {
          if (!found.active) return NextResponse.json({ error: "Code desactive." }, { status: 403, headers: cors });
          if (new Date(found.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "Code expire." }, { status: 410, headers: cors });
          await supabase.from("agence_codes").update({ used: true, last_used: new Date().toISOString() }).eq("id", found.id);
          const mapped = mapFromDb({ ...found, used: true, last_used: new Date().toISOString() });
          return NextResponse.json({ code: mapped }, { headers: cors });
        }
      }

      // Fallback globalThis
      const found = g._codes.find(c => c.code.toUpperCase() === trimmed && c.model === model && !c.revoked);
      if (!found) return NextResponse.json({ error: "Code invalide ou revoque." }, { status: 404, headers: cors });
      if (!found.active) return NextResponse.json({ error: "Code desactive." }, { status: 403, headers: cors });
      if (new Date(found.expiresAt).getTime() <= Date.now()) return NextResponse.json({ error: "Code expire." }, { status: 410, headers: cors });
      found.used = true;
      found.lastUsed = new Date().toISOString();
      return NextResponse.json({ code: found }, { headers: cors });
    }

    // ── CREATE ──
    // Normalize client pseudo to lowercase for consistent grouping
    const normalizedClient = (body.client || "").trim().toLowerCase();
    const model = body.model || "yumi";
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

    // Try Supabase
    const supabase = sb();
    if (supabase) {
      // Auto-link to agence_clients: find or create client record
      let clientId: string | null = null;
      if (normalizedClient) {
        const pseudoField = platform === "instagram" ? "pseudo_insta" : "pseudo_snap";
        const { data: existingClient } = await supabase
          .from("agence_clients")
          .select("id")
          .eq("model", model)
          .ilike(pseudoField, normalizedClient)
          .maybeSingle();

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const insertData: Record<string, unknown> = { model, last_active: new Date().toISOString() };
          insertData[pseudoField] = normalizedClient;
          const { data: newClient } = await supabase
            .from("agence_clients")
            .insert(insertData)
            .select("id")
            .single();
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
      if (!error && data) {
        const mapped = mapFromDb(data);
        g._codes.push(mapped); // cache
        return NextResponse.json({ success: true, code: mapped }, { status: 201, headers: cors });
      }
      if (error?.code === "23505") return NextResponse.json({ error: "Code deja existant" }, { status: 409, headers: cors });
    }

    // Fallback
    if (g._codes.some(c => c.code === newCode.code)) {
      return NextResponse.json({ error: "Code deja existant" }, { status: 409, headers: cors });
    }
    g._codes.push(newCode);
    return NextResponse.json({ success: true, code: newCode }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/codes] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// ── PUT ──
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const target = (body.code || "").toUpperCase();

    const supabase = sb();
    if (supabase) {
      const { data: found } = await supabase.from("agence_codes").select("*").ilike("code", target).maybeSingle();
      if (found) {
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
        const { data } = await supabase.from("agence_codes").update(updates).eq("id", found.id).select().single();
        if (data) {
          const mapped = mapFromDb(data);
          const idx = g._codes.findIndex(c => c.code.toUpperCase() === target);
          if (idx >= 0) g._codes[idx] = mapped; // update cache
          return NextResponse.json({ success: true, code: mapped }, { headers: cors });
        }
      }
    }

    // Fallback
    const idx = g._codes.findIndex(c => c.code.toUpperCase() === target);
    if (idx === -1) return NextResponse.json({ error: "Code introuvable" }, { status: 404, headers: cors });
    if (body.action === "pause") g._codes[idx].active = false;
    else if (body.action === "reactivate") { g._codes[idx].active = true; g._codes[idx].revoked = false; }
    else if (body.action === "revoke") { g._codes[idx].active = false; g._codes[idx].revoked = true; }
    else if (body.action === "renew") {
      const base = new Date(g._codes[idx].expiresAt).getTime() > Date.now() ? new Date(g._codes[idx].expiresAt).getTime() : Date.now();
      g._codes[idx].expiresAt = new Date(base + (body.hours || 72) * 3600000).toISOString();
      g._codes[idx].active = true; g._codes[idx].revoked = false;
    } else if (body.updates) Object.assign(g._codes[idx], body.updates);
    return NextResponse.json({ success: true, code: g._codes[idx] }, { headers: cors });
  } catch (err) {
    console.error("[API/codes] PUT:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// ── DELETE ──
export async function DELETE(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code) return NextResponse.json({ error: "Code requis" }, { status: 400, headers: cors });
  try {
    const supabase = sb();
    if (supabase) {
      const { data } = await supabase.from("agence_codes").delete().ilike("code", code).select();
      if (data && data.length > 0) {
        g._codes = g._codes.filter(c => c.code.toUpperCase() !== code);
        return NextResponse.json({ success: true }, { headers: cors });
      }
    }
    const before = g._codes.length;
    g._codes = g._codes.filter(c => c.code.toUpperCase() !== code);
    if (g._codes.length === before) return NextResponse.json({ error: "Code introuvable" }, { status: 404, headers: cors });
    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/codes] DELETE:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
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
  };
}
function mapToDb(u: Record<string, unknown>) {
  const m: Record<string, string> = { expiresAt: "expires_at", isTrial: "is_trial", lastUsed: "last_used" };
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(u)) r[m[k] || k] = v;
  return r;
}
