import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

// POST: Check if device can use this code
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { code_id, fingerprint, user_agent } = body;
    if (!code_id || !fingerprint) {
      return NextResponse.json({ error: "code_id + fingerprint requis" }, { status: 400, headers: cors });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ allowed: true }, { headers: cors });

    // Check if code is blocked
    const { data: codeData } = await supabase
      .from("agence_codes").select("blocked, max_devices, security_alert").eq("id", code_id).single();

    if (codeData?.blocked) {
      return NextResponse.json({
        allowed: false,
        reason: "blocked",
        message: "Ce code a été bloqué. Contacte le support pour plus d'infos.",
      }, { headers: cors });
    }

    // Get existing devices for this code
    const { data: devices } = await supabase
      .from("agence_code_devices")
      .select("*")
      .eq("code_id", code_id)
      .eq("blocked", false);

    const existingDevice = (devices || []).find((d: { fingerprint: string; ip_address: string }) => d.fingerprint === fingerprint || d.ip_address === ip);

    if (existingDevice) {
      // Known device — update last_seen
      await supabase.from("agence_code_devices")
        .update({ last_seen: new Date().toISOString(), ip_address: ip, user_agent })
        .eq("id", existingDevice.id);
      return NextResponse.json({ allowed: true, device_id: existingDevice.id }, { headers: cors });
    }

    // New device
    const deviceCount = (devices || []).length;
    const maxDevices = codeData?.max_devices || 2;

    if (deviceCount >= maxDevices) {
      // Too many devices — trigger alert
      await supabase.from("agence_codes")
        .update({ security_alert: true })
        .eq("id", code_id);

      // Log the blocked attempt
      await supabase.from("agence_code_devices").insert({
        code_id, ip_address: ip, fingerprint, user_agent, blocked: true,
      });

      return NextResponse.json({
        allowed: false,
        reason: "too_many_devices",
        message: "⚠️ Ce code est personnel et lié à ton appareil. Le partage de code entraîne le blocage du compte sans remboursement.",
      }, { headers: cors });
    }

    // Register new device
    const { data: newDevice } = await supabase.from("agence_code_devices")
      .insert({ code_id, ip_address: ip, fingerprint, user_agent })
      .select().single();

    return NextResponse.json({ allowed: true, device_id: newDevice?.id, device_number: deviceCount + 1 }, { headers: cors });
  } catch (err) {
    console.error("[API/codes/security]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}
