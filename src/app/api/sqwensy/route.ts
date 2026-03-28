import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/sqwensy — Bridge / Tunnel to SQWENSY OS
   Enables SQWENSY Agence module to pull Heaven data
   and push data back (client referrals, goals, etc.)
   ══════════════════════════════════════════════ */

const SQWENSY_OS_URL =
  process.env.SQWENSY_OS_API_URL || "https://sqwensy.com";
const TUNNEL_KEY = process.env.SQWENSY_TUNNEL_KEY || "";

const cors = getCorsHeaders();

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

function validateTunnelKey(request: NextRequest): boolean {
  const key = request.headers.get("x-api-key");
  return !!TUNNEL_KEY && key === TUNNEL_KEY;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

// ── GET: SQWENSY OS pulls aggregated Heaven data ──
export async function GET(request: NextRequest) {
  if (!validateTunnelKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: cors }
    );
  }

  try {
    const supabase = requireSupabase();

    // Fetch all models' platform accounts
    const { data: platformAccounts, error: paErr } = await supabase
      .from("agence_platform_accounts")
      .select("*")
      .eq("status", "active");

    if (paErr) {
      console.error("[API/sqwensy] platforms error:", paErr);
      return NextResponse.json(
        { error: "Database error", detail: paErr.message },
        { status: 502, headers: cors }
      );
    }

    // Fetch content pipeline counts per model
    const { data: contentItems, error: ciErr } = await supabase
      .from("agence_content_pipeline")
      .select("model_slug, stage, revenue");

    if (ciErr) {
      console.error("[API/sqwensy] content error:", ciErr);
      return NextResponse.json(
        { error: "Database error", detail: ciErr.message },
        { status: 502, headers: cors }
      );
    }

    // Fetch active fans per model
    const { data: fans, error: fErr } = await supabase
      .from("agence_fan_lifecycle")
      .select("model_slug, stage, total_spent");

    if (fErr) {
      console.error("[API/sqwensy] fans error:", fErr);
      return NextResponse.json(
        { error: "Database error", detail: fErr.message },
        { status: 502, headers: cors }
      );
    }

    // Fetch active goals
    const { data: goals, error: gErr } = await supabase
      .from("agence_goals")
      .select("*")
      .eq("status", "active");

    if (gErr) {
      console.error("[API/sqwensy] goals error:", gErr);
      return NextResponse.json(
        { error: "Database error", detail: gErr.message },
        { status: 502, headers: cors }
      );
    }

    // Aggregate by model
    const modelSlugs = [
      ...new Set([
        ...(platformAccounts || []).map((a) => a.model_slug),
        ...(contentItems || []).map((c) => c.model_slug),
        ...(fans || []).map((f) => f.model_slug),
      ]),
    ];

    const models = modelSlugs.map((slug) => {
      const accounts = (platformAccounts || []).filter(
        (a) => a.model_slug === slug
      );
      const content = (contentItems || []).filter(
        (c) => c.model_slug === slug
      );
      const modelFans = (fans || []).filter((f) => f.model_slug === slug);
      const modelGoals = (goals || []).filter((g) => g.model_slug === slug);

      const totalSubscribers = accounts.reduce(
        (sum, a) => sum + (a.subscribers_count || 0),
        0
      );
      const totalMonthlyRevenue = accounts.reduce(
        (sum, a) => sum + parseFloat(a.monthly_revenue || "0"),
        0
      );
      const contentRevenue = content.reduce(
        (sum, c) => sum + parseFloat(c.revenue || "0"),
        0
      );
      const publishedCount = content.filter(
        (c) => c.stage === "published"
      ).length;
      const activeFans = modelFans.filter(
        (f) => f.stage !== "churned"
      ).length;
      const fanRevenue = modelFans.reduce(
        (sum, f) => sum + parseFloat(f.total_spent || "0"),
        0
      );

      return {
        slug,
        platform_accounts: accounts.map((a) => ({
          platform: a.platform,
          handle: a.handle,
          subscribers: a.subscribers_count,
          revenue: parseFloat(a.monthly_revenue || "0"),
        })),
        total_subscribers: totalSubscribers,
        monthly_revenue: totalMonthlyRevenue,
        content_total: content.length,
        content_published: publishedCount,
        content_revenue: contentRevenue,
        active_fans: activeFans,
        fan_revenue: fanRevenue,
        active_goals: modelGoals.length,
      };
    });

    return NextResponse.json(
      {
        source: "heaven-os",
        synced_at: new Date().toISOString(),
        sqwensy_os_url: SQWENSY_OS_URL,
        models,
      },
      { headers: cors }
    );
  } catch (err) {
    console.error("[API/sqwensy] GET:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}

// ── POST: SQWENSY OS pushes data to Heaven ──
export async function POST(request: NextRequest) {
  if (!validateTunnelKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: cors }
    );
  }

  try {
    const body = await request.json();
    const action = body.action as string;
    const supabase = requireSupabase();

    switch (action) {
      case "sync_client": {
        // Create or update a client from SQWENSY referral
        const clientData = {
          model: body.model_slug,
          pseudo_snap: body.pseudo_snap || null,
          pseudo_insta: body.pseudo_insta || null,
          firstname: body.firstname || null,
          tier: body.tier || null,
          notes: body.notes || "Referred from SQWENSY OS",
          last_active: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("agence_clients")
          .insert(clientData)
          .select()
          .single();

        if (error) {
          console.error("[API/sqwensy] sync_client error:", error);
          return NextResponse.json(
            { error: "Database error", detail: error.message },
            { status: 502, headers: cors }
          );
        }

        return NextResponse.json(
          { success: true, client: data },
          { status: 201, headers: cors }
        );
      }

      case "update_goal": {
        // Update a goal's progress from SQWENSY OS
        if (!body.goal_id) {
          return NextResponse.json(
            { error: "goal_id is required" },
            { status: 400, headers: cors }
          );
        }

        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (body.current_value !== undefined)
          updates.current_value = body.current_value;
        if (body.status) updates.status = body.status;

        const { data, error } = await supabase
          .from("agence_goals")
          .update(updates)
          .eq("id", body.goal_id)
          .select()
          .single();

        if (error) {
          console.error("[API/sqwensy] update_goal error:", error);
          return NextResponse.json(
            { error: "Database error", detail: error.message },
            { status: 502, headers: cors }
          );
        }

        return NextResponse.json(
          { success: true, goal: data },
          { headers: cors }
        );
      }

      case "sync_to_sqwensy": {
        // Push Heaven aggregate data to SQWENSY OS /api/sync/heaven
        const syncSecret = process.env.HEAVEN_SYNC_SECRET || "heaven-sync-2026";
        const sqwensyUrl = `${SQWENSY_OS_URL}/api/sync/heaven`;

        // Gather data
        const { data: allCodes } = await supabase.from("access_codes").select("*");
        const { data: allClients } = await supabase.from("agence_clients").select("*");
        const { data: allPlatforms } = await supabase.from("agence_platform_accounts").select("*").eq("status", "active");
        const { data: allContent } = await supabase.from("agence_content_pipeline").select("model_slug, stage, revenue");

        const summary = {
          codes_total: allCodes?.length || 0,
          codes_active: allCodes?.filter((c: { active?: boolean; revoked?: boolean }) => c.active && !c.revoked).length || 0,
          clients_total: allClients?.length || 0,
          platforms_active: allPlatforms?.length || 0,
          content_total: allContent?.length || 0,
          content_published: allContent?.filter((c: { stage?: string }) => c.stage === "published").length || 0,
          revenue_total: allPlatforms?.reduce((s: number, a: { monthly_revenue?: string }) => s + parseFloat(a.monthly_revenue || "0"), 0) || 0,
          synced_at: new Date().toISOString(),
        };

        try {
          const res = await fetch(sqwensyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-sync-secret": syncSecret },
            body: JSON.stringify({ type: "summary", model_slug: body.model_slug || null, data: summary }),
          });
          const result = await res.json();
          return NextResponse.json({ success: true, sqwensy_response: result }, { headers: cors });
        } catch (syncErr) {
          console.error("[API/sqwensy] sync_to_sqwensy error:", syncErr);
          return NextResponse.json({ error: "Failed to reach SQWENSY OS", detail: String(syncErr) }, { status: 502, headers: cors });
        }
      }

      case "register_packs": {
        // Register Heaven packs as shop items on SQWENSY OS
        // Returns secret link URLs for each pack
        const modelSlug = body.model_slug;
        if (!isValidModelSlug(modelSlug)) {
          return NextResponse.json({ error: "model_slug requis" }, { status: 400, headers: cors });
        }
        const packsList = body.packs as Array<{
          id: string; name: string; price: number; code: string;
        }>;

        if (!Array.isArray(packsList) || packsList.length === 0) {
          return NextResponse.json(
            { error: "packs array required" },
            { status: 400, headers: cors }
          );
        }

        const osBaseUrl = SQWENSY_OS_URL;
        const results: Array<{ packId: string; code: string; shopItemId?: string; linkUrl?: string; error?: string }> = [];

        for (const pack of packsList) {
          try {
            // 1. Create shop item on OS
            const itemRes = await fetch(`${osBaseUrl}/api/shop/items`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-api-key": TUNNEL_KEY },
              body: JSON.stringify({
                branch: "agence",
                internalName: `${modelSlug.toUpperCase()} ${pack.name} (${pack.code})`,
                price: pack.price,
                description: `Heaven Agence — ${pack.name}`,
                profileId: modelSlug,
                packTier: pack.id,
                generatesAccessCode: true,
                accessDurationDays: 30,
              }),
            });
            const item = await itemRes.json();

            if (!item?.id) {
              results.push({ packId: pack.id, code: pack.code, error: item?.error || "Failed to create shop item" });
              continue;
            }

            // 2. Generate secret link
            const linkRes = await fetch(`${osBaseUrl}/api/shop/links`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-api-key": TUNNEL_KEY },
              body: JSON.stringify({
                shopItemId: item.id,
                profileId: modelSlug,
              }),
            });
            const link = await linkRes.json();

            results.push({
              packId: pack.id,
              code: pack.code,
              shopItemId: item.id,
              linkUrl: link?.url || null,
            });
          } catch (err) {
            results.push({ packId: pack.id, code: pack.code, error: String(err) });
          }
        }

        // 3. Save stripe_link back to Heaven packs
        for (const r of results) {
          if (r.linkUrl) {
            await supabase
              .from("agence_packs")
              .update({ stripe_link: r.linkUrl })
              .eq("model", modelSlug)
              .eq("pack_id", r.packId);
          }
        }

        return NextResponse.json({ success: true, results }, { headers: cors });
      }

      case "push_notification": {
        // Log a notification from SQWENSY OS (store in content pipeline as note)
        const notePayload = {
          model_slug: body.model_slug,
          title: body.title || "SQWENSY Notification",
          content_type: "custom",
          platforms: [],
          stage: "idea",
          notes: body.message || body.content || "",
        };

        const { data, error } = await supabase
          .from("agence_content_pipeline")
          .insert(notePayload)
          .select()
          .single();

        if (error) {
          console.error("[API/sqwensy] push_notification error:", error);
          return NextResponse.json(
            { error: "Database error", detail: error.message },
            { status: 502, headers: cors }
          );
        }

        return NextResponse.json(
          { success: true, item: data },
          { status: 201, headers: cors }
        );
      }

      default:
        return NextResponse.json(
          {
            error: "Unknown action",
            valid_actions: [
              "sync_client",
              "update_goal",
              "register_packs",
              "push_notification",
              "sync_to_sqwensy",
            ],
          },
          { status: 400, headers: cors }
        );
    }
  } catch (err) {
    console.error("[API/sqwensy] POST:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}
