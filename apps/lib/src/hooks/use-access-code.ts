import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";
import { toModelId } from "@/lib/model-utils";
import type { ModelInfo, AccessCode, VisitorPlatform } from "@/types/heaven";

interface UseAccessCodeParams {
  slug: string;
  model: ModelInfo | null;
}

interface UseAccessCodeReturn {
  unlockedTier: string | null;
  activeCode: AccessCode | null;
  accessChecked: boolean;
  expiredCodeInfo: { tier: string; pack: string } | null;
  setUnlockedTier: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveCode: React.Dispatch<React.SetStateAction<AccessCode | null>>;
  validateCode: (callbacks: {
    onClientIdentified?: (client: Record<string, unknown>, platform: VisitorPlatform, handle: string) => void;
    setGalleryTier?: (tier: string) => void;
  }) => void;
}

/**
 * Manages access code validation from URL tokens (?access=CODE or ?code=CODE),
 * session/localStorage restore, device security checks, and expired code tracking.
 */
export function useAccessCode({ slug, model }: UseAccessCodeParams): UseAccessCodeReturn {
  const searchParams = useSearchParams();
  const modelId = toModelId(slug);

  const [unlockedTier, setUnlockedTier] = useState<string | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [activeCode, setActiveCode] = useState<AccessCode | null>(null);
  const [expiredCodeInfo, setExpiredCodeInfo] = useState<{ tier: string; pack: string } | null>(null);

  // Restore saved access from session/localStorage
  useEffect(() => {
    if (!slug) return;
    try {
      const savedAccess = sessionStorage.getItem(`heaven_access_${slug}`) || localStorage.getItem(`heaven_access_${slug}`);
      if (savedAccess) {
        const parsed = JSON.parse(savedAccess);
        if (parsed.tier && parsed.expiresAt && new Date(parsed.expiresAt).getTime() > Date.now()) {
          setUnlockedTier(parsed.tier);
          setActiveCode({ code: parsed.code || "", tier: parsed.tier, expiresAt: parsed.expiresAt } as AccessCode);
        } else {
          sessionStorage.removeItem(`heaven_access_${slug}`);
          localStorage.removeItem(`heaven_access_${slug}`);
        }
      }
    } catch {}
  }, [slug]);

  // Validate access token from URL
  const validateCode = useCallback((callbacks: {
    onClientIdentified?: (client: Record<string, unknown>, platform: VisitorPlatform, handle: string) => void;
    setGalleryTier?: (tier: string) => void;
  }) => {
    const accessToken = searchParams.get("access") || searchParams.get("code");
    if (!accessToken || !slug || accessChecked) return;
    setAccessChecked(true);

    fetch("/api/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "validate", code: accessToken, model: modelId }),
    })
      .then(async r => {
        const data = await r.json();
        if (data.code?.tier) {
          setUnlockedTier(data.code.tier);
          setActiveCode(data.code);
          callbacks.setGalleryTier?.("feed");
          const accessData = JSON.stringify({ tier: data.code.tier, expiresAt: data.code.expiresAt, code: data.code.code });
          sessionStorage.setItem(`heaven_access_${slug}`, accessData);
          localStorage.setItem(`heaven_access_${slug}`, accessData);
          // Device security check
          const fp = getDeviceFingerprint();
          fetch("/api/codes/security", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code_id: data.code.id, fingerprint: fp, user_agent: navigator.userAgent }),
          }).then(r2 => r2.json()).then(sec => {
            if (!sec.allowed) {
              setUnlockedTier(null);
              setActiveCode(null);
              sessionStorage.removeItem(`heaven_access_${slug}`);
              localStorage.removeItem(`heaven_access_${slug}`);
              alert(sec.message || "Code bloque");
            }
          }).catch(() => {});
          // Auto-identify visitor from code's clientId
          if (data.code.clientId && callbacks.onClientIdentified) {
            (async () => {
              try {
                const clientRes = await fetch(`/api/clients/${data.code.clientId}?model=${modelId}`);
                if (clientRes.ok) {
                  const clientData = await clientRes.json();
                  const client = clientData.client;
                  if (client) {
                    let p: VisitorPlatform = "pseudo";
                    let h = client.id?.slice(0, 8) || "";
                    if (client.pseudo_snap) { p = "snap"; h = client.pseudo_snap; }
                    else if (client.pseudo_insta) { p = "insta"; h = client.pseudo_insta; }
                    else if (client.phone) { p = "phone"; h = client.phone; }
                    else if (client.nickname) { p = "pseudo"; h = client.nickname; }
                    callbacks.onClientIdentified!(client, p, h);
                  }
                }
              } catch {}
            })();
          }
        } else if (r.status === 410) {
          setExpiredCodeInfo({ tier: data.tier || "p1", pack: data.pack || "p1" });
        }
      })
      .catch(() => {});
  }, [searchParams, slug, accessChecked, modelId]);

  return {
    unlockedTier, activeCode, accessChecked, expiredCodeInfo,
    setUnlockedTier, setActiveCode, validateCode,
  };
}
