/**
 * BRIEF-10 TICKET-AG05 — POST /api/age-gate/certify
 *
 * Déclenché quand un fan coche "Je certifie avoir 18 ans" dans l'AgeGateModal.
 * Side-effects :
 *  1. UPDATE agence_clients SET age_certified=true, age_certified_at=NOW(),
 *     age_certified_ip_hash=X, access_level='major_visitor' (si encore anonymous)
 *  2. INSERT agence_age_gate_events (audit RGPD)
 *
 * Pas de vérif auth — c'est une route publique (le fan n'est pas loggué).
 * La vérif se fait sur client_id fourni (doit exister en DB).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";
import {
  getClientIp,
  getUserAgent,
  hashIpSubnet,
  hashUserAgent,
} from "@/lib/verification/crypto";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

interface CertifyBody {
  client_id?: string;
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body: CertifyBody = await req.json().catch(() => ({}));
    const clientId =
      typeof body.client_id === "string" && body.client_id.trim() !== ""
        ? body.client_id.trim()
        : null;

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "DB non configurée" },
        { status: 500, headers: cors }
      );
    }

    const ip = getClientIp(req);
    const ua = getUserAgent(req);
    const ipHash = hashIpSubnet(ip);
    const uaHash = hashUserAgent(ua);

    // 1. Si client_id fourni, update en DB
    if (clientId) {
      const { data: existing } = await supabase
        .from("agence_clients")
        .select("id, age_certified, access_level")
        .eq("id", clientId)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json(
          { error: "client_id invalide" },
          { status: 400, headers: cors }
        );
      }

      // Ne pas écraser age_certified=true déjà en DB (idempotent)
      if (!existing.age_certified) {
        const newAccessLevel =
          existing.access_level === "anonymous" || !existing.access_level
            ? "major_visitor"
            : existing.access_level;
        await supabase
          .from("agence_clients")
          .update({
            age_certified: true,
            age_certified_at: new Date().toISOString(),
            age_certified_ip_hash: ipHash,
            access_level: newAccessLevel,
          })
          .eq("id", clientId);
      }

      // 2. Toujours logger l'event (même si déjà certifié — trace audit)
      await supabase.from("agence_age_gate_events").insert({
        client_id: clientId,
        event_type: "certified",
        ip_hash: ipHash,
        ua_hash: uaHash,
        actor: "fan",
      });
    } else {
      // Pas de client_id — log event anonyme quand même (stats globales)
      await supabase.from("agence_age_gate_events").insert({
        client_id: null,
        event_type: "certified",
        ip_hash: ipHash,
        ua_hash: uaHash,
        actor: "fan",
      });
    }

    return NextResponse.json({ ok: true }, { headers: cors });
  } catch (err) {
    console.error("[API/age-gate/certify] error:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}
