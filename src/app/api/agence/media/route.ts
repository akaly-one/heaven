import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/jwt";

const SQWENSY_API = process.env.OS_BEACON_URL || process.env.SQWENSY_URL || "";
const SQWENSY_API_KEY = process.env.AUTOMATION_API_KEY || "";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("heaven_session")?.value;
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  try {
    await verifySessionToken(token);
  } catch {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  const qs = req.nextUrl.search;
  const res = await fetch(`${SQWENSY_API}/api/agence/media${qs}`, {
    headers: {
      "x-api-key": SQWENSY_API_KEY,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
