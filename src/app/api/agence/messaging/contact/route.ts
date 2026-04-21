import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/jwt";

const SQWENSY_API = process.env.OS_BEACON_URL || process.env.SQWENSY_URL || "";
const SQWENSY_API_KEY = process.env.AUTOMATION_API_KEY || "";

async function requireSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("heaven_session")?.value;
  if (!token) return false;
  try {
    await verifySessionToken(token);
    return true;
  } catch {
    return false;
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireSession(req))) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const body = await req.json();

  const res = await fetch(
    `${SQWENSY_API}/api/agence/messaging/contact?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        "x-api-key": SQWENSY_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  if (!(await requireSession(req))) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();

  const res = await fetch(`${SQWENSY_API}/api/agence/messaging/contact`, {
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
