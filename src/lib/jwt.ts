import { SignJWT, jwtVerify } from "jose";

const getSecret = () => new TextEncoder().encode(process.env.HEAVEN_JWT_SECRET);

export interface HeavenTokenPayload {
  sub: string;          // model_slug ou "root"
  role: "root" | "model";
  scope: string[];
  display_name: string;
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
