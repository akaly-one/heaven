import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/jwt";

/**
 * Heaven proxy — Yumii Agency model profiles management.
 * Forwards to SQWENSY OS (source of truth on Main DB).
 *
 * GET  /api/agence/model-profiles         → list all profiles
 * GET  /api/agence/model-profiles?id=xxx  → single profile
 * PATCH /api/agence/model-profiles?id=xxx → update code / aliases / etc.
 *
 * Auth: ROOT only. Models see their own entry elsewhere (read-only).
 */

const SQWENSY_API = process.env.OS_BEACON_URL || process.env.SQWENSY_URL || "";
const SQWENSY_API_KEY = process.env.SQWENSY_API_KEY || process.env.AUTOMATION_API_KEY || "";

// Yumii Agency admin = root (NB) OR YUMI herself (she owns the agency).
// Other models (Ruby, Paloma) are NOT allowed to manage codes.
const AGENCY_ADMIN_SLUGS = ["yumi"];

async function requireAgencyAdmin(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("heaven_session")?.value;
  if (!token) return "Session manquante";
  try {
    const session = await verifySessionToken(token);
    const role = String(session.role || "");
    const slug = String(session.sub || "").toLowerCase();
    if (role === "root") return null;
    if (role === "model" && AGENCY_ADMIN_SLUGS.includes(slug)) return null;
    return "Accès réservé à l'administration Yumii Agency";
  } catch {
    return "Session invalide";
  }
}

export async function GET(req: NextRequest) {
  const err = await requireAgencyAdmin(req);
  if (err) return NextResponse.json({ error: err }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  const url = id
    ? `${SQWENSY_API}/api/agence/profiles/${id}`
    : `${SQWENSY_API}/api/agence/profiles`;

  const res = await fetch(url, {
    headers: {
      "x-api-key": SQWENSY_API_KEY,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(req: NextRequest) {
  const err = await requireAgencyAdmin(req);
  if (err) return NextResponse.json({ error: err }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  const body = await req.json();

  const res = await fetch(`${SQWENSY_API}/api/agence/profiles/${id}`, {
    method: "PATCH",
    headers: {
      "x-api-key": SQWENSY_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
