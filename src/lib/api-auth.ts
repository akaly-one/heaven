import { verifySessionToken, type HeavenTokenPayload } from "./jwt";
import { cookies } from "next/headers";

export async function getAuthUser(): Promise<HeavenTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("heaven_session")?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<HeavenTokenPayload> {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRoot(): Promise<HeavenTokenPayload> {
  const user = await requireAuth();
  if (user.role !== "root") throw new Error("Root access required");
  return user;
}
