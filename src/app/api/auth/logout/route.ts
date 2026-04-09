import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);

  const response = NextResponse.json(
    { success: true },
    { status: 200, headers: cors }
  );

  response.cookies.set("heaven_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(req) });
}
