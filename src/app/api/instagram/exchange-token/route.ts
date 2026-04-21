import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

/**
 * Exchange short-lived Page Access Token (1h) → long-lived (60 days).
 *
 * Requires META_APP_ID + META_APP_SECRET in env.
 * Call this once after login via Graph API Explorer to get the 60-day token.
 * After 60 days, call again (requires re-login in Meta dashboard if expired).
 *
 * POST /api/instagram/exchange-token
 *   Body (optional): { model_slug?: string, short_token?: string }
 *   - model_slug defaults to 'm1' (Yumi)
 *   - short_token defaults to the token currently stored in instagram_config
 *
 * Response: { ok: true, expires_in_seconds, expires_at_iso }
 */

const GRAPH_API_VERSION = "v19.0";

export async function POST(req: NextRequest) {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "META_APP_ID / META_APP_SECRET missing in env" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const modelSlug = (body.model_slug as string) || "m1";
  let shortToken = body.short_token as string | undefined;

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase unavailable" }, { status: 500 });
  }

  // If no token provided, read the current one from DB
  if (!shortToken) {
    const { data: cfg } = await supabase
      .from("instagram_config")
      .select("page_access_token")
      .eq("model_slug", modelSlug)
      .maybeSingle();
    if (!cfg?.page_access_token) {
      return NextResponse.json(
        { error: `No token stored for model_slug=${modelSlug}. Provide short_token in body or update DB first.` },
        { status: 400 }
      );
    }
    shortToken = cfg.page_access_token;
  }

  // Step 1 : short-lived → long-lived user token
  const longLivedUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`);
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", appId);
  longLivedUrl.searchParams.set("client_secret", appSecret);
  longLivedUrl.searchParams.set("fb_exchange_token", shortToken!);

  const res = await fetch(longLivedUrl.toString());
  const data = await res.json();

  if (!res.ok || !data.access_token) {
    return NextResponse.json(
      { error: "Exchange failed", details: data },
      { status: 500 }
    );
  }

  const longToken: string = data.access_token;
  const expiresIn: number | undefined = data.expires_in;
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  // Persist in DB (never log the token)
  const { error: updErr } = await supabase
    .from("instagram_config")
    .update({
      page_access_token: longToken,
      updated_at: new Date().toISOString(),
    })
    .eq("model_slug", modelSlug);

  if (updErr) {
    return NextResponse.json(
      { error: "Token exchanged but failed to persist in DB", details: updErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    model_slug: modelSlug,
    expires_in_seconds: expiresIn ?? null,
    expires_at_iso: expiresAt,
    token_length: longToken.length,
  });
}
