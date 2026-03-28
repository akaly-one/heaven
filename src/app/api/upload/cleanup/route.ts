import { NextRequest, NextResponse } from "next/server";
import { listCloudinaryResources, bulkDeleteCloudinary } from "@/lib/cloudinary";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

/**
 * GET /api/upload/cleanup?dry_run=true
 *
 * Scans Cloudinary "heaven/" folder and compares with all URLs
 * referenced in Supabase tables. Returns orphaned files.
 *
 * Query params:
 *   dry_run=true  (default) — list orphans without deleting
 *   dry_run=false — actually delete orphans
 */
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const dryRun = req.nextUrl.searchParams.get("dry_run") !== "false";
    const supabase = getServerSupabase();

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500, headers: cors });
    }

    // Step 1: List all Cloudinary resources in heaven/ folder
    const [images, videos] = await Promise.all([
      listCloudinaryResources("heaven", "image", 1000),
      listCloudinaryResources("heaven", "video", 200),
    ]);

    const allResources = [
      ...images.map(r => ({ ...r, type: "image" as const })),
      ...videos.map(r => ({ ...r, type: "video" as const })),
    ];

    if (allResources.length === 0) {
      return NextResponse.json({
        message: "No Cloudinary resources found in heaven/ folder",
        total: 0,
        orphans: 0,
        freed_bytes: 0,
      }, { headers: cors });
    }

    // Step 2: Collect all referenced URLs from Supabase tables
    const referencedUrls = new Set<string>();

    // Posts (media_url)
    const { data: posts } = await supabase
      .from("agence_posts")
      .select("media_url")
      .not("media_url", "is", null);
    for (const p of posts || []) {
      if (p.media_url) referencedUrls.add(p.media_url);
    }

    // Uploads (data_url)
    const { data: uploads } = await supabase
      .from("agence_uploads")
      .select("data_url");
    for (const u of uploads || []) {
      if (u.data_url && u.data_url.startsWith("http")) referencedUrls.add(u.data_url);
    }

    // Wall posts (photo_url)
    const { data: wallPosts } = await supabase
      .from("agence_wall_posts")
      .select("photo_url")
      .not("photo_url", "is", null);
    for (const w of wallPosts || []) {
      if (w.photo_url) referencedUrls.add(w.photo_url);
    }

    // Models (avatar, banner)
    const { data: models } = await supabase
      .from("agence_models")
      .select("avatar, banner");
    for (const m of models || []) {
      if (m.avatar && m.avatar.startsWith("http")) referencedUrls.add(m.avatar);
      if (m.banner && m.banner.startsWith("http")) referencedUrls.add(m.banner);
    }

    // Step 3: Find orphans — resources whose URL isn't in any table
    const orphans = allResources.filter(r => !referencedUrls.has(r.secure_url));
    const totalBytes = orphans.reduce((sum, r) => sum + r.bytes, 0);

    // Step 4: Delete orphans if not dry run
    let deleted: Record<string, string> = {};
    if (!dryRun && orphans.length > 0) {
      const imageOrphans = orphans.filter(r => r.type === "image").map(r => r.public_id);
      const videoOrphans = orphans.filter(r => r.type === "video").map(r => r.public_id);

      if (imageOrphans.length > 0) {
        const imgResult = await bulkDeleteCloudinary(imageOrphans, "image");
        Object.assign(deleted, imgResult.deleted);
      }
      if (videoOrphans.length > 0) {
        const vidResult = await bulkDeleteCloudinary(videoOrphans, "video");
        Object.assign(deleted, vidResult.deleted);
      }
    }

    const formatBytes = (b: number) => {
      if (b < 1024) return `${b} B`;
      if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
      return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    };

    return NextResponse.json({
      dry_run: dryRun,
      total_cloudinary: allResources.length,
      referenced: allResources.length - orphans.length,
      orphans: orphans.length,
      freed_bytes: totalBytes,
      freed_human: formatBytes(totalBytes),
      ...(dryRun
        ? {
            orphan_files: orphans.map(r => ({
              public_id: r.public_id,
              url: r.secure_url,
              size: formatBytes(r.bytes),
              created: r.created_at,
              type: r.type,
            })),
            message: "Dry run — add ?dry_run=false to actually delete",
          }
        : {
            deleted_count: Object.keys(deleted).length,
            deleted,
            message: `Deleted ${Object.keys(deleted).length} orphaned files, freed ${formatBytes(totalBytes)}`,
          }),
    }, { headers: cors });
  } catch (err) {
    console.error("[API/upload/cleanup] Error:", err);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500, headers: cors },
    );
  }
}
