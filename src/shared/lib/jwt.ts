import { SignJWT, jwtVerify } from "jose";

const getSecret = () => new TextEncoder().encode(process.env.HEAVEN_JWT_SECRET);

/**
 * JWT payload Heaven session.
 *
 * Compat note (Agent 1.B Phase 1):
 * - `role` reste `'root' | 'model'` pour ne pas casser ~30 fichiers existants
 *   (api-auth.ts requireRoot, middleware, model-context, sidebar...).
 *   `'root'` = admin tier (yumi, heaven, root). `'model'` = paloma, ruby.
 * - `scope: string[]` est legacy (tableau de slugs accessibles, ex: ['/agence']).
 * - `model_id`: nouveau claim canonical 'm1'/'m2'/'m3' ou null pour root dev.
 * - `model_slug`: slug entite ('yumi'/'paloma'/'ruby') ou null pour root dev.
 * - `scopes`: nouveau claim granulaire (['dmca:read','contract:view',...] ou ['*']).
 */
export interface HeavenTokenPayload {
  sub: string;                 // model_slug ou "root"
  role: "root" | "model";
  scope: string[];             // legacy: paths accessibles
  display_name: string;
  model_id?: string | null;    // canonical: 'm1' | 'm2' | 'm3' | null
  model_slug?: string | null;  // 'yumi' | 'paloma' | 'ruby' | null
  scopes?: string[];           // granular: ['dmca:read', ...] ou ['*']
}

export async function createSessionToken(payload: HeavenTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<HeavenTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as HeavenTokenPayload;
}
