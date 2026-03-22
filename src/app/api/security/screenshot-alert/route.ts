import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";
const cors = getCorsHeaders();

// Allowed page values
const VALID_PAGES = ["profile", "gallery", "chat", "wall", "shop"];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

/**
 * POST /api/security/screenshot-alert
 *
 * Called when a screenshot attempt is detected on a model's profile.
 * Body: { subscriberId, modelId, page }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscriberId, modelId, page } = body;

    if (!subscriberId || !modelId) {
      return NextResponse.json({ error: "subscriberId and modelId required" }, { status: 400, headers: cors });
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500, headers: cors });
    }

    // Validate modelId exists
    const { data: modelExists } = await supabase
      .from("agence_accounts")
      .select("id")
      .eq("model_slug", modelId)
      .maybeSingle();

    if (!modelExists) {
      return NextResponse.json({ error: "Invalid modelId" }, { status: 400, headers: cors });
    }

    // Use server timestamp (never trust client)
    const serverTimestamp = new Date().toISOString();

    // Validate page
    const validPage = VALID_PAGES.includes(page) ? page : "profile";

    // 1. Fetch subscriber info
    const { data: client } = await supabase
      .from("agence_clients")
      .select("id, pseudo_snap, pseudo_insta, tier, screenshot_count")
      .eq("id", subscriberId)
      .single();

    if (!client) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404, headers: cors });
    }

    const newCount = (client.screenshot_count || 0) + 1;
    const clientPseudo = client.pseudo_snap || client.pseudo_insta || "unknown";

    // 2. Update screenshot count on client
    await supabase
      .from("agence_clients")
      .update({
        screenshot_count: newCount,
        last_screenshot_at: serverTimestamp,
      })
      .eq("id", subscriberId);

    // 3. Log security alert
    await supabase.from("agence_security_alerts").insert({
      model: modelId,
      client_id: subscriberId,
      client_pseudo: clientPseudo,
      client_tier: client.tier || null,
      alert_type: "screenshot",
      page: validPage,
      action_taken: newCount === 1 ? "logged" : newCount === 2 ? "warning_sent" : "escalated",
    });

    // 4. Repeat offender logic
    let action = "logged";

    if (newCount >= 2) {
      const warningMessages: Record<number, string> = {
        2: `⚠️ Screenshot detected. All content is watermarked with your identity. Further attempts may result in access revocation.`,
        3: `🚫 Multiple screenshot attempts detected. Your access is at risk of being revoked. This has been reported to the creator.`,
      };
      const msg = warningMessages[newCount] || warningMessages[3];

      await supabase.from("agence_messages").insert({
        model: modelId,
        client_id: subscriberId,
        sender_type: "model",
        content: msg,
        read: false,
      });
      action = newCount >= 3 ? "escalated" : "warning_sent";
    }

    return NextResponse.json({
      success: true,
      action,
      screenshot_count: newCount,
      client_pseudo: clientPseudo,
      client_tier: client.tier,
    }, { headers: cors });
  } catch (err) {
    console.error("[API/security/screenshot-alert]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}

/**
 * GET /api/security/screenshot-alert?model=yumi — List security alerts (auth required)
 */
export async function GET(req: NextRequest) {
  try {
    const model = req.nextUrl.searchParams.get("model");
    if (!model) {
      return NextResponse.json({ error: "model required" }, { status: 400, headers: cors });
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500, headers: cors });
    }

    const { data: alerts, error } = await supabase
      .from("agence_security_alerts")
      .select("*")
      .eq("model", model)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ alerts: alerts || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/security/screenshot-alert] GET:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}
