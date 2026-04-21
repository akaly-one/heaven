// ══════════════════════════════════════════════════════════════════════════
//  POST /api/posts/[id]/publish-ig
//
//  Cross-post an existing `agence_posts` row to Instagram Business.
//
//  Guardrails:
//    - model_id must match the post's model and caller's scope.
//    - Only models with an active `instagram_config` row are allowed.
//    - Post must have a `media_url` (IG refuses text-only posts).
//    - Idempotent: look up the matching `agence_feed_items` mirror
//      (source_type=manual, external_id=post.id); if source_payload.ig
//      already has an ig_media_id, we short-circuit.
//
//  Persistence of IG metadata:
//    agence_posts has no jsonb column to store the IG publish state, so we
//    mirror the manual post into agence_feed_items (upsert) and stash the
//    creation_id / ig_media_id / timestamp inside source_payload.ig. A DB
//    migration to add `agence_posts.meta jsonb` is a separate concern and
//    is not part of Agent 5.C scope.
//
//  DevMode: when App Review is still pending, Graph returns error #200.
//  We surface `devMode: true` in the response and keep HTTP 200 so the UI
//  can toast gracefully rather than treat it as a server failure.
// ══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";
import { toModelId } from "@/lib/model-utils";
import {
  publishToInstagram,
  InstagramPublishError,
} from "@/lib/instagram-publish";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

type PostRow = {
  id: string;
  model: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const cors = getCorsHeaders(req);
  const { id } = await ctx.params;

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    }

    const db = getServerSupabase();
    if (!db) {
      return NextResponse.json({ error: "DB unavailable" }, { status: 502, headers: cors });
    }

    // ── Fetch the post ────────────────────────────────────────────────────
    const { data: postRaw, error: postErr } = await db
      .from("agence_posts")
      .select("id, model, content, media_url, media_type")
      .eq("id", id)
      .maybeSingle();

    if (postErr || !postRaw) {
      return NextResponse.json(
        { error: "post not found", detail: postErr?.message },
        { status: 404, headers: cors }
      );
    }
    const post = postRaw as PostRow;
    const modelId = toModelId(post.model);

    // ── Scope check ───────────────────────────────────────────────────────
    if (user.role === "model" && toModelId(user.sub) !== modelId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403, headers: cors }
      );
    }

    // ── Idempotency (stored on agence_feed_items.source_payload) ──────────
    // agence_posts has no jsonb meta column — we record IG publish state on
    // the linked agence_feed_items row instead. Look up the mirror; if
    // source_payload.ig.media_id is already set, short-circuit.
    const { data: existingFeedRow } = await db
      .from("agence_feed_items")
      .select("id, source_payload")
      .eq("model", modelId)
      .eq("source_type", "manual")
      .eq("external_id", post.id)
      .maybeSingle();

    const existingPayload =
      (existingFeedRow?.source_payload as Record<string, unknown>) || {};
    const existingIg = existingPayload.ig as
      | { ig_media_id?: string; media_id?: string }
      | undefined;
    const alreadyPublishedId = existingIg?.ig_media_id || existingIg?.media_id;
    if (alreadyPublishedId) {
      return NextResponse.json(
        {
          ok: true,
          already_published: true,
          ig_media_id: alreadyPublishedId,
        },
        { headers: cors }
      );
    }

    // ── Require media ─────────────────────────────────────────────────────
    if (!post.media_url) {
      return NextResponse.json(
        { error: "post has no media_url (IG requires an image or video)" },
        { status: 400, headers: cors }
      );
    }

    // ── Load IG config for this model ─────────────────────────────────────
    const { data: cfg, error: cfgErr } = await db
      .from("instagram_config")
      .select("model_slug, ig_business_id, page_access_token, is_active")
      .or(`model_slug.eq.${modelId}`)
      .maybeSingle();

    if (cfgErr || !cfg) {
      return NextResponse.json(
        { error: `No instagram_config for ${modelId}`, detail: cfgErr?.message },
        { status: 404, headers: cors }
      );
    }
    if (!cfg.is_active) {
      return NextResponse.json(
        { error: `Instagram disabled for ${modelId}` },
        { status: 403, headers: cors }
      );
    }
    if (!cfg.ig_business_id || !cfg.page_access_token) {
      return NextResponse.json(
        { error: "instagram_config incomplete (missing ig_business_id or token)" },
        { status: 500, headers: cors }
      );
    }

    // ── Determine media kind (video vs image) ─────────────────────────────
    const isVideo =
      post.media_type === "video" ||
      post.media_type === "reels" ||
      /\.(mp4|mov)$/i.test(post.media_url);

    // ── Publish ───────────────────────────────────────────────────────────
    try {
      const result = await publishToInstagram({
        igBusinessAccountId: cfg.ig_business_id as string,
        accessToken: cfg.page_access_token as string,
        imageUrl: isVideo ? "" : post.media_url,
        videoUrl: isVideo ? post.media_url : undefined,
        caption: post.content || "",
        mediaType: isVideo ? "REELS" : "IMAGE",
      });

      const publishedAt = new Date().toISOString();

      // ── Persist IG metadata on the linked agence_feed_items row ─────────
      // The manual post is mirrored into agence_feed_items (source_type=manual,
      // external_id=post.id). That row has a `source_payload` jsonb we use to
      // store the IG creation_id, media_id and timestamp. agence_posts does
      // not currently have a jsonb column — migration is out of Agent 5.C scope.
      const igMeta = {
        creation_id: result.creation_id,
        ig_media_id: result.media_id ?? null,
        published_at: publishedAt,
        pending_processing: !result.media_id,
      };

      if (existingFeedRow) {
        await db
          .from("agence_feed_items")
          .update({
            source_payload: { ...existingPayload, ig: igMeta },
          })
          .eq("id", existingFeedRow.id);
      } else {
        // No manual mirror exists yet — best-effort upsert so the IG badge
        // shows up in the unified feed. If this fails (e.g. unique index
        // mismatch), we swallow the error to keep the publish flow resilient.
        const { error: upErr } = await db.from("agence_feed_items").upsert(
          {
            model: modelId,
            source_type: "manual",
            external_id: post.id,
            media_url: post.media_url,
            media_type: post.media_type,
            caption: post.content,
            posted_at: publishedAt,
            synced_at: publishedAt,
            source_payload: { ig: igMeta },
          },
          { onConflict: "model,source_type,external_id" }
        );
        if (upErr) {
          console.warn("[publish-ig] feed mirror upsert failed:", upErr.message);
        }
      }

      return NextResponse.json(
        {
          ok: true,
          creation_id: result.creation_id,
          ig_media_id: result.media_id ?? null,
          pending_processing: !result.media_id,
        },
        { headers: cors }
      );
    } catch (err) {
      if (err instanceof InstagramPublishError && err.devModeLikely) {
        // Not a real failure — surface it gracefully for DevMode workflow.
        return NextResponse.json(
          {
            ok: false,
            devMode: true,
            error: "IG publish requires App Review or tester account",
            graph_message: err.message,
            phase: err.phase,
          },
          { status: 200, headers: cors }
        );
      }
      throw err;
    }
  } catch (err) {
    console.error("[API/posts/:id/publish-ig] POST:", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: `publish-ig failed: ${msg}` },
      { status: 500, headers: cors }
    );
  }
}
