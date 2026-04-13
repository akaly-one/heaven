import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";

// ═══ GET — List conversations ═══
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
  const status = params.get("status") || "active";
  const limit = Math.min(parseInt(params.get("limit") || "30"), 100);

  let query = db
    .from("instagram_conversations")
    .select("*")
    .eq("status", status)
    .order("last_message_at", { ascending: false })
    .limit(limit);

  // Model scoping — sub = model_slug for model role
  if (user.role === "model" && user.sub) {
    query = query.eq("model_slug", user.sub);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// ═══ PATCH — Update conversation (mode, status) ═══
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, mode, status } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const updates: Record<string, string> = {};
  if (mode && (mode === "agent" || mode === "human")) updates.mode = mode;
  if (status && ["active", "archived", "blocked"].includes(status)) updates.status = status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid updates" }, { status: 400 });
  }

  const { error } = await db
    .from("instagram_conversations")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
