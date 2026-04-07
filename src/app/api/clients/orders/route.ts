import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const model = req.nextUrl.searchParams.get("model");
  const handle = req.nextUrl.searchParams.get("handle");

  if (!isValidModelSlug(model) || !handle) {
    return NextResponse.json({ error: "model + handle requis" }, { status: 400, headers: cors });
  }

  try {
    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ orders: [] }, { headers: cors });
    }

    // Fetch SYSTEM wall posts mentioning this handle
    const { data, error } = await supabase
      .from("agence_wall_posts")
      .select("id, content, created_at")
      .eq("model", model)
      .eq("pseudo", "SYSTEM")
      .ilike("content", `%@${handle}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[API/clients/orders] error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 502, headers: cors });
    }

    // Parse order posts
    const orders = (data || []).map(post => {
      const content = post.content || "";
      let status: "pending" | "accepted" | "refused" = "pending";
      if (content.startsWith("\u2705")) status = "accepted";
      else if (content.startsWith("\u274C")) status = "refused";

      // Extract amount: look for (XXX\u20AC)
      const amountMatch = content.match(/\((\d+)\u20AC\)/);
      const amount = amountMatch ? Number(amountMatch[1]) : 0;

      // Extract item description: after "commande:" and before "(XX\u20AC)"
      const itemMatch = content.match(/commande:\s*(.+?)(?:\s*\(\d+\u20AC\)|\s*\u2014)/);
      const item = itemMatch ? itemMatch[1].trim() : content.slice(2, 60);

      return {
        id: post.id,
        status,
        item,
        amount,
        created_at: post.created_at,
      };
    });

    return NextResponse.json({ orders }, { headers: cors });
  } catch (err) {
    console.error("[API/clients/orders]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}
