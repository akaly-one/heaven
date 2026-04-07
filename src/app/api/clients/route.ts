import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// GET /api/clients?model=yumi — List clients
// Supports pagination: ?page=1&limit=50 (default: return all for backward compat)
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    const modelFilter = req.nextUrl.searchParams.get("model");
    if (modelFilter && !isValidModelSlug(modelFilter)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    }

    const pageParam = req.nextUrl.searchParams.get("page");
    const limitParam = req.nextUrl.searchParams.get("limit");
    const paginated = pageParam !== null;
    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(limitParam || "50", 10) || 50));
    const offset = (page - 1) * limit;

    if (paginated) {
      // Paginated mode: return page + total count
      let countQ = supabase.from("agence_clients").select("*", { count: "exact", head: true });
      if (modelFilter) countQ = countQ.eq("model", modelFilter);
      const { count } = await countQ;
      const total = count ?? 0;

      let q = supabase
        .from("agence_clients")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (modelFilter) q = q.eq("model", modelFilter);

      const { data, error } = await q;
      if (error) throw error;

      return NextResponse.json({
        clients: data || [],
        total,
        page,
        limit,
        hasMore: offset + limit < total,
      }, { headers: cors });
    }

    // Legacy mode: return all (backward compat)
    let q = supabase
      .from("agence_clients")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (modelFilter) q = q.eq("model", modelFilter);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ clients: data }, { headers: cors });
  } catch (err) {
    console.error("[API/clients] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// POST /api/clients — Register/upsert client (public — used by messenger widget)
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { model } = body;
    // Normalize pseudos to lowercase for consistent matching
    const pseudo_snap = body.pseudo_snap ? body.pseudo_snap.trim().toLowerCase() : null;
    const pseudo_insta = body.pseudo_insta ? body.pseudo_insta.trim().toLowerCase() : null;
    const phone = body.phone ? body.phone.trim() : null;
    const nickname = body.nickname ? body.nickname.trim().toLowerCase() : null;
    const lead_source = body.lead_source || null;
    const lead_hook = body.lead_hook || null;

    if (!model || !isValidModelSlug(model)) return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    if (!pseudo_snap && !pseudo_insta && !phone && !nickname) {
      return NextResponse.json({ error: "pseudo_snap, pseudo_insta, phone ou nickname requis" }, { status: 400, headers: cors });
    }

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    // Case-insensitive lookup to merge duplicates (priority: snap > insta > phone > nickname)
    let existing = null;
    if (pseudo_snap) {
      const { data } = await supabase
        .from("agence_clients")
        .select("*")
        .eq("model", model)
        .ilike("pseudo_snap", pseudo_snap)
        .maybeSingle();
      existing = data;
    }
    if (!existing && pseudo_insta) {
      const { data } = await supabase
        .from("agence_clients")
        .select("*")
        .eq("model", model)
        .ilike("pseudo_insta", pseudo_insta)
        .maybeSingle();
      existing = data;
    }
    if (!existing && phone) {
      try {
        const { data } = await supabase
          .from("agence_clients")
          .select("*")
          .eq("model", model)
          .eq("phone", phone)
          .maybeSingle();
        existing = data;
      } catch {
        // phone column may not exist yet — graceful skip
      }
    }
    if (!existing && nickname) {
      try {
        const { data } = await supabase
          .from("agence_clients")
          .select("*")
          .eq("model", model)
          .ilike("nickname", nickname)
          .maybeSingle();
        existing = data;
      } catch {
        // nickname column may not exist yet — graceful skip
      }
    }

    if (existing) {
      const updates: Record<string, unknown> = { last_active: new Date().toISOString() };
      if (pseudo_snap) updates.pseudo_snap = pseudo_snap;
      if (pseudo_insta && !existing.pseudo_insta) updates.pseudo_insta = pseudo_insta;
      if (phone) updates.phone = phone;
      if (nickname && !existing.nickname) updates.nickname = nickname;

      try {
        const { data } = await supabase
          .from("agence_clients")
          .update(updates)
          .eq("id", existing.id)
          .select()
          .single();
        return NextResponse.json({ client: data, created: false }, { headers: cors });
      } catch {
        // If phone/nickname columns don't exist, retry without them
        const safeUpdates: Record<string, unknown> = { last_active: new Date().toISOString() };
        if (pseudo_snap) safeUpdates.pseudo_snap = pseudo_snap;
        if (pseudo_insta && !existing.pseudo_insta) safeUpdates.pseudo_insta = pseudo_insta;
        const { data } = await supabase
          .from("agence_clients")
          .update(safeUpdates)
          .eq("id", existing.id)
          .select()
          .single();
        return NextResponse.json({ client: data, created: false }, { headers: cors });
      }
    }

    // Create new client
    const insertData: Record<string, unknown> = {
      model,
      pseudo_snap: pseudo_snap || null,
      pseudo_insta: pseudo_insta || null,
      last_active: new Date().toISOString(),
    };
    if (phone) insertData.phone = phone;
    if (nickname) insertData.nickname = nickname;
    if (lead_source) insertData.lead_source = lead_source;
    if (lead_hook) insertData.lead_hook = lead_hook;

    try {
      const { data, error } = await supabase
        .from("agence_clients")
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ client: data, created: true }, { status: 201, headers: cors });
    } catch (insertErr) {
      // If phone/nickname columns don't exist, retry without them
      const safeInsert: Record<string, unknown> = {
        model,
        pseudo_snap: pseudo_snap || null,
        pseudo_insta: pseudo_insta || null,
        last_active: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("agence_clients")
        .insert(safeInsert)
        .select()
        .single();
      if (error) { console.error("[API/clients] fallback insert failed:", insertErr, error); throw error; }
      return NextResponse.json({ client: data, created: true }, { status: 201, headers: cors });
    }
  } catch (err) {
    console.error("[API/clients] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// PUT /api/clients — Update client
export async function PUT(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    // Whitelist allowed fields
    // Handle verification action
    if (updates.action === "verify" || updates.action === "reject") {
      const verifyUpdate: Record<string, unknown> = {
        verified_status: updates.action === "verify" ? "verified" : "rejected",
        verified_at: new Date().toISOString(),
        verified_by: updates.verified_by || "model",
      };
      try {
        const { data, error } = await supabase.from("agence_clients").update(verifyUpdate).eq("id", id).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, client: data }, { headers: cors });
      } catch (verifyErr) {
        // If columns don't exist yet, skip gracefully
        console.warn("[API/clients] verify columns not ready:", verifyErr);
        return NextResponse.json({ success: true, message: "Verification columns not migrated yet" }, { headers: cors });
      }
    }

    const allowed: Record<string, unknown> = {};
    const fields = ["pseudo_snap", "pseudo_insta", "phone", "nickname", "tier", "total_spent", "total_tokens_bought", "total_tokens_spent", "is_verified", "is_blocked", "notes", "firstname", "tag", "preferences", "delivery_platform"];
    for (const f of fields) {
      if (updates[f] !== undefined) allowed[f] = updates[f];
    }

    const { data, error } = await supabase.from("agence_clients").update(allowed).eq("id", id).select().single();
    if (error) throw error;

    return NextResponse.json({ success: true, client: data }, { headers: cors });
  } catch (err) {
    console.error("[API/clients] PUT:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// DELETE /api/clients?id=xxx — Delete a client
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    const { error } = await supabase.from("agence_clients").delete().eq("id", id);
    if (error) {
      console.error("[API/clients] DELETE error:", error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: cors });
    }

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/clients] DELETE:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// PATCH /api/clients — Update client fields (notes, tier, etc.)
export async function PATCH(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    const { data, error } = await supabase.from("agence_clients").update(updates).eq("id", id).select().single();
    if (error) {
      console.error("[API/clients] PATCH error:", error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: cors });
    }

    return NextResponse.json({ success: true, client: data }, { headers: cors });
  } catch (err) {
    console.error("[API/clients] PATCH:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}
