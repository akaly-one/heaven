import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

/**
 * Instagram post comments (read + reply).
 *
 * GET  /api/instagram/comments?media_id=XXX&model=m1
 *   → list comments on a post.
 *
 * POST /api/instagram/comments
 *   Body : { comment_id: string, text: string, model?: string }
 *   → post a reply to an existing comment.
 */

async function resolveToken(
  req: NextRequest,
  allowBodyModel: string | null
): Promise<
  | { ok: true; token: string; ig_business_id: string }
  | { ok: false; status: number; error: string }
> {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const db = getServerSupabase();
  if (!db) return { ok: false, status: 500, error: "DB not configured" };

  const queryModel = req.nextUrl.searchParams.get("model");
  const userSlug = String(user.sub || "").toLowerCase();
  // Root: user.sub="root" n'est pas un slug de modèle valide → fallback direct yumi (m1).
  const modelId =
    user.role === "root"
      ? toModelId(queryModel || allowBodyModel || "yumi")
      : toModelId(userSlug);

  if (
    user.role === "model" &&
    ((queryModel && toModelId(queryModel) !== modelId) ||
      (allowBodyModel && toModelId(allowBodyModel) !== modelId))
  ) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const { data: config } = await db
    .from("instagram_config")
    .select("ig_business_id, page_access_token")
    .eq("model_slug", modelId)
    .maybeSingle();
  if (!config?.page_access_token || !config.ig_business_id) {
    return { ok: false, status: 404, error: "Instagram not configured" };
  }
  return { ok: true, token: config.page_access_token, ig_business_id: config.ig_business_id };
}

export async function GET(req: NextRequest) {
  const mediaId = req.nextUrl.searchParams.get("media_id");
  if (!mediaId) {
    return NextResponse.json({ error: "Missing media_id" }, { status: 400 });
  }

  const auth = await resolveToken(req, null);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url =
    `https://graph.facebook.com/v19.0/${encodeURIComponent(mediaId)}/comments` +
    `?fields=id,text,username,timestamp,replies{text,username,timestamp}` +
    `&access_token=${encodeURIComponent(auth.token)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "Graph API error" }, { status: 502 });
  }
  const data = await res.json();
  return NextResponse.json({ comments: data.data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const commentId: string | undefined = body.comment_id;
  const text: string | undefined = typeof body.text === "string" ? body.text.trim() : undefined;
  const bodyModel: string | null = body.model ?? null;

  if (!commentId || !text) {
    return NextResponse.json({ error: "Missing comment_id or text" }, { status: 400 });
  }

  const auth = await resolveToken(req, bodyModel);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(commentId)}/replies`;
  const form = new URLSearchParams({ message: text, access_token: auth.token });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Graph API error" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({ ok: true, id: data.id });
}
