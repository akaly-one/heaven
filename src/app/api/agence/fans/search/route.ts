import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";

/**
 * GET /api/agence/fans/search?q=&exclude=
 *   - q : free-text search (matched against pseudo_web, pseudo_insta, pseudo_snap, fanvue_handle, phone, email)
 *   - exclude : optional fan id to exclude from results (e.g. when picking a merge target)
 *
 * Used by the fan-merge picker. Root only — searching globally.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "root") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const exclude = req.nextUrl.searchParams.get("exclude");

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const term = `%${q.toLowerCase()}%`;
  const cols = ["pseudo_web", "pseudo_insta", "pseudo_snap", "fanvue_handle", "phone", "email"];
  const orFilter = cols.map((c) => `${c}.ilike.${term}`).join(",");

  let query = db
    .from("agence_fans")
    .select("id, pseudo_web, pseudo_insta, pseudo_snap, fanvue_handle, phone, email, last_seen")
    .or(orFilter)
    .is("merged_into_id", null)
    .order("last_seen", { ascending: false })
    .limit(20);

  if (exclude) query = query.neq("id", exclude);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ results: data || [] });
}
