import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════════════════════
   /api/sqwensy — Bridge / Tunnel to SQWENSY OS
   Enables SQWENSY Agence module to pull Heaven data
   and push data back (client referrals, goals, etc.)

   GET ?scope=all|models|payments|revenue|system|cms|security
   POST actions: sync_client, update_goal, register_packs,
     push_notification, sync_to_sqwensy, manage_codes,
     toggle_payment_config
   ══════════════════════════════════════════════════════════════ */

const SQWENSY_OS_URL =
  process.env.SQWENSY_OS_API_URL || "https://sqwensy.com";
const TUNNEL_KEY = process.env.SQWENSY_TUNNEL_KEY || "";

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

function validateTunnelKey(request: NextRequest): boolean {
  const key = request.headers.get("x-api-key");
  return !!TUNNEL_KEY && key === TUNNEL_KEY;
}

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// ── Helper: safe count query ──
async function safeCount(supabase: ReturnType<typeof getServerSupabase>, table: string, filters?: Record<string, unknown>): Promise<number> {
  if (!supabase) return 0;
  try {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        q = q.eq(k, v);
      }
    }
    const { count } = await q;
    return count ?? 0;
  } catch { return 0; }
}

// ── GET: SQWENSY OS pulls aggregated Heaven data ──
// ?scope=all (default) | models | payments | revenue | system | cms | security
export async function GET(request: NextRequest) {
  const cors = getCorsHeaders(request);
  if (!validateTunnelKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: cors }
    );
  }

  try {
    const supabase = requireSupabase();
    const scope = request.nextUrl.searchParams.get("scope") || "all";
    const modelFilter = request.nextUrl.searchParams.get("model") || null;

    const result: Record<string, unknown> = {
      source: "heaven-os",
      synced_at: new Date().toISOString(),
      scope,
    };

    // ── MODELS scope ──
    if (scope === "all" || scope === "models") {
      const { data: platformAccounts } = await supabase
        .from("agence_platform_accounts")
        .select("*")
        .eq("status", "active");

      const { data: contentItems } = await supabase
        .from("agence_content_pipeline")
        .select("model_slug, stage, revenue");

      const { data: fans } = await supabase
        .from("agence_fan_lifecycle")
        .select("model_slug, stage, total_spent");

      const { data: goals } = await supabase
        .from("agence_goals")
        .select("*")
        .eq("status", "active");

      const modelSlugs = [
        ...new Set([
          ...(platformAccounts || []).map((a) => a.model_slug),
          ...(contentItems || []).map((c) => c.model_slug),
          ...(fans || []).map((f) => f.model_slug),
        ]),
      ].filter((s) => !modelFilter || s === modelFilter);

      result.models = modelSlugs.map((slug) => {
        const accounts = (platformAccounts || []).filter((a) => a.model_slug === slug);
        const content = (contentItems || []).filter((c) => c.model_slug === slug);
        const modelFans = (fans || []).filter((f) => f.model_slug === slug);
        const modelGoals = (goals || []).filter((g) => g.model_slug === slug);

        return {
          slug,
          platform_accounts: accounts.map((a) => ({
            platform: a.platform,
            handle: a.handle,
            subscribers: a.subscribers_count,
            revenue: parseFloat(a.monthly_revenue || "0"),
          })),
          total_subscribers: accounts.reduce((s, a) => s + (a.subscribers_count || 0), 0),
          monthly_revenue: accounts.reduce((s, a) => s + parseFloat(a.monthly_revenue || "0"), 0),
          content_total: content.length,
          content_published: content.filter((c) => c.stage === "published").length,
          content_revenue: content.reduce((s, c) => s + parseFloat(c.revenue || "0"), 0),
          active_fans: modelFans.filter((f) => f.stage !== "churned").length,
          fan_revenue: modelFans.reduce((s, f) => s + parseFloat(f.total_spent || "0"), 0),
          active_goals: modelGoals.length,
        };
      });
    }

    // ── PAYMENTS scope ──
    if (scope === "all" || scope === "payments") {
      let payQ = supabase.from("agence_pending_payments").select("id, model, amount, currency, status, payment_method, tier, pack_name, created_at, generated_code, code_sent");
      if (modelFilter) payQ = payQ.eq("model", modelFilter);

      const { data: payments } = await payQ.order("created_at", { ascending: false }).limit(100);

      const completed = (payments || []).filter((p) => p.status === "completed");
      const pending = (payments || []).filter((p) => p.status === "pending");
      const failed = (payments || []).filter((p) => p.status === "failed");

      const totalRevenue = completed.reduce((s, p) => s + parseFloat(p.amount || "0"), 0);

      // Payment method breakdown
      const byMethod: Record<string, { count: number; total: number }> = {};
      for (const p of completed) {
        const m = p.payment_method || "unknown";
        if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
        byMethod[m].count++;
        byMethod[m].total += parseFloat(p.amount || "0");
      }

      result.payments = {
        completed: completed.length,
        pending: pending.length,
        failed: failed.length,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        by_method: byMethod,
        recent: (payments || []).slice(0, 20).map((p) => ({
          id: p.id,
          model: p.model,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          method: p.payment_method,
          tier: p.tier,
          pack: p.pack_name,
          code_sent: p.code_sent,
          created_at: p.created_at,
        })),
      };
    }

    // ── REVENUE scope ──
    if (scope === "all" || scope === "revenue") {
      let revQ = supabase.from("agence_revenue_log").select("*");
      if (modelFilter) revQ = revQ.eq("model", modelFilter);

      const { data: revenueLogs } = await revQ.order("created_at", { ascending: false }).limit(200);

      const totalGross = (revenueLogs || []).reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
      const totalCommission = (revenueLogs || []).reduce((s, r) => s + parseFloat(r.commission_amount || "0"), 0);
      const totalNet = (revenueLogs || []).reduce((s, r) => s + parseFloat(r.net_amount || "0"), 0);

      // Monthly breakdown
      const monthlyMap: Record<string, { gross: number; commission: number; net: number; count: number }> = {};
      for (const r of revenueLogs || []) {
        const month = (r.created_at || "").substring(0, 7); // YYYY-MM
        if (!monthlyMap[month]) monthlyMap[month] = { gross: 0, commission: 0, net: 0, count: 0 };
        monthlyMap[month].gross += parseFloat(r.amount || "0");
        monthlyMap[month].commission += parseFloat(r.commission_amount || "0");
        monthlyMap[month].net += parseFloat(r.net_amount || "0");
        monthlyMap[month].count++;
      }

      result.revenue = {
        total_gross: Math.round(totalGross * 100) / 100,
        total_commission: Math.round(totalCommission * 100) / 100,
        total_net: Math.round(totalNet * 100) / 100,
        commission_rate: 0.25,
        entries: (revenueLogs || []).length,
        monthly: monthlyMap,
        recent: (revenueLogs || []).slice(0, 20).map((r) => ({
          id: r.id,
          model: r.model,
          amount: r.amount,
          commission: r.commission_amount,
          net: r.net_amount,
          method: r.payment_method,
          tier: r.tier,
          created_at: r.created_at,
        })),
      };
    }

    // ── SYSTEM scope (health & infra) ──
    if (scope === "all" || scope === "system") {
      const [modelsTotal, modelsActive, clientsTotal, codesTotal, codesActive, postsCount, pagesCount, messagesCount] = await Promise.all([
        safeCount(supabase, "agence_models"),
        safeCount(supabase, "agence_models", { is_active: true }),
        safeCount(supabase, "agence_clients"),
        safeCount(supabase, "agence_codes"),
        safeCount(supabase, "agence_codes", { active: true }),
        safeCount(supabase, "agence_posts"),
        safeCount(supabase, "agence_pages"),
        safeCount(supabase, "agence_messages"),
      ]);

      result.system = {
        models: { total: modelsTotal, active: modelsActive },
        clients: clientsTotal,
        codes: { total: codesTotal, active: codesActive },
        posts: postsCount,
        pages: pagesCount,
        messages: messagesCount,
        env: {
          paypal_configured: !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
          revolut_configured: !!process.env.REVOLUT_API_SECRET_KEY,
          cloudinary_configured: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          sqwensy_tunnel: !!process.env.SQWENSY_TUNNEL_KEY,
          heaven_sync_secret: !!process.env.HEAVEN_SYNC_SECRET,
        },
        uptime: process.uptime(),
      };
    }

    // ── CMS scope ──
    if (scope === "all" || scope === "cms") {
      let pagesQ = supabase.from("agence_pages").select("id, model, title, slug, status, created_at, updated_at");
      if (modelFilter) pagesQ = pagesQ.eq("model", modelFilter);
      const { data: pages } = await pagesQ.order("updated_at", { ascending: false });

      let collabQ = supabase.from("agence_collaborators").select("id, model, name, role, active, created_at");
      if (modelFilter) collabQ = collabQ.eq("model", modelFilter);
      const { data: collaborators } = await collabQ;

      result.cms = {
        pages: (pages || []).map((p) => ({
          id: p.id,
          model: p.model,
          title: p.title,
          slug: p.slug,
          status: p.status,
          updated_at: p.updated_at,
        })),
        collaborators: (collaborators || []).map((c) => ({
          id: c.id,
          model: c.model,
          name: c.name,
          role: c.role,
          active: c.active,
        })),
        pages_total: (pages || []).length,
        collaborators_total: (collaborators || []).length,
      };
    }

    // ── SECURITY scope ──
    if (scope === "all" || scope === "security") {
      let connQ = supabase.from("agence_client_connections").select("id, client_id, model, ip, user_agent, created_at");
      if (modelFilter) connQ = connQ.eq("model", modelFilter);
      const { data: connections } = await connQ.order("created_at", { ascending: false }).limit(50);

      // Suspicious patterns: multiple IPs per client, rapid connections
      const clientIps: Record<string, Set<string>> = {};
      for (const c of connections || []) {
        if (!clientIps[c.client_id]) clientIps[c.client_id] = new Set();
        if (c.ip) clientIps[c.client_id].add(c.ip);
      }
      const suspiciousClients = Object.entries(clientIps)
        .filter(([, ips]) => ips.size > 3)
        .map(([clientId, ips]) => ({ client_id: clientId, unique_ips: ips.size }));

      result.security = {
        recent_connections: (connections || []).slice(0, 20).map((c) => ({
          client_id: c.client_id,
          model: c.model,
          ip: c.ip,
          created_at: c.created_at,
        })),
        total_connections: (connections || []).length,
        suspicious_clients: suspiciousClients,
      };
    }

    return NextResponse.json(result, { headers: cors });
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
  const cors = getCorsHeaders(request);
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
            { error: "Database error" },
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
            { error: "Database error" },
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
        const syncSecret = process.env.HEAVEN_SYNC_SECRET;
        if (!syncSecret) {
          return NextResponse.json({ error: "HEAVEN_SYNC_SECRET not configured" }, { status: 500, headers: cors });
        }
        const sqwensyUrl = `${SQWENSY_OS_URL}/api/sync/heaven`;

        // Gather data
        const { data: allCodes } = await supabase.from("agence_codes").select("*");
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
          return NextResponse.json({ error: "Failed to reach SQWENSY OS" }, { status: 502, headers: cors });
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
            { error: "Database error" },
            { status: 502, headers: cors }
          );
        }

        return NextResponse.json(
          { success: true, item: data },
          { status: 201, headers: cors }
        );
      }

      case "manage_codes": {
        // Manage access codes from SQWENSY OS (revoke, extend, bulk operations)
        const codeAction = body.code_action as string; // revoke, extend, bulk_revoke
        if (!codeAction) {
          return NextResponse.json({ error: "code_action required (revoke|extend|bulk_revoke)" }, { status: 400, headers: cors });
        }

        if (codeAction === "revoke") {
          if (!body.code_id) return NextResponse.json({ error: "code_id required" }, { status: 400, headers: cors });
          const { data, error } = await supabase
            .from("agence_codes")
            .update({ active: false, revoked: true, revoked_at: new Date().toISOString(), revoked_by: "sqwensy-os" })
            .eq("id", body.code_id)
            .select()
            .single();
          if (error) return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
          return NextResponse.json({ success: true, code: data }, { headers: cors });
        }

        if (codeAction === "extend") {
          if (!body.code_id || !body.extend_hours) return NextResponse.json({ error: "code_id and extend_hours required" }, { status: 400, headers: cors });
          const { data: existing } = await supabase.from("agence_codes").select("expires_at").eq("id", body.code_id).single();
          if (!existing) return NextResponse.json({ error: "Code not found" }, { status: 404, headers: cors });
          const newExpiry = new Date(new Date(existing.expires_at).getTime() + body.extend_hours * 3600000).toISOString();
          const { data, error } = await supabase
            .from("agence_codes")
            .update({ expires_at: newExpiry })
            .eq("id", body.code_id)
            .select()
            .single();
          if (error) return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
          return NextResponse.json({ success: true, code: data, new_expiry: newExpiry }, { headers: cors });
        }

        if (codeAction === "bulk_revoke") {
          if (!body.model_slug) return NextResponse.json({ error: "model_slug required" }, { status: 400, headers: cors });
          const { count, error } = await supabase
            .from("agence_codes")
            .update({ active: false, revoked: true, revoked_at: new Date().toISOString(), revoked_by: "sqwensy-os-bulk" })
            .eq("model", body.model_slug)
            .eq("active", true);
          if (error) return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
          return NextResponse.json({ success: true, revoked_count: count }, { headers: cors });
        }

        return NextResponse.json({ error: "Invalid code_action" }, { status: 400, headers: cors });
      }

      case "update_payment_status": {
        // Update a pending payment status from SQWENSY OS (manual validation)
        if (!body.payment_id || !body.status) {
          return NextResponse.json({ error: "payment_id and status required" }, { status: 400, headers: cors });
        }
        const validStatuses = ["completed", "failed", "cancelled", "refunded"];
        if (!validStatuses.includes(body.status)) {
          return NextResponse.json({ error: `Invalid status. Valid: ${validStatuses.join(", ")}` }, { status: 400, headers: cors });
        }

        const updates: Record<string, unknown> = {
          status: body.status,
          updated_at: new Date().toISOString(),
        };
        if (body.notes) updates.notes = body.notes;

        const { data, error } = await supabase
          .from("agence_pending_payments")
          .update(updates)
          .eq("id", body.payment_id)
          .select()
          .single();

        if (error) {
          console.error("[API/sqwensy] update_payment_status error:", error);
          return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
        }

        return NextResponse.json({ success: true, payment: data }, { headers: cors });
      }

      case "get_model_registry": {
        // Fetch aggregated model stats from the heaven_model_registry VIEW
        const { data: registry, error } = await supabase
          .from("heaven_model_registry")
          .select("*");

        if (error) {
          console.error("[API/sqwensy] model_registry error:", error);
          return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
        }

        return NextResponse.json({ success: true, registry }, { headers: cors });
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
              "manage_codes",
              "update_payment_status",
              "get_model_registry",
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
