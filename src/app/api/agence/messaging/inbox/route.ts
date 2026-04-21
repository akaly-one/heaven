import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/jwt";

/**
 * Heaven proxy — Messaging inbox (unified web + IG + Fanvue + Snap).
 * Forwards to SQWENSY source of truth.
 *
 * GET  /api/agence/messaging/inbox?thread_id=xxx  → threads + current + messages + client
 * POST /api/agence/messaging/inbox                 → send outbound message
 *
 * Session-auth: any logged model sees only their own threads.
 */

const SQWENSY_API = process.env.OS_BEACON_URL || process.env.SQWENSY_URL || "";
const SQWENSY_API_KEY = process.env.AUTOMATION_API_KEY || "";

interface Session {
  role?: string;
  sub?: string;
  model_slug?: string;
}

async function getSession(req: NextRequest): Promise<Session | null> {
  const token = req.cookies.get("heaven_session")?.value;
  if (!token) return null;
  try {
    return (await verifySessionToken(token)) as Session;
  } catch {
    return null;
  }
}

function resolveModelSlug(session: Session, fallback: string): string {
  // root defaults to yumi (agency main profile); otherwise their own slug
  if (session.role === "root") return fallback;
  return String(session.sub || session.model_slug || fallback).toLowerCase();
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const requestedModel = (searchParams.get("model") || "yumi").toLowerCase();
  const threadId = searchParams.get("thread_id");

  // Force model to session's own slug unless root
  const model = resolveModelSlug(session, requestedModel);

  const qs = new URLSearchParams({ model });
  if (threadId) qs.set("thread_id", threadId);

  const res = await fetch(`${SQWENSY_API}/api/agence/messaging/inbox?${qs.toString()}`, {
    headers: {
      "x-api-key": SQWENSY_API_KEY,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();

  const res = await fetch(`${SQWENSY_API}/api/agence/messaging/inbox`, {
    method: "POST",
    headers: {
      "x-api-key": SQWENSY_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
