import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   API Route: /api/codes
   Shared server-side store for access codes.
   Phase 0: in-memory (globalThis). Phase 1: Supabase.
   ══════════════════════════════════════════════ */

interface AccessCode {
  code: string;
  model: string;
  client: string;
  platform: string;
  role: "client" | "admin";
  tier: string;
  pack: string;
  type: "paid" | "promo" | "gift" | "trial";
  duration: number;
  expiresAt: string;
  created: string;
  used: boolean;
  active: boolean;
  revoked: boolean;
  isTrial: boolean;
  lastUsed: string | null;
}

// In-memory store (persists across requests within same server process)
const g = globalThis as unknown as { _codes: AccessCode[] };
if (!g._codes) g._codes = [];

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

// GET /api/codes — list all codes (optionally filter by model)
export async function GET(req: NextRequest) {
  const model = req.nextUrl.searchParams.get("model");
  const codes = model ? g._codes.filter(c => c.model === model) : g._codes;
  return NextResponse.json({ codes }, { headers: cors });
}

// POST /api/codes — create a new code OR validate a code
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Validate action: { action: "validate", code: "YUM-...", model: "yumi" }
    if (body.action === "validate") {
      const trimmed = (body.code || "").trim().toUpperCase().replace(/\s+/g, "");
      const model = body.model || "yumi";
      if (!trimmed) return NextResponse.json({ error: "Code requis" }, { status: 400, headers: cors });

      const found = g._codes.find(c =>
        c.code.toUpperCase() === trimmed && c.model === model && !c.revoked
      );
      if (!found) return NextResponse.json({ error: "Code invalide ou revoque." }, { status: 404, headers: cors });
      if (!found.active) return NextResponse.json({ error: "Code desactive." }, { status: 403, headers: cors });
      if (new Date(found.expiresAt).getTime() <= Date.now()) return NextResponse.json({ error: "Code expire." }, { status: 410, headers: cors });

      // Mark as used
      found.used = true;
      found.lastUsed = new Date().toISOString();

      return NextResponse.json({ code: found }, { headers: cors });
    }

    // ── Create action (default): full AccessCode payload
    const newCode: AccessCode = {
      code: body.code,
      model: body.model || "yumi",
      client: body.client || "",
      platform: body.platform || "snapchat",
      role: body.role || "client",
      tier: body.tier || "vip",
      pack: body.pack || body.tier || "vip",
      type: body.type || "paid",
      duration: body.duration || 72,
      expiresAt: body.expiresAt || new Date(Date.now() + 72 * 3600000).toISOString(),
      created: body.created || new Date().toISOString(),
      used: false,
      active: true,
      revoked: false,
      isTrial: body.isTrial || false,
      lastUsed: null,
    };

    // Prevent duplicates
    if (g._codes.some(c => c.code === newCode.code)) {
      return NextResponse.json({ error: "Code deja existant" }, { status: 409, headers: cors });
    }

    g._codes.push(newCode);
    return NextResponse.json({ success: true, code: newCode }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/codes] POST error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// PUT /api/codes — update a code (pause, reactivate, revoke, renew)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const target = (body.code || "").toUpperCase();
    const idx = g._codes.findIndex(c => c.code.toUpperCase() === target);
    if (idx === -1) return NextResponse.json({ error: "Code introuvable" }, { status: 404, headers: cors });

    if (body.action === "pause") {
      g._codes[idx].active = false;
    } else if (body.action === "reactivate") {
      g._codes[idx].active = true;
      g._codes[idx].revoked = false;
    } else if (body.action === "revoke") {
      g._codes[idx].active = false;
      g._codes[idx].revoked = true;
    } else if (body.action === "renew") {
      const base = new Date(g._codes[idx].expiresAt).getTime() > Date.now()
        ? new Date(g._codes[idx].expiresAt).getTime()
        : Date.now();
      g._codes[idx].expiresAt = new Date(base + (body.hours || 72) * 3600000).toISOString();
      g._codes[idx].active = true;
      g._codes[idx].revoked = false;
    } else if (body.updates) {
      // Generic partial update
      Object.assign(g._codes[idx], body.updates);
    }

    return NextResponse.json({ success: true, code: g._codes[idx] }, { headers: cors });
  } catch (err) {
    console.error("[API/codes] PUT error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// DELETE /api/codes?code=YUM-2026-XXXX — delete a code
export async function DELETE(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code) return NextResponse.json({ error: "Code requis" }, { status: 400, headers: cors });

  const before = g._codes.length;
  g._codes = g._codes.filter(c => c.code.toUpperCase() !== code);
  if (g._codes.length === before) return NextResponse.json({ error: "Code introuvable" }, { status: 404, headers: cors });

  return NextResponse.json({ success: true }, { headers: cors });
}
