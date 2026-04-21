import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

/**
 * Instagram config read + update.
 *
 * GET   /api/instagram/config?model=m1    → row with page_access_token MASKED ("***")
 * PATCH /api/instagram/config              → { system_prompt?, default_mode?, ai_model?,
 *                                              max_history?, is_active?, model? }
 *
 * Token never leaves the server in plaintext.
 */

const ALLOWED_PATCH_KEYS = new Set([
  "system_prompt",
  "default_mode",
  "ai_model",
  "max_history",
  "is_active",
]);

function resolveModelId(
  userRole: string,
  userSub: string,
  requested: string | null
): string {
  const slug = String(userSub || "").toLowerCase();
  if (userRole === "root") {
    return toModelId(requested || slug || "yumi");
  }
  return toModelId(slug);
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const requested = req.nextUrl.searchParams.get("model");
  const modelId = resolveModelId(user.role, String(user.sub || ""), requested);

  if (user.role === "model" && requested && toModelId(requested) !== modelId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: config, error } = await db
    .from("instagram_config")
    .select(
      "id, model_slug, ig_handle, ig_business_id, default_mode, ai_model, system_prompt, max_history, auto_reply_delay_ms, is_active, page_access_token, created_at, updated_at"
    )
    .eq("model_slug", modelId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
  if (!config) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mask token
  const masked = {
    ...config,
    page_access_token: config.page_access_token ? "***" : null,
    has_token: Boolean(config.page_access_token),
  };

  return NextResponse.json(masked);
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const requested = typeof body.model === "string" ? body.model : null;
  const modelId = resolveModelId(user.role, String(user.sub || ""), requested);

  if (user.role === "model" && requested && toModelId(requested) !== modelId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_PATCH_KEYS.has(k)) continue;
    if (k === "default_mode" && v !== "agent" && v !== "human") continue;
    if (k === "is_active" && typeof v !== "boolean") continue;
    if (k === "max_history" && typeof v !== "number") continue;
    if ((k === "system_prompt" || k === "ai_model") && typeof v !== "string") continue;
    updates[k] = v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid updates" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { error: updErr } = await db
    .from("instagram_config")
    .update(updates)
    .eq("model_slug", modelId);

  if (updErr) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, model: modelId, updated_keys: Object.keys(updates) });
}
