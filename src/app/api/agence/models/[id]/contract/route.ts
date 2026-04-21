import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

/**
 * Agent 7.C — Contract versioning + signed URL emission.
 *
 * GET /api/agence/models/:id/contract
 *   → liste versions + signed URL 15 min par version active
 *
 * POST /api/agence/models/:id/contract
 *   Multipart form: file (PDF ou MD), amendment_reason?
 *   OU JSON : { generated_markdown: string, amendment_reason?: string }
 *   → enregistre version+1 dans agence_contracts_versions + upload bucket
 *      contracts-private. Met a jour agence_models.contract_url + signed_at.
 *
 * Admin uniquement (scope contract:view verifie cote DB).
 */

const BUCKET = "contracts-private";
const SIGNED_URL_TTL_SEC = 15 * 60; // 15 minutes

// ── GET : list versions ────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing model id" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const targetId = toModelId(id);

  if (user.role === "model") {
    const userModelId = toModelId(String(user.sub || user.model_slug || ""));
    if (userModelId !== targetId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data, error } = await db
    .from("agence_contracts_versions")
    .select("id, version, contract_url, signed_at, amendment_reason, created_at")
    .eq("model_id", targetId)
    .order("version", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Signed URL pour chaque version (objets supposes dans bucket contracts-private)
  const versions = await Promise.all(
    (data || []).map(async (v) => {
      let signedUrl: string | null = null;
      if (v.contract_url && v.contract_url.startsWith("contracts-private/")) {
        const objectPath = v.contract_url.replace(/^contracts-private\//, "");
        const { data: sig } = await db.storage
          .from(BUCKET)
          .createSignedUrl(objectPath, SIGNED_URL_TTL_SEC);
        signedUrl = sig?.signedUrl || null;
      } else if (v.contract_url) {
        // URL externe deja signee ou absolue
        signedUrl = v.contract_url;
      }
      return { ...v, signed_url: signedUrl };
    })
  );

  return NextResponse.json({ versions });
}

// ── POST : upload nouveau contrat ───────────────────────────────────────────

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== "root") {
    return NextResponse.json(
      { error: "Admin only (scope contract:view)" },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing model id" }, { status: 400 });

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const targetId = toModelId(id);

  // Next version number
  const { data: existing } = await db
    .from("agence_contracts_versions")
    .select("version")
    .eq("model_id", targetId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (existing?.version ?? 0) + 1;

  // Determine input kind
  const contentType = req.headers.get("content-type") || "";
  let fileBytes: ArrayBuffer | null = null;
  let fileName = `contract-v${nextVersion}`;
  let fileExt = "md";
  let mimeType = "text/markdown";
  let amendmentReason: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    amendmentReason = (form.get("amendment_reason") as string | null) ?? null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    fileBytes = await file.arrayBuffer();
    mimeType = file.type || "application/pdf";
    if (mimeType.includes("pdf")) fileExt = "pdf";
    else if (mimeType.includes("markdown")) fileExt = "md";
    else fileExt = "bin";
    fileName = file.name || `contract-v${nextVersion}.${fileExt}`;
  } else {
    const body = (await req.json().catch(() => null)) as {
      generated_markdown?: string;
      amendment_reason?: string;
    } | null;
    if (!body?.generated_markdown) {
      return NextResponse.json(
        { error: "Missing generated_markdown or file" },
        { status: 400 }
      );
    }
    fileBytes = new TextEncoder().encode(body.generated_markdown).buffer as ArrayBuffer;
    amendmentReason = body.amendment_reason ?? null;
    fileExt = "md";
    mimeType = "text/markdown";
    fileName = `contract-v${nextVersion}.md`;
  }

  // Upload vers bucket contracts-private
  const objectPath = `${targetId}/v${nextVersion}-${Date.now()}.${fileExt}`;
  const { error: uploadErr } = await db.storage
    .from(BUCKET)
    .upload(objectPath, fileBytes, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadErr.message}` },
      { status: 500 }
    );
  }

  const contractStoragePath = `${BUCKET}/${objectPath}`;
  const nowIso = new Date().toISOString();

  // INSERT append-only version
  const { data: versionRow, error: insertErr } = await db
    .from("agence_contracts_versions")
    .insert({
      model_id: targetId,
      version: nextVersion,
      contract_url: contractStoragePath,
      signed_at: nowIso,
      amendment_reason: amendmentReason,
    })
    .select("*")
    .maybeSingle();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Update agence_models.contract_url + signed_at pour version active
  await db
    .from("agence_models")
    .update({
      contract_url: contractStoragePath,
      contract_signed_at: nowIso,
    })
    .eq("model_id", targetId);

  // Signed URL immediate
  const { data: sig } = await db.storage
    .from(BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SEC);

  return NextResponse.json({
    version: versionRow,
    signed_url: sig?.signedUrl || null,
    file_name: fileName,
  });
}
