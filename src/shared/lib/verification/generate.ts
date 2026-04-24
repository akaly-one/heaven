import crypto from "node:crypto";
import { getServerSupabase } from "@/lib/supabase-server";
import { hashIpSubnet, hashUserAgent, getClientIp, getUserAgent } from "./crypto";

// BRIEF-13 UV03 — Service de génération d'une verification pending pour un handle Snap/Insta
// Admin génère un lien+code que le fan devra cliquer/saisir depuis sa vraie IP

export interface VerificationGenerated {
  verification_id: string;
  token: string;
  code: string; // 6 chiffres
  link: string; // https://heaven-os.vercel.app/verify/{token}
  expires_at: string;
}

export interface GenerateVerificationParams {
  clientId: string;
  handle: string;
  platform: "snap" | "insta";
  adminCode: string;
  req: Request;
}

export type GenerateVerificationResult = VerificationGenerated | { error: string };

export async function generateVerification(
  params: GenerateVerificationParams
): Promise<GenerateVerificationResult> {
  const db = getServerSupabase();
  if (!db) return { error: "DB not configured" };

  // Capture request context (admin qui génère)
  const ipHash = hashIpSubnet(getClientIp(params.req));
  const uaHash = hashUserAgent(getUserAgent(params.req));

  // Generate secrets
  const token = crypto.randomBytes(16).toString("hex"); // 32 chars hex
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  // Insert
  const { data, error } = await db
    .from("agence_client_verifications")
    .insert({
      client_id: params.clientId,
      target_handle: params.handle,
      target_platform: params.platform,
      token,
      code_6digit: code,
      requested_ip_hash: ipHash,
      requested_ua_hash: uaHash,
      expires_at: expires,
      status: "pending",
    })
    .select("id, token, code_6digit, expires_at")
    .single();

  if (error || !data) return { error: error?.message || "insert failed" };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://heaven-os.vercel.app";
  return {
    verification_id: data.id as string,
    token: data.token as string,
    code: data.code_6digit as string,
    link: `${baseUrl}/verify/${data.token}`,
    expires_at: data.expires_at as string,
  };
}
