import { NextRequest, NextResponse } from "next/server";

/**
 * PUBLIC — Resolve the current profile photo URL for a given login alias.
 * Used by the login page avatar bubble to live-sync with the model's CP profile photo.
 *
 * GET /api/models/photo?login=yumiiiclub
 * Returns: { url: string | null, slug: string | null }
 *
 * SSOT = agence_model_profiles.avatar_url (Main DB via SQWENSY).
 * Env var fallback kept for emergency overrides.
 */

const SQWENSY_API = process.env.OS_BEACON_URL || process.env.SQWENSY_URL || "";
const SQWENSY_API_KEY = process.env.AUTOMATION_API_KEY || "";

function normalizeLogin(v: string): string {
  return v.trim().replace(/^@/, "").toLowerCase();
}

function envFallback(slug: string): string | null {
  const key = `NEXT_PUBLIC_${slug.toUpperCase()}_PORTRAIT_URL`;
  const v = process.env[key];
  return v && /^https?:\/\//.test(v) ? v : null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = normalizeLogin(searchParams.get("login") || "");

  if (!raw || raw.length < 3) {
    return NextResponse.json({ url: null, slug: null });
  }

  // Query SQWENSY for model whose login_aliases contains this login
  if (SQWENSY_API && SQWENSY_API_KEY) {
    try {
      const res = await fetch(`${SQWENSY_API}/api/agence/profiles`, {
        headers: {
          "x-api-key": SQWENSY_API_KEY,
          "Content-Type": "application/json",
        },
        next: { revalidate: 30 },
      });
      if (res.ok) {
        const data = await res.json();
        const profiles: Array<{
          handle?: string;
          name?: string;
          avatar_url?: string | null;
          avatarUrl?: string | null;
          login_aliases?: string[];
          loginAliases?: string[];
        }> = Array.isArray(data.profiles) ? data.profiles : [];

        for (const p of profiles) {
          const slug = String(p.handle || "").replace("@", "").toLowerCase();
          const aliases = (p.login_aliases || p.loginAliases || [slug])
            .map((a) => String(a).toLowerCase());
          if (aliases.includes(raw)) {
            const url = p.avatar_url || p.avatarUrl || envFallback(slug);
            return NextResponse.json(
              { url, slug },
              {
                headers: {
                  "Cache-Control": "public, max-age=30, stale-while-revalidate=30",
                },
              }
            );
          }
        }
      }
    } catch {
      // Fall through to env fallback below
    }
  }

  // Env fallback (resolve slug from hardcoded aliases)
  const HARDCODED_ALIASES: Record<string, string[]> = {
    yumi: ["yumi", "yumiiiclub"],
    ruby: ["ruby", "rubyyyclub"],
    paloma: ["paloma", "palomaaclub"],
  };
  for (const [slug, aliases] of Object.entries(HARDCODED_ALIASES)) {
    if (aliases.includes(raw)) {
      return NextResponse.json({ url: envFallback(slug), slug });
    }
  }

  return NextResponse.json({ url: null, slug: null });
}
