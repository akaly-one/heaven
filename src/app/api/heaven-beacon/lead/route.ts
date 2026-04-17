import { NextRequest, NextResponse } from "next/server";

const OS_URL = process.env.OS_BEACON_URL || "";

export async function POST(req: NextRequest) {
  if (!OS_URL) {
    return NextResponse.json(
      { error: "OS_BEACON_URL not configured" },
      { status: 503 }
    );
  }
  const body = await req.json();
  try {
    const upstream = await fetch(`${OS_URL}/api/beacon/lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
