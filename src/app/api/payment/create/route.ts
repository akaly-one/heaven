import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getProvider } from "@/shared/payment/registry";
import type { CreatePaymentInput, PaymentProviderId } from "@/shared/payment/types";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   POST /api/payment/create
   Entry point unifié V1+V2 pour tous providers.
   Body : { providerId, packId, packSlug, amount, model, clientPseudo, clientId?, breakdown? }
   BRIEF-16 — T16-A2 (manual), T16-C2 (paypal/revolut via registry futur)
   ══════════════════════════════════════════════ */

const VALID_PROVIDERS: readonly PaymentProviderId[] = ["paypal", "revolut", "stripe", "manual"];

interface CreatePaymentBody {
  providerId: PaymentProviderId;
  packId: string;
  packSlug: string;
  amount: number;          // centimes
  currency?: "EUR";
  model: string;
  clientPseudo: string;
  clientId?: string;
  breakdown?: unknown;
  metadata?: Record<string, string>;
}

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

function isPaymentProviderId(v: unknown): v is PaymentProviderId {
  return typeof v === "string" && (VALID_PROVIDERS as readonly string[]).includes(v);
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = (await req.json().catch(() => null)) as CreatePaymentBody | null;
    if (!body) {
      return NextResponse.json({ error: "Body JSON invalide" }, { status: 400, headers: cors });
    }

    const {
      providerId,
      packId,
      packSlug,
      amount,
      currency,
      model,
      clientPseudo,
      clientId,
      breakdown,
      metadata,
    } = body;

    // ── Validation ──
    if (!isPaymentProviderId(providerId)) {
      return NextResponse.json(
        { error: `providerId invalide — valeurs autorisées: ${VALID_PROVIDERS.join(", ")}` },
        { status: 400, headers: cors },
      );
    }
    if (!isValidModelSlug(model)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    }
    if (!packId || typeof packId !== "string") {
      return NextResponse.json({ error: "packId requis" }, { status: 400, headers: cors });
    }
    if (!packSlug || typeof packSlug !== "string") {
      return NextResponse.json({ error: "packSlug requis" }, { status: 400, headers: cors });
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount (centimes) > 0 requis" }, { status: 400, headers: cors });
    }
    if (!clientPseudo || typeof clientPseudo !== "string" || !clientPseudo.trim()) {
      return NextResponse.json({ error: "clientPseudo requis" }, { status: 400, headers: cors });
    }

    // ── Build provider input ──
    const input: CreatePaymentInput = {
      amount,
      currency: currency || "EUR",
      packId,
      packSlug,
      model,
      clientPseudo: clientPseudo.trim(),
      clientId,
      breakdown,
      metadata,
    };

    // ── Dispatch provider ──
    let provider;
    try {
      provider = getProvider(providerId);
    } catch (err) {
      console.error("[API/payment/create] provider not registered:", providerId, err);
      return NextResponse.json(
        { error: `Provider "${providerId}" non disponible` },
        { status: 503, headers: cors },
      );
    }

    const result = await provider.createPayment(input);

    return NextResponse.json(
      {
        redirectUrl: result.redirectUrl,
        referenceCode: result.referenceCode,
        pendingPaymentId: result.pendingPaymentId,
        providerPaymentId: result.providerPaymentId,
      },
      { headers: cors },
    );
  } catch (err) {
    console.error("[API/payment/create] POST:", err);
    const e = err as { code?: string; status?: number; message?: string };
    if (e?.code === "DUPLICATE_REFERENCE") {
      return NextResponse.json(
        { error: "Référence déjà utilisée — réessayer" },
        { status: 409, headers: cors },
      );
    }
    const msg = typeof e?.message === "string" ? e.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500, headers: cors });
  }
}
