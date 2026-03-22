import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";
const cors = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

/** GET /api/wall?model=yumi — List public wall posts */
export async function GET(req: NextRequest) {
  try {
    const model = req.nextUrl.searchParams.get("model");
    if (!model) return NextResponse.json({ posts: [] }, { headers: cors });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ posts: [] }, { headers: cors });

    const { data, error } = await supabase
      .from("agence_wall_posts")
      .select("*")
      .eq("model", model)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ posts: data || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/wall] GET:", err);
    return NextResponse.json({ posts: [] }, { headers: cors });
  }
}

/** POST /api/wall — Create a public wall post (anyone with a pseudo) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, pseudo, content, photo_url } = body;

    if (!model || !pseudo) {
      return NextResponse.json({ error: "model and pseudo required" }, { status: 400, headers: cors });
    }
    if (!content && !photo_url) {
      return NextResponse.json({ error: "content or photo required" }, { status: 400, headers: cors });
    }

    // Basic length limits
    if (pseudo.length > 30) return NextResponse.json({ error: "pseudo too long" }, { status: 400, headers: cors });
    if (content && content.length > 500) return NextResponse.json({ error: "content too long (500 max)" }, { status: 400, headers: cors });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 500, headers: cors });

    const { data, error } = await supabase
      .from("agence_wall_posts")
      .insert({ model, pseudo, content: content || null, photo_url: photo_url || null })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ post: data }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/wall] POST:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}
