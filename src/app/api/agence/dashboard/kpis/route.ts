import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

/**
 * Dashboard KPI aggregation — Phase 3 Agent 3.A (B9).
 *
 * GET /api/agence/dashboard/kpis?model_id=m1&period=30
 *
 * Auth :
 *   - root           → can query any model via ?model_id
 *   - model          → scoped to own model_id (403 if mismatched)
 *   - Permission `view_revenue_self` is implicit for both roles via the permission matrix.
 *
 * Returns :
 *   {
 *     revenus_total      : number   // EUR sum from agence_revenus_modele over the window
 *     revenus_count      : number   // row count (transactions)
 *     fans_actifs        : number   // distinct client_id having bought in the window
 *     conv_ppv_pct       : number   // % purchases per active fan over the window
 *     panier_moyen_ppv   : number   // avg price per PPV purchase
 *     ig_followers       : number | null
 *     ig_media           : number | null
 *     ig_username        : string | null
 *     ig_follows         : number | null
 *     last_sync_at       : string | null  // ops_metrics.sync_instagram_run_ms most-recent row
 *     period_days        : 1 | 7 | 30
 *     model_id           : string
 *   }
 *
 * Cache : private, max-age=30 (dashboard polls, no need for hot reads every second).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PERIODS = new Set([1, 7, 30]);

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
  const requestedModel = params.get("model_id") || params.get("model") || null;
  const userSlug = String(user.sub || "").toLowerCase();
  const modelId =
    user.role === "root"
      ? toModelId(requestedModel || userSlug || "yumi")
      : toModelId(userSlug);

  if (
    user.role === "model" &&
    requestedModel &&
    toModelId(requestedModel) !== modelId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const periodRaw = Number(params.get("period") || 30);
  const period = ALLOWED_PERIODS.has(periodRaw) ? periodRaw : 30;
  const sinceIso = new Date(Date.now() - period * 86400_000).toISOString();

  // ─── 1. Revenus 30/7/1j + compte + panier moyen ──────────────────────────
  // agence_revenus_modele is the canonical revenue log (cf. migration 041).
  let revenusTotal = 0;
  let revenusCount = 0;
  try {
    const { data: rows } = await db
      .from("agence_revenus_modele")
      .select("amount, currency, source_type, created_at")
      .eq("model_id", modelId)
      .gte("created_at", sinceIso);
    for (const r of (rows as Array<{ amount: number | string; source_type?: string | null }> | null) || []) {
      const n = typeof r.amount === "number" ? r.amount : Number(r.amount);
      if (Number.isFinite(n)) {
        revenusTotal += n;
        revenusCount += 1;
      }
    }
  } catch {
    // keep zeros — fail-open for dashboards
  }

  // ─── 2. PPV metrics from agence_purchases ────────────────────────────────
  // agence_purchases.model stores the slug/mN value (see credits/purchase route).
  // We count distinct client_ids + rows + sum(price) to derive conversion + basket.
  const ppvMatchers = [modelId];
  // Back-compat: some older rows may still carry the slug string.
  try {
    const { data: entityRow } = await db
      .from("agence_models")
      .select("slug")
      .eq("model_id", modelId)
      .maybeSingle();
    const legacySlug = (entityRow as { slug?: string | null } | null)?.slug;
    if (legacySlug && !ppvMatchers.includes(legacySlug)) ppvMatchers.push(legacySlug);
  } catch {
    /* ignore */
  }

  let ppvRows: Array<{ client_id: string | null; price: number | string | null }> = [];
  try {
    const { data } = await db
      .from("agence_purchases")
      .select("client_id, price, created_at")
      .in("model", ppvMatchers)
      .gte("created_at", sinceIso);
    ppvRows = (data as Array<{ client_id: string | null; price: number | string | null }> | null) || [];
  } catch {
    ppvRows = [];
  }

  const uniqueFans = new Set<string>();
  let ppvPriceTotal = 0;
  let ppvPaidCount = 0;
  for (const r of ppvRows) {
    if (r.client_id) uniqueFans.add(r.client_id);
    const p = typeof r.price === "number" ? r.price : Number(r.price || 0);
    if (Number.isFinite(p) && p > 0) {
      ppvPriceTotal += p;
      ppvPaidCount += 1;
    }
  }
  const fansActifs = uniqueFans.size;
  // conv_ppv_pct = purchases / unique_fans (rough proxy: "how intensely do active fans buy")
  const convPpv = fansActifs > 0 ? (ppvPaidCount / fansActifs) * 100 : 0;
  const panierMoyen = ppvPaidCount > 0 ? ppvPriceTotal / ppvPaidCount : 0;

  // ─── 3. Instagram snapshot (followers / media / handle) + last sync ──────
  let igFollowers: number | null = null;
  let igMedia: number | null = null;
  let igFollows: number | null = null;
  let igUsername: string | null = null;
  try {
    const { data: cfg } = await db
      .from("instagram_config")
      .select("ig_business_id, page_access_token, ig_handle")
      .eq("model_slug", modelId)
      .maybeSingle();

    const c = cfg as
      | { ig_business_id?: string | null; page_access_token?: string | null; ig_handle?: string | null }
      | null;

    if (c?.ig_handle) {
      igUsername = String(c.ig_handle).replace(/^@/, "");
    }

    if (c?.ig_business_id && c.page_access_token) {
      const url =
        `https://graph.facebook.com/v19.0/${encodeURIComponent(c.ig_business_id)}` +
        `?fields=username,followers_count,follows_count,media_count` +
        `&access_token=${encodeURIComponent(c.page_access_token)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const d = (await res.json()) as {
          username?: string;
          followers_count?: number;
          follows_count?: number;
          media_count?: number;
        };
        igFollowers = typeof d.followers_count === "number" ? d.followers_count : igFollowers;
        igFollows = typeof d.follows_count === "number" ? d.follows_count : igFollows;
        igMedia = typeof d.media_count === "number" ? d.media_count : igMedia;
        igUsername = d.username || igUsername;
      }
    }
  } catch {
    // leave IG fields null if Meta is offline
  }

  // last_sync_at — most recent ops_metrics row for the sync cron.
  let lastSyncAt: string | null = null;
  try {
    const { data: row } = await db
      .from("ops_metrics")
      .select("created_at")
      .eq("metric", "sync_instagram_run_ms")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lastSyncAt = (row as { created_at?: string | null } | null)?.created_at || null;
  } catch {
    /* leave null */
  }

  return NextResponse.json(
    {
      model_id: modelId,
      period_days: period,
      revenus_total: Math.round(revenusTotal * 100) / 100,
      revenus_count: revenusCount,
      fans_actifs: fansActifs,
      conv_ppv_pct: Math.round(convPpv * 10) / 10,
      panier_moyen_ppv: Math.round(panierMoyen * 100) / 100,
      ig_followers: igFollowers,
      ig_follows: igFollows,
      ig_media: igMedia,
      ig_username: igUsername,
      last_sync_at: lastSyncAt,
    },
    {
      headers: { "Cache-Control": "private, max-age=30" },
    },
  );
}
