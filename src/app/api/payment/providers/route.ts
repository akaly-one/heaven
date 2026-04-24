/* ══════════════════════════════════════════════
   /api/payment/providers
   BRIEF-16 (2026-04-25) — Phase D (T16-D2)
   GET  ?model=mN     → liste providers + enabled status
   POST { model, providerId, enabled } → toggle (admin/root only)
   ══════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";
import {
  listProvidersForUi,
  toggleProvider,
  isPaymentProviderId,
} from "@/shared/payment/registry";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

/* ── GET /api/payment/providers?model=mN ── */
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const model = req.nextUrl.searchParams.get("model") || "";
    if (!isValidModelSlug(model)) {
      return NextResponse.json(
        { error: "model invalide (query param ?model=...)" },
        { status: 400, headers: cors },
      );
    }

    const providers = await listProvidersForUi(model);

    return NextResponse.json({ providers }, { headers: cors });
  } catch (err) {
    console.error("[API/payment/providers] GET error:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors },
    );
  }
}

/* ── POST /api/payment/providers ── */
interface TogglePayload {
  model?: unknown;
  providerId?: unknown;
  enabled?: unknown;
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);

  // ── Auth guard : admin (model) OU root ──
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json(
      { error: "Unauthorized — role admin/root requis" },
      { status: 401, headers: cors },
    );
  }

  try {
    const body = (await req.json().catch(() => null)) as TogglePayload | null;
    if (!body) {
      return NextResponse.json(
        { error: "Body JSON invalide" },
        { status: 400, headers: cors },
      );
    }

    const { model, providerId, enabled } = body;

    if (typeof model !== "string" || !isValidModelSlug(model)) {
      return NextResponse.json(
        { error: "model invalide" },
        { status: 400, headers: cors },
      );
    }
    if (!isPaymentProviderId(providerId)) {
      return NextResponse.json(
        { error: "providerId invalide" },
        { status: 400, headers: cors },
      );
    }
    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled (bool) requis" },
        { status: 400, headers: cors },
      );
    }

    // Guard scope : un "model" user ne peut modifier que son propre scope.
    // V1 : les toggles sont globaux (singleton id='global'), donc on autorise
    // seulement root à modifier. Les "model" (yumi admin) peuvent lire mais
    // pas écrire tant qu'on n'a pas de scoping par modèle.
    if (user.role !== "root") {
      return NextResponse.json(
        {
          error:
            "Seul un utilisateur root peut modifier les toggles globaux (V1 : scoping par modèle non implémenté)",
        },
        { status: 403, headers: cors },
      );
    }

    await toggleProvider(model, providerId, enabled, {
      userId: user.sub,
      role: user.role,
    });

    return NextResponse.json(
      { ok: true, providerId, enabled, model },
      { headers: cors },
    );
  } catch (err) {
    console.error("[API/payment/providers] POST error:", err);
    const msg =
      err instanceof Error ? err.message : "Erreur serveur";
    const status = msg.includes("Stripe cannot be enabled") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status, headers: cors });
  }
}
