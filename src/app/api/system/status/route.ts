import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// GET /api/system/status — Live infrastructure stats (root-only)
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 502, headers: cors });

    // Run all queries in parallel, each with its own try/catch
    const [
      dbStats,
      modelsStats,
      clientsStats,
      codesStats,
      paymentsStats,
      postsStats,
    ] = await Promise.all([
      // ── DB stats ──
      (async () => {
        try {
          const { count: tableCount } = await supabase
            .from("pg_tables" as string)
            .select("*", { count: "exact", head: true })
            .eq("schemaname", "public");

          // Use pg_stat_user_tables for row estimates
          const { data: statRows } = await supabase
            .rpc("get_total_rows" as string)
            .maybeSingle();

          // Fallback: count major tables individually
          if (!statRows) {
            let totalRows = 0;
            const tables = ["agence_clients", "agence_codes", "agence_posts", "agence_messages", "agence_models", "agence_pending_payments", "agence_accounts"];
            for (const t of tables) {
              try {
                const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
                totalRows += count ?? 0;
              } catch { /* table may not exist */ }
            }
            return { tables: tableCount ?? 0, total_rows: totalRows };
          }

          return { tables: tableCount ?? 0, total_rows: (statRows as Record<string, number>)?.total ?? 0 };
        } catch {
          return { tables: 0, total_rows: 0 };
        }
      })(),

      // ── Models stats ──
      (async () => {
        try {
          const { count: total } = await supabase.from("agence_models").select("*", { count: "exact", head: true });
          const { count: active } = await supabase.from("agence_models").select("*", { count: "exact", head: true }).eq("is_active", true);
          return { total: total ?? 0, active: active ?? 0 };
        } catch {
          return { total: 0, active: 0 };
        }
      })(),

      // ── Clients stats ──
      (async () => {
        try {
          const { count: total } = await supabase.from("agence_clients").select("*", { count: "exact", head: true });
          const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
          const { count: active30d } = await supabase.from("agence_clients").select("*", { count: "exact", head: true }).gt("last_active", thirtyDaysAgo);
          const { count: paying } = await supabase.from("agence_clients").select("*", { count: "exact", head: true }).gt("total_spent", 0);
          return { total: total ?? 0, active_30d: active30d ?? 0, paying: paying ?? 0 };
        } catch {
          return { total: 0, active_30d: 0, paying: 0 };
        }
      })(),

      // ── Codes stats ──
      (async () => {
        try {
          const { count: total } = await supabase.from("agence_codes").select("*", { count: "exact", head: true });
          const now = new Date().toISOString();
          const { count: active } = await supabase.from("agence_codes").select("*", { count: "exact", head: true }).eq("active", true).eq("revoked", false).gt("expires_at", now);
          const { count: expired } = await supabase.from("agence_codes").select("*", { count: "exact", head: true }).lt("expires_at", now);
          return { total: total ?? 0, active: active ?? 0, expired: expired ?? 0 };
        } catch {
          return { total: 0, active: 0, expired: 0 };
        }
      })(),

      // ── Payments stats ──
      (async () => {
        try {
          const { count: completed } = await supabase.from("agence_pending_payments").select("*", { count: "exact", head: true }).eq("status", "completed");
          const { count: pending } = await supabase.from("agence_pending_payments").select("*", { count: "exact", head: true }).eq("status", "pending");
          const { data: revenueData } = await supabase.from("agence_pending_payments").select("amount").eq("status", "completed");
          const totalRevenue = (revenueData || []).reduce((sum: number, r: { amount: number }) => sum + (r.amount || 0), 0);
          return { completed: completed ?? 0, pending: pending ?? 0, total_revenue: Math.round(totalRevenue * 100) / 100 };
        } catch {
          return { completed: 0, pending: 0, total_revenue: 0 };
        }
      })(),

      // ── Posts stats ──
      (async () => {
        try {
          const { count: feed } = await supabase.from("agence_posts").select("*", { count: "exact", head: true }).eq("post_type", "feed");
          const { count: stories } = await supabase.from("agence_posts").select("*", { count: "exact", head: true }).eq("post_type", "story");
          return { feed: feed ?? 0, stories: stories ?? 0 };
        } catch {
          return { feed: 0, stories: 0 };
        }
      })(),
    ]);

    // ── Env vars check (server-side) ──
    const env = {
      paypal_configured: !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
      revolut_configured: !!process.env.REVOLUT_API_SECRET_KEY || !!process.env.NEXT_PUBLIC_REVOLUT_CONFIGURED,
      cloudinary_configured: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      sqwensy_configured: !!process.env.SQWENSY_SYNC_URL || !!process.env.NEXT_PUBLIC_SQWENSY_CONFIGURED,
    };

    return NextResponse.json({
      db: dbStats,
      models: modelsStats,
      clients: clientsStats,
      codes: codesStats,
      payments: paymentsStats,
      posts: postsStats,
      env,
    }, { headers: cors });
  } catch (err) {
    console.error("[API/system/status] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}
