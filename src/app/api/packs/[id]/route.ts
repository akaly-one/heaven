import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";
import { toModelId } from "@/lib/model-utils";
import {
  normalizePackVisibility,
  type VisibilityRule,
} from "@/lib/pack-visibility";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════════════════════════════════
   /api/packs/[id] — Per-pack operations (visibility rules, detail read)
   Agent 5.B Phase 5 B8
   ══════════════════════════════════════════════════════════════════════════ */

const ALLOWED_RULES: VisibilityRule[] = ["public", "if_purchased", "preview_blur"];

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

/**
 * GET /api/packs/[id]?model=<slug>
 * Retourne le pack complet incluant les règles de visibilité.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const cors = getCorsHeaders(req);
  const { id } = await ctx.params;
  const modelSlug = req.nextUrl.searchParams.get("model");

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });
  }

  try {
    const supabase = requireSupabase();
    let query = supabase.from("agence_packs").select("*").eq("pack_id", id);
    if (modelSlug) {
      query = query.eq("model", toModelId(modelSlug));
    }
    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("[API/packs/[id]] GET Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    if (!data) {
      return NextResponse.json({ error: "Pack introuvable" }, { status: 404, headers: cors });
    }

    const visibility = normalizePackVisibility({
      visibility_rule: data.visibility_rule,
      blur_intensity: data.blur_intensity,
      preview_count: data.preview_count,
    });

    return NextResponse.json(
      {
        pack: {
          id: data.pack_id,
          model: data.model,
          name: data.name,
          price: Number(data.price),
          color: data.color,
          features: data.features || [],
          bonuses: data.bonuses || {},
          face: data.face,
          badge: data.badge,
          active: data.active,
          visibility,
        },
      },
      { headers: cors }
    );
  } catch (err) {
    console.error("[API/packs/[id]] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

/**
 * PATCH /api/packs/[id]
 * Body: { visibility_rule?, blur_intensity?, preview_count?, model: string }
 *
 * Admin scope : seuls les users `root` ou `model` (sur leur propre model_id)
 * peuvent modifier les règles de visibilité.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const cors = getCorsHeaders(req);
  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });
  }

  // Scope check via JWT
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400, headers: cors });
  }

  const rawModel = (body.model as string | undefined) || user.model_slug || user.sub;
  if (!rawModel) {
    return NextResponse.json({ error: "model requis" }, { status: 400, headers: cors });
  }
  const modelId = toModelId(rawModel);

  // Model role ne peut modifier que ses propres packs
  if (user.role === "model") {
    const ownModelId = toModelId(user.model_slug || user.sub);
    if (modelId !== ownModelId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
    }
  }

  // Validation des champs
  const patch: Record<string, unknown> = {};

  if (body.visibility_rule !== undefined) {
    const rule = body.visibility_rule as string;
    if (!ALLOWED_RULES.includes(rule as VisibilityRule)) {
      return NextResponse.json(
        { error: `visibility_rule invalide (attendu: ${ALLOWED_RULES.join(", ")})` },
        { status: 400, headers: cors }
      );
    }
    patch.visibility_rule = rule;
  }

  if (body.blur_intensity !== undefined) {
    const n = Number(body.blur_intensity);
    if (!Number.isFinite(n) || n < 0 || n > 20) {
      return NextResponse.json(
        { error: "blur_intensity doit être un entier entre 0 et 20" },
        { status: 400, headers: cors }
      );
    }
    patch.blur_intensity = Math.round(n);
  }

  if (body.preview_count !== undefined) {
    const n = Number(body.preview_count);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json(
        { error: "preview_count doit être >= 0" },
        { status: 400, headers: cors }
      );
    }
    patch.preview_count = Math.floor(n);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Aucun champ à mettre à jour" },
      { status: 400, headers: cors }
    );
  }

  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("agence_packs")
      .update(patch)
      .eq("pack_id", id)
      .eq("model", modelId)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[API/packs/[id]] PATCH Supabase error:", error);
      return NextResponse.json(
        { error: "Database error", detail: error.message },
        { status: 502, headers: cors }
      );
    }
    if (!data) {
      return NextResponse.json({ error: "Pack introuvable" }, { status: 404, headers: cors });
    }

    const visibility = normalizePackVisibility({
      visibility_rule: data.visibility_rule,
      blur_intensity: data.blur_intensity,
      preview_count: data.preview_count,
    });

    return NextResponse.json(
      { success: true, pack_id: id, visibility },
      { headers: cors }
    );
  } catch (err) {
    console.error("[API/packs/[id]] PATCH:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}
