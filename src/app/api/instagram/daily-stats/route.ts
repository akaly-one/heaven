import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";

/**
 * Daily IG stats for dashboard widget.
 *
 * GET /api/instagram/daily-stats
 *   Returns : {
 *     dms_received_today: number,
 *     dms_replied_today: number,
 *     last_sync_at: string | null,
 *   }
 *
 * Scopes : filtered to authenticated model (or all if root).
 * Day boundary : Europe/Brussels midnight → UTC equivalent (naive : current UTC day).
 */
export async function GET(_req: NextRequest) {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  // Today boundary (UTC) — matches server clock, good enough for a counter widget
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  // Fetch conversations owned by the current user's model scope
  let convQuery = db
    .from("instagram_conversations")
    .select("id");
  if (user.role === "model" && user.sub) {
    convQuery = convQuery.eq("model_slug", user.sub);
  }
  const { data: convRows, error: convErr } = await convQuery;
  if (convErr) {
    return NextResponse.json({ error: "DB error (conv)" }, { status: 500 });
  }
  const convIds = (convRows || []).map((r) => r.id);

  let dmsReceived = 0;
  let dmsReplied = 0;

  if (convIds.length > 0) {
    // Received today (role = 'user')
    const { count: recvCount } = await db
      .from("instagram_messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .eq("role", "user")
      .gte("created_at", todayIso);
    dmsReceived = recvCount || 0;

    // Replied today (role = 'assistant')
    const { count: replCount } = await db
      .from("instagram_messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .eq("role", "assistant")
      .gte("created_at", todayIso);
    dmsReplied = replCount || 0;
  }

  // Last sync run (most recent ops_metrics row for the cron)
  const { data: lastSyncRow } = await db
    .from("ops_metrics")
    .select("created_at")
    .eq("metric", "sync_instagram_run_ms")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json(
    {
      dms_received_today: dmsReceived,
      dms_replied_today: dmsReplied,
      last_sync_at: lastSyncRow?.created_at || null,
    },
    {
      headers: { "Cache-Control": "private, max-age=30" },
    },
  );
}
