// ══════════════════════════════════════════════════════════════════════════
//  /api/agence/accounts/[code]/reset-code — regenerer code login
//
//  Agent 10.A Phase 10 : admin only. Genere un nouveau code alphanumerique
//  (8 chars) unique et le persiste dans agence_accounts.code. Retourne le
//  nouveau code une seule fois (ne sera plus lisible ensuite cote client).
//
//  POST  → body optionnel { length?: 6..10 }. Default 8.
//  Admin only (role='root' OR model=yumi OR scope manage_entities/*).
// ══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const AGENCY_ADMIN_SLUGS = ["yumi"];
const ROOT_MASTER_MARKERS = new Set(["m0", "root"]); // model_id ou model_slug identifiant ROOT
const DEFAULT_LENGTH = 8;
const MIN_LENGTH = 6;
const MAX_LENGTH = 10;
// Exclut 0/O/1/l/I pour eviter confusions visuelles
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

type SessionLike = {
  role?: string;
  sub?: string;
  model_slug?: string | null;
  scopes?: string[];
} | null;

function isAdminSession(user: SessionLike): boolean {
  if (!user) return false;
  if (user.role === "root") return true;
  const slug = String(user.sub || user.model_slug || "").toLowerCase();
  if (user.role === "model" && AGENCY_ADMIN_SLUGS.includes(slug)) return true;
  const scopes = user.scopes ?? [];
  if (scopes.includes("*") || scopes.includes("manage_entities")) return true;
  return false;
}

// Hiérarchie NB 2026-04-24 :
//   Root Master (role=root, model_slug=null ou slug=root) → peut éditer tous
//   Yumi root-fusion (role=root, model_slug='yumi') → peut éditer modèles SAUF Root Master
//   Model (paloma/ruby) → uniquement son propre compte
function isRootMaster(user: SessionLike): boolean {
  if (!user || user.role !== "root") return false;
  const slug = String(user.sub || user.model_slug || "").toLowerCase();
  return slug === "" || slug === "root";
}

type TargetAccount = { model_id?: string | null; model_slug?: string | null; role?: string | null };

function canEditTarget(user: SessionLike, target: TargetAccount): boolean {
  if (!user) return false;
  const targetIsRootMaster =
    ROOT_MASTER_MARKERS.has(String(target.model_id ?? "").toLowerCase()) ||
    ROOT_MASTER_MARKERS.has(String(target.model_slug ?? "").toLowerCase()) ||
    (target.role === "root" && !target.model_slug);

  if (isRootMaster(user)) return true;

  // Yumi (root-fusion) : tout sauf Root Master
  const userSlug = String(user.sub || user.model_slug || "").toLowerCase();
  if (user.role === "root" && AGENCY_ADMIN_SLUGS.includes(userSlug)) {
    return !targetIsRootMaster;
  }

  // Model : seulement son propre compte
  if (user.role === "model") {
    return userSlug === String(target.model_slug ?? "").toLowerCase();
  }
  return false;
}

function generateCode(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminSession(user)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { code: currentCode } = await ctx.params;
  if (!currentCode) return NextResponse.json({ error: "code requis" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const reqLength = Number(body?.length ?? DEFAULT_LENGTH);
  const length = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, isFinite(reqLength) ? reqLength : DEFAULT_LENGTH));
  // NB 2026-04-24 : root peut définir un code CUSTOM (password au choix) au lieu
  // du code généré aléatoire. Validation : 4-32 chars, alphanum + _ - .
  const customCode = typeof body?.custom_code === "string" ? body.custom_code.trim() : "";
  const CUSTOM_CODE_REGEX = /^[a-zA-Z0-9_\-.]{4,32}$/;
  if (customCode && !CUSTOM_CODE_REGEX.test(customCode)) {
    return NextResponse.json({
      error: "Code custom invalide : 4-32 caractères alphanumériques, _ - . autorisés",
    }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  // Verifie que le compte existe
  const { data: account, error: fetchErr } = await db
    .from("agence_accounts")
    .select("id, code, display_name, active, role, model_id, model_slug")
    .eq("code", currentCode)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!account) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

  // Hiérarchie : empêche Yumi de modifier Root Master, modèle de modifier autres, etc.
  if (!canEditTarget(user, account)) {
    return NextResponse.json({
      error: "Accès refusé : hiérarchie. Seul Root peut modifier ce compte.",
    }, { status: 403 });
  }

  // Mode custom : utilise directement le code fourni (avec check collision)
  let newCode = "";
  if (customCode) {
    const { data: exists } = await db
      .from("agence_accounts")
      .select("id")
      .eq("code", customCode)
      .neq("id", account.id)
      .maybeSingle();
    if (exists) {
      return NextResponse.json({ error: "Ce code est déjà utilisé par un autre compte" }, { status: 409 });
    }
    newCode = customCode;
  } else {
    // Mode random : retry si collision (très rare)
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCode(length);
      const { data: exists } = await db
        .from("agence_accounts")
        .select("id")
        .eq("code", candidate)
        .maybeSingle();
      if (!exists) {
        newCode = candidate;
        break;
      }
    }
  }

  if (!newCode) {
    return NextResponse.json({ error: "Impossible de generer un code unique" }, { status: 500 });
  }

  const { error: updErr } = await db
    .from("agence_accounts")
    .update({ code: newCode, last_login: null })
    .eq("id", account.id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // CRITIQUE : le nouveau code est retourne UNE SEULE FOIS. Jamais loggue serveur.
  return NextResponse.json({
    success: true,
    account_id: account.id,
    display_name: account.display_name,
    new_code: newCode,
    warning: "Ce code ne sera plus relisible — note-le maintenant.",
  });
}
