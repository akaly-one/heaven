import { NextResponse } from "next/server";

// Temporary debug endpoint — DELETE after diagnosis
export async function GET() {
  return NextResponse.json({
    has_jwt: !!process.env.HEAVEN_JWT_SECRET,
    has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV || "not-vercel",
  });
}
