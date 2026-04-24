/**
 * BRIEF-10 TICKET-AG05 — POST /api/age-gate/decline
 *
 * Déclenché quand un fan clique "Je suis mineur" dans l'AgeGateModal.
 * Side-effects :
 *  1. INSERT agence_age_gate_events avec event_type='declared_minor' (trace légale)
 *  2. Retourne l'URL de redirect IG (géré côté client avec window.location)
 *
 * Note : on ne touche PAS le row agence_clients (pas de update access_level).
 * Le fan peut revenir plus tard s'il ment sur son âge — mais on a la trace
 * horodatée de sa déclaration initiale en cas de litige.
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

const REDIRECT_URL = "https://instagram.com/yumiiiclub";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

interface DeclineBody {
  client_id?: string;
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body: DeclineBody = await req.json().catch(() => ({}));
    const clientId =
      typeof body.client_id === "string" && body.client_id.trim() !== ""
        ? body.client_id.trim()
        : null;

    const supabase = getServerSupabase();
    if (supabase) {
      const ip = getClientIp(req);
      const ua = getUserAgent(req);
      const ipHash = hashIpSubnet(ip);
      const uaHash = hashUserAgent(ua);

      await supabase.from("agence_age_gate_events").insert({
        client_id: clientId,
        event_type: "declared_minor",
        ip_hash: ipHash,
        ua_hash: uaHash,
        actor: "fan",
      });
    }

    return NextResponse.json(
      { ok: true, redirect: REDIRECT_URL },
      { headers: cors }
    );
  } catch (err) {
    console.error("[API/age-gate/decline] error:", err);
    // Même en erreur, on retourne le redirect (pas de chocolat pour l'UX)
    return NextResponse.json(
      { ok: true, redirect: REDIRECT_URL },
      { headers: cors }
    );
  }
}
