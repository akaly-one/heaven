import { getServerSupabase } from "@/lib/supabase-server";

/* ══════════════════════════════════════════════
   Payment Utilities — shared across PayPal / Revolut
   ══════════════════════════════════════════════ */

// ── PayPal OAuth2 Access Token ──

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("[PayPal] PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET not set — using sandbox mode");
    throw new Error("PayPal credentials not configured");
  }

  const baseUrl = getPayPalBaseUrl();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[PayPal] Token error:", res.status, text);
    throw new Error(`PayPal auth failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// ── Base URLs ──

export function getPayPalBaseUrl(): string {
  return process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";
}

export function getRevolutBaseUrl(): string {
  return process.env.REVOLUT_API_URL || "https://sandbox-merchant.revolut.com/api";
}

// ── Access Code Generator ──
// Pattern: {MODEL}-{YEAR}-{4CHARS} (same as header.tsx)

export function generateAccessCode(model: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  const prefix = model.slice(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${r}`;
}

// ── Fulfill Payment ──
// Shared logic: generate code, insert DB, notify client, log payment

interface FulfillParams {
  model: string;
  tier: string;
  duration: number;       // hours (default 720 = 30 days)
  clientPseudo: string;
  clientPlatform: string;
  paymentId: string;      // PayPal order ID or Revolut payment ID
  paymentMethod: string;  // "paypal" | "revolut" | "manual"
  packId?: string;
  packName?: string;
  amount?: number;
  currency?: string;
}

interface FulfillResult {
  code: string;
  clientId: string | null;
}

export async function fulfillPayment(params: FulfillParams): Promise<FulfillResult> {
  const {
    model, tier, duration, clientPseudo, clientPlatform,
    paymentId, paymentMethod, packId, packName, amount, currency,
  } = params;

  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  // 1. Generate access code
  const code = generateAccessCode(model);

  // 2. Determine expiry
  const expiresAt = new Date(Date.now() + duration * 3600000).toISOString();

  // 3. Find or create client
  let clientId: string | null = null;
  const normalizedPseudo = clientPseudo.trim().toLowerCase();

  if (normalizedPseudo) {
    const primaryField = clientPlatform === "instagram" ? "pseudo_insta" : "pseudo_snap";
    const secondaryField = clientPlatform === "instagram" ? "pseudo_snap" : "pseudo_insta";

    // Try primary field
    let { data: existingClient } = await supabase
      .from("agence_clients").select("id")
      .eq("model", model).ilike(primaryField, normalizedPseudo)
      .maybeSingle();

    // Fallback: secondary field
    if (!existingClient) {
      const { data: fallback } = await supabase
        .from("agence_clients").select("id")
        .eq("model", model).ilike(secondaryField, normalizedPseudo)
        .maybeSingle();
      existingClient = fallback;
    }

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      // Create new client
      const insertData: Record<string, unknown> = { model, last_active: new Date().toISOString() };
      insertData[primaryField] = normalizedPseudo;
      const { data: newClient } = await supabase
        .from("agence_clients").insert(insertData).select("id").single();
      if (newClient) clientId = newClient.id;
    }
  }

  // 4. Insert code into agence_codes
  const { error: codeErr } = await supabase.from("agence_codes").insert({
    code,
    model,
    client: normalizedPseudo,
    client_id: clientId,
    platform: clientPlatform,
    role: "client",
    tier,
    pack: packId || tier,
    type: "paid",
    duration,
    expires_at: expiresAt,
    is_trial: false,
  });

  if (codeErr) {
    console.error("[fulfillPayment] Code insert error:", codeErr);
    throw new Error("Failed to insert access code");
  }

  // 5. Send message to client if found
  if (clientId) {
    const messageContent = [
      `✅ Paiement confirmé ! Voici ton code d'accès : ${code}`,
      "",
      `Entre-le sur mon profil pour débloquer ton contenu. Le code est valable ${Math.round(duration / 24)} jours.`,
    ].join("\n");

    await supabase.from("agence_messages").insert({
      model,
      client_id: clientId,
      sender_type: "model",
      content: messageContent,
    }).then(({ error }) => {
      if (error) console.error("[fulfillPayment] Message insert error:", error);
    });
  }

  // 6. Log/update payment record
  await supabase.from("agence_pending_payments").upsert({
    payment_provider_id: paymentId,
    model,
    client_pseudo: normalizedPseudo,
    client_platform: clientPlatform,
    client_id: clientId,
    pack_id: packId || null,
    pack_name: packName || null,
    amount: amount || 0,
    currency: currency || "EUR",
    payment_method: paymentMethod,
    status: "completed",
    generated_code: code,
    code_sent: !!clientId,
    provider_response: { fulfilled_at: new Date().toISOString(), method: paymentMethod },
    completed_at: new Date().toISOString(),
  }, { onConflict: "payment_provider_id" }).then(({ error }) => {
    if (error) console.error("[fulfillPayment] Payment log error:", error);
  });

  return { code, clientId };
}
