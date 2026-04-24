import crypto from "node:crypto";

// BRIEF-13 UV03 — Hashing IP/UA for privacy-preserving verification
// Loose match via /24 subnet (IPv4) or /48 prefix (IPv6) — RGPD : pas de stockage IP brute

const SALT = process.env.VERIFICATION_SALT || "heaven-verif-default-salt-2026";

/**
 * Hashe un subnet /24 (IPv4) ou les 3 premiers segments (IPv6) avec SHA256 + salt.
 * Retourne les 16 premiers chars hex. Permet loose match sans stocker IP brute.
 */
export function hashIpSubnet(ip: string | null | undefined): string | null {
  if (!ip) return null;
  // IPv4 /24 subnet
  const v4 = ip.match(/^(\d+\.\d+\.\d+)\./);
  if (v4) {
    return crypto.createHash("sha256").update(v4[1] + SALT).digest("hex").slice(0, 16);
  }
  // IPv6 — prendre les 3 premiers segments hex
  const v6 = ip.match(/^([0-9a-fA-F:]+)/);
  if (v6) {
    const segs = v6[1].split(":").slice(0, 3).join(":");
    return crypto.createHash("sha256").update(segs + SALT).digest("hex").slice(0, 16);
  }
  return null;
}

/**
 * Hashe le User-Agent base (browser + major version, sans détail OS/device).
 * Fallback : 60 premiers chars du UA brut.
 */
export function hashUserAgent(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const base = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/(\d+)/);
  const key = base ? `${base[1]}/${base[2]}` : ua.slice(0, 60);
  return crypto.createHash("sha256").update(key + SALT).digest("hex").slice(0, 16);
}

/**
 * Compare deux hashs IP (déjà subnet /24 par design → loose match natif).
 */
export function compareIpLoose(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a === b;
}

/**
 * Compare deux hashs UA (browser+major version → tolère MAJ mineures OS).
 */
export function compareUaLoose(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a === b;
}

/**
 * Extrait l'IP du client depuis les headers Next.js (x-forwarded-for prioritaire, puis x-real-ip).
 */
export function getClientIp(req: Request | { headers: Headers }): string | null {
  const h = "headers" in req ? req.headers : new Headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = h.get("x-real-ip");
  if (realIp) return realIp;
  return null;
}

/**
 * Extrait le User-Agent depuis les headers.
 */
export function getUserAgent(req: Request | { headers: Headers }): string | null {
  const h = "headers" in req ? req.headers : new Headers();
  return h.get("user-agent");
}
