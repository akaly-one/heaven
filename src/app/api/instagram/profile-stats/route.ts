import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

/**
 * Live Instagram profile stats via Meta Graph API.
 *
 * GET /api/instagram/profile-stats?model=m1
 *   Returns : { username, followers_count, follows_count, media_count, profile_picture_url }
 *
 * Cache : 60 seconds.
 * Token : from instagram_config.page_access_token (never exposed).
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const params = req.nextUrl.searchParams;
  const userSlug = String(user.sub || "").toLowerCase();
  const modelId =
    user.role === "root"
      ? toModelId(params.get("model") || userSlug || "yumi")
      : toModelId(userSlug);

  if (user.role === "model" && params.get("model") && toModelId(params.get("model")!) !== modelId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: config } = await db
    .from("instagram_config")
    .select("ig_business_id, page_access_token")
    .eq("model_slug", modelId)
    .maybeSingle();

  if (!config?.ig_business_id || !config.page_access_token) {
    return NextResponse.json({ error: "Instagram not configured for this model" }, { status: 404 });
  }

  const url =
    `https://graph.facebook.com/v19.0/${config.ig_business_id}` +
    `?fields=username,followers_count,follows_count,media_count,profile_picture_url` +
    `&access_token=${encodeURIComponent(config.page_access_token)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "Graph API error" }, { status: 502 });
  }

  const data = await res.json();
  const payload = {
    username: data.username,
    followers_count: data.followers_count,
    follows_count: data.follows_count,
    media_count: data.media_count,
    profile_picture_url: data.profile_picture_url,
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
