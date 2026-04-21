import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomUUID } from "crypto";
import { getServerSupabase } from "@/lib/supabase-server";

/**
 * Meta Data Deletion Callback.
 * Required for Meta App Review (Instagram Business Login / Graph API).
 * Doc : https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 *
 * Flow :
 * 1. User asks Meta to delete their data (via Accounts Center)
 * 2. Meta POSTs a signed_request to this endpoint
 * 3. We parse, soft-delete data linked to the provided user_id
 * 4. We return { url, confirmation_code } — Meta shows the URL to the user
 *
 * Also supports direct GDPR deletion requests via ig_username / email (non-signed).
 */

function parseSignedRequest(signed: string, appSecret: string): { user_id?: string } | null {
  try {
    const [encodedSig, encodedPayload] = signed.split(".");
    const sig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const expected = createHmac("sha256", appSecret)
      .update(encodedPayload)
      .digest();
    if (!sig.equals(expected)) return null;
    const payload = JSON.parse(Buffer.from(encodedPayload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    return payload;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const appSecret = process.env.META_APP_SECRET;
  const db = getServerSupabase();

  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  let igUserId: string | null = null;
  let igUsername: string | null = null;

  // Path 1 : Meta-signed request
  if (body.signed_request && typeof body.signed_request === "string" && appSecret) {
    const payload = parseSignedRequest(body.signed_request, appSecret);
    if (!payload) {
      return NextResponse.json({ error: "Invalid signed_request" }, { status: 401 });
    }
    igUserId = payload.user_id || null;
  }
  // Path 2 : End-user manual request
  else if (body.ig_username && typeof body.ig_username === "string") {
    igUsername = body.ig_username.trim().replace(/^@/, "").toLowerCase();
  } else {
    return NextResponse.json(
      { error: "Missing signed_request or ig_username" },
      { status: 400 }
    );
  }

  const confirmationCode = randomUUID().replace(/-/g, "").slice(0, 16);

  // Log the deletion request first (audit trail)
  await db.from("agence_outreach_log").insert({
    channel: "instagram",
    status: "queued",
    trigger: "data_deletion_request",
    error: null,
    queued_at: new Date().toISOString(),
  });

  // Soft-delete : mark fan as deleted + anonymize handles
  // We keep the row for audit (financial records retention) but strip PII
  if (igUserId || igUsername) {
    let fanQuery = db.from("agence_fans").select("id");
    if (igUsername) fanQuery = fanQuery.eq("pseudo_insta", igUsername);

    const { data: fans } = await fanQuery;
    const fanIds = (fans || []).map((f) => f.id);

    if (fanIds.length > 0) {
      // Anonymize — keep row but nuke all PII
      await db
        .from("agence_fans")
        .update({
          pseudo_insta: null,
          pseudo_snap: null,
          pseudo_web: null,
          fanvue_handle: null,
          phone: null,
          email: null,
          notes: `[DELETED via Meta data deletion ${new Date().toISOString()}] code=${confirmationCode}`,
        })
        .in("id", fanIds);

      // Soft-delete IG conversations linked to this fan
      if (igUserId) {
        await db
          .from("instagram_conversations")
          .update({ status: "archived", ig_username: null })
          .eq("ig_user_id", igUserId);
      }
    }

    // Log ops metric
    await db.from("ops_metrics").insert({
      metric: "data_deletion_request",
      value: fanIds.length,
      tags: { ig_username: igUsername, ig_user_id: igUserId, confirmation_code: confirmationCode },
    });
  }

  return NextResponse.json(
    {
      url: `https://heaven-os.vercel.app/data-deletion/status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    },
    { status: 200 }
  );
}

// GET — health check / Meta verification
export async function GET() {
  return NextResponse.json({
    endpoint: "Meta Data Deletion Callback",
    method: "POST",
    accepts: ["signed_request (Meta)", "ig_username (manual)"],
    status: "ready",
  });
}
