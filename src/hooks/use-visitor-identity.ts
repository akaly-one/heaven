import { useEffect, useState, useCallback } from "react";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";
import { toModelId } from "@/lib/model-utils";
import type { ModelInfo, VisitorPlatform } from "@/types/heaven";

interface UseVisitorIdentityParams {
  slug: string;
  model: ModelInfo | null;
}

interface UseVisitorIdentityReturn {
  clientId: string | null;
  visitorPlatform: VisitorPlatform | null;
  visitorHandle: string;
  visitorRegistered: boolean;
  visitorVerified: boolean;
  registerClient: (platform?: VisitorPlatform, handle?: string) => Promise<Record<string, unknown> | null>;
  setClientId: React.Dispatch<React.SetStateAction<string | null>>;
  setVisitorPlatform: React.Dispatch<React.SetStateAction<VisitorPlatform | null>>;
  setVisitorHandle: React.Dispatch<React.SetStateAction<string>>;
  setVisitorRegistered: React.Dispatch<React.SetStateAction<boolean>>;
  setVisitorVerified: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Manages visitor identity: restore from storage, register new clients,
 * log connections, and poll for model-verified status.
 */
export function useVisitorIdentity({ slug, model }: UseVisitorIdentityParams): UseVisitorIdentityReturn {
  const modelId = toModelId(slug);

  const [clientId, setClientId] = useState<string | null>(null);
  const [visitorPlatform, setVisitorPlatform] = useState<VisitorPlatform | null>(null);
  const [visitorHandle, setVisitorHandle] = useState("");
  const [visitorRegistered, setVisitorRegistered] = useState(false);
  const [visitorVerified, setVisitorVerified] = useState(false);

  // Restore visitor identity from session/localStorage
  useEffect(() => {
    if (!slug) return;
    try {
      const saved = sessionStorage.getItem(`heaven_client_${slug}`) || localStorage.getItem(`heaven_client_${slug}`);
      if (saved) {
        const client = JSON.parse(saved);
        setClientId(client.id);
        if (client.verified_status === "verified") setVisitorVerified(true);
        if (client.pseudo_snap) { setVisitorPlatform("snap"); setVisitorHandle(client.pseudo_snap); setVisitorRegistered(true); }
        else if (client.pseudo_insta) { setVisitorPlatform("insta"); setVisitorHandle(client.pseudo_insta); setVisitorRegistered(true); }
        else if (client.phone) { setVisitorPlatform("phone"); setVisitorHandle(client.phone); setVisitorRegistered(true); }
        else if (client.nickname) { setVisitorPlatform("pseudo"); setVisitorHandle(client.nickname); setVisitorRegistered(true); }
        // Sync to sessionStorage if only in localStorage
        if (!sessionStorage.getItem(`heaven_client_${slug}`)) {
          sessionStorage.setItem(`heaven_client_${slug}`, saved);
        }
        // Log connection with fingerprint
        if (client.id && slug) {
          const fp = getDeviceFingerprint();
          fetch("/api/clients/visit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: modelId, client_id: client.id, action: "connection", fingerprint: fp }),
          }).catch(() => {});
        }
      }
    } catch {}
  }, [slug, modelId]);

  // Register client (unified: wall + chat share same identity)
  const registerClient = useCallback(async (platform?: VisitorPlatform, handle?: string): Promise<Record<string, unknown> | null> => {
    const p = platform || visitorPlatform;
    const h = handle || visitorHandle;
    if (!p || !h.trim()) return null;
    const payload: Record<string, unknown> = { model: modelId };
    if (p === "snap") payload.pseudo_snap = h.trim();
    else if (p === "insta") payload.pseudo_insta = h.trim();
    else if (p === "phone") payload.phone = h.trim();
    else payload.nickname = h.trim();

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.client) {
      setClientId(data.client.id);
      setVisitorPlatform(p);
      setVisitorHandle(h.trim());
      setVisitorRegistered(true);
      sessionStorage.setItem(`heaven_client_${slug}`, JSON.stringify(data.client));
      localStorage.setItem(`heaven_client_${slug}`, JSON.stringify(data.client));
      return data.client;
    }
    return null;
  }, [visitorPlatform, visitorHandle, slug, modelId]);

  // Poll verified_status from DB (model may verify while visitor is browsing)
  useEffect(() => {
    if (!clientId || visitorVerified) return;
    const check = () => {
      fetch(`/api/clients?model=${modelId}&check_id=${clientId}`)
        .then(r => r.json())
        .then(d => {
          const clients = d.clients || [];
          const me = clients.find((c: { id: string }) => c.id === clientId);
          if (me?.verified_status === "verified") {
            setVisitorVerified(true);
            // Update stored session
            const saved = sessionStorage.getItem(`heaven_client_${slug}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              parsed.verified_status = "verified";
              sessionStorage.setItem(`heaven_client_${slug}`, JSON.stringify(parsed));
              localStorage.setItem(`heaven_client_${slug}`, JSON.stringify(parsed));
            }
          }
        })
        .catch(() => {});
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [clientId, slug, visitorVerified, modelId]);

  return {
    clientId, visitorPlatform, visitorHandle, visitorRegistered, visitorVerified,
    registerClient,
    setClientId, setVisitorPlatform, setVisitorHandle, setVisitorRegistered, setVisitorVerified,
  };
}
