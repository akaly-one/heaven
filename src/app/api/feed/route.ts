import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { toModelId } from "@/lib/model-utils";
import {
  computeFeedItemState,
  normalizePackVisibility,
  type PackVisibility,
  type FanContext,
} from "@/lib/pack-visibility";

export const runtime = "nodejs";

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/feed?model=yumi (or m1) [&fan_id=<uuid>]
//
// Public (no JWT) — unified feed aggregating manual posts, wall posts
// and Instagram syncs from agence_feed_items, ordered by pinned + posted_at.
//
// Agent 5.B Phase 5 B8:
// Enrichit chaque item avec `visibility_computed` (visible, blurred,
// blurIntensity, showPaywall) en appliquant les règles du pack associé.
// Les items sans pack_id sont traités comme 'public' (aucun flou).
// Les items complètement cachés (rule=if_purchased + fan non-acheteur)
// sont omis du payload.
// ═══════════════════════════════════════════════════════════════════════════

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

type FeedItemRow = Record<string, unknown> & {
  id: string;
  model: string;
  source_payload?: Record<string, unknown> | null;
};

type PackVisibilityRow = {
  pack_id: string;
  visibility_rule?: string | null;
  blur_intensity?: number | null;
  preview_count?: number | null;
};

export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  // Cloisonnement strict (règle NB 2026-04-21) : `?model=` obligatoire (slug ou
  // model_id). Fallback "yumi" retiré — masquait les bugs de scope inter-CP.
  const rawModel = req.nextUrl.searchParams.get("model");
  const fanId = req.nextUrl.searchParams.get("fan_id") || null;

  if (!rawModel) {
    return NextResponse.json(
      { error: "model parameter required (slug or model_id)", items: [] },
      { status: 400, headers: cors },
    );
  }

  if (!isValidModelSlug(rawModel)) {
    return NextResponse.json({ error: "invalid model" }, { status: 400, headers: cors });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 502, headers: cors });
  }

  // Resolve slug → model_id via DB (falls back to slugOrId if unknown model).
  let modelId = toModelId(rawModel);
  try {
    const { data: m } = await db
      .from("agence_models")
      .select("model_id")
      .or(`slug.eq.${rawModel},model_id.eq.${rawModel}`)
      .maybeSingle();
    if (m?.model_id) modelId = m.model_id as string;
  } catch {
    /* non-blocking — already have best-effort modelId from toModelId */
  }

  // Public-safe : surface the IG handle for CTAs on /m/{slug} (B9).
  // Only `ig_handle` is selected — tokens and internal ids stay server-side.
  let instagramHandle: string | null = null;
  let instagramActive = false;
  try {
    const { data: igCfg } = await db
      .from("instagram_config")
      .select("ig_handle, is_active")
      .eq("model_slug", modelId)
      .maybeSingle();
    if (igCfg?.ig_handle) {
      instagramHandle = String(igCfg.ig_handle).replace(/^@/, "");
      instagramActive = Boolean(igCfg.is_active);
    }
  } catch {
    /* non-blocking — CTAs will simply not render without a handle */
  }

  try {
    const { data, error } = await db
      .from("agence_feed_items")
      .select("*")
      .eq("model", modelId)
      .is("deleted_at", null)
      .order("pinned", { ascending: false })
      .order("posted_at", { ascending: false })
      .limit(50);

    if (error) {
      // Table may not exist yet (migration pending) — gracefully fallback.
      const msg = error.message || "";
      if (msg.includes("does not exist") || msg.includes("relation")) {
        return NextResponse.json(
          {
            items: [],
            fallback: "table_missing",
            instagram_handle: instagramHandle,
            instagram_active: instagramActive,
          },
          { headers: { ...cors, "Cache-Control": "public, max-age=30" } }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500, headers: cors });
    }

    const rows = (data || []) as FeedItemRow[];

    // Collect distinct pack_ids referenced by feed items.
    const packIds = new Set<string>();
    for (const row of rows) {
      const pid = extractPackId(row);
      if (pid) packIds.add(pid);
    }

    // Fetch visibility rules for all referenced packs (single round-trip).
    const visibilityByPack = new Map<string, PackVisibility>();
    if (packIds.size > 0) {
      const { data: packsData } = await db
        .from("agence_packs")
        .select("pack_id, visibility_rule, blur_intensity, preview_count")
        .eq("model", modelId)
        .in("pack_id", Array.from(packIds));

      for (const row of (packsData || []) as PackVisibilityRow[]) {
        visibilityByPack.set(row.pack_id, normalizePackVisibility(row));
      }
    }

    // Build fan context (purchased pack ids) if fan_id provided.
    const fan = await loadFanContext(db, fanId, modelId);

    // Enrich items with visibility_computed, filtering out fully hidden ones.
    const enriched = rows
      .map((row) => {
        const pid = extractPackId(row);
        const idx = extractItemIndex(row);
        const visibility = pid ? visibilityByPack.get(pid) : undefined;

        // No pack linked → treat as public (no blur, always visible).
        if (!pid || !visibility) {
          return {
            ...row,
            pack_id: pid,
            item_index_in_pack: idx,
            visibility_computed: {
              visible: true,
              blurred: false,
              blurIntensity: 0,
              showPaywall: false,
            },
          };
        }

        const computed = computeFeedItemState(pid, visibility, fan, idx);
        return {
          ...row,
          pack_id: pid,
          item_index_in_pack: idx,
          visibility_computed: computed,
        };
      })
      .filter((item) => item.visibility_computed.visible);

    return NextResponse.json(
      {
        items: enriched,
        model: modelId,
        fan_resolved: !!fan,
        instagram_handle: instagramHandle,
        instagram_active: instagramActive,
      },
      { headers: { ...cors, "Cache-Control": "public, max-age=60" } }
    );
  } catch (err) {
    console.error("[API/feed] GET:", err);
    return NextResponse.json({ items: [] }, { headers: cors });
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

function extractPackId(row: FeedItemRow): string | undefined {
  const payload = row.source_payload;
  if (payload && typeof payload === "object") {
    const pid = (payload as Record<string, unknown>).pack_id;
    if (typeof pid === "string" && pid.length > 0) return pid;
  }
  // Fallback: if the row has a top-level pack_id (future schema extension).
  const topLevel = (row as Record<string, unknown>).pack_id;
  if (typeof topLevel === "string" && topLevel.length > 0) return topLevel;
  return undefined;
}

function extractItemIndex(row: FeedItemRow): number {
  const payload = row.source_payload;
  if (payload && typeof payload === "object") {
    const idx = (payload as Record<string, unknown>).item_index_in_pack;
    if (typeof idx === "number" && Number.isFinite(idx)) return idx;
  }
  const topLevel = (row as Record<string, unknown>).item_index_in_pack;
  if (typeof topLevel === "number" && Number.isFinite(topLevel)) return topLevel;
  return 0;
}

async function loadFanContext(
  db: ReturnType<typeof getServerSupabase>,
  fanId: string | null,
  modelId: string
): Promise<FanContext | null> {
  if (!fanId || !db) return null;
  try {
    // Purchases are stored per upload; we resolve to pack_id via
    // source_payload.pack_id when available (convention) or treat upload_id
    // itself as pack_id fallback.
    const { data: purchases, error } = await db
      .from("agence_purchases")
      .select("upload_id")
      .eq("client_id", fanId)
      .eq("model", modelId);

    if (error || !purchases) return { id: fanId, purchasedPackIds: [] };

    const ids = Array.from(
      new Set(
        purchases
          .map((p: { upload_id?: string | null }) => p.upload_id)
          .filter((x): x is string => typeof x === "string" && x.length > 0)
      )
    );
    return { id: fanId, purchasedPackIds: ids };
  } catch {
    return { id: fanId, purchasedPackIds: [] };
  }
}
