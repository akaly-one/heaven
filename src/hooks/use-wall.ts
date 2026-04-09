import { useState, useCallback } from "react";
import { toModelId } from "@/lib/model-utils";
import type { WallPost, VisitorPlatform } from "@/types/heaven";

interface UseWallParams {
  slug: string;
  clientId: string | null;
  visitorHandle: string;
  visitorPlatform: VisitorPlatform | null;
  registerClient: () => Promise<Record<string, unknown> | null>;
  setWallPosts: React.Dispatch<React.SetStateAction<WallPost[]>>;
}

interface UseWallReturn {
  wallContent: string;
  setWallContent: React.Dispatch<React.SetStateAction<string>>;
  wallPosting: boolean;
  submitWallPost: () => Promise<void>;
}

/**
 * Manages wall posting: content state, auto-register client, submit post.
 */
export function useWall({
  slug, clientId, visitorHandle, visitorPlatform,
  registerClient, setWallPosts,
}: UseWallParams): UseWallReturn {
  const modelId = toModelId(slug);

  const [wallContent, setWallContent] = useState("");
  const [wallPosting, setWallPosting] = useState(false);

  const submitWallPost = useCallback(async () => {
    if (!visitorHandle.trim() || !visitorPlatform) return;
    if (!wallContent.trim()) return;
    setWallPosting(true);
    try {
      // Auto-register client if not yet registered
      let cId = clientId;
      if (!cId) {
        const client = await registerClient();
        if (client) cId = client.id as string;
      }

      const postRes = await fetch("/api/wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelId,
          pseudo: visitorHandle.trim(),
          content: wallContent.trim(),
          pseudo_snap: visitorPlatform === "snap" ? visitorHandle.trim() : null,
          pseudo_insta: visitorPlatform === "insta" ? visitorHandle.trim() : null,
          client_id: cId || null,
        }),
      });

      if (!postRes.ok) {
        const errData = await postRes.json().catch(() => ({ error: "Post failed" }));
        console.error("[Profile] wall post error:", errData);
        return;
      }

      const { post: newPost } = await postRes.json();
      setWallContent("");

      if (newPost) {
        setWallPosts(prev => [newPost, ...prev]);
      } else {
        const res = await fetch(`/api/wall?model=${modelId}`);
        if (res.ok) { const d = await res.json(); setWallPosts(d.posts || []); }
      }
    } catch (err) {
      console.error("[Profile] wall post failed:", err);
    } finally {
      setWallPosting(false);
    }
  }, [slug, clientId, visitorHandle, visitorPlatform, wallContent, modelId, registerClient, setWallPosts]);

  return { wallContent, setWallContent, wallPosting, submitWallPost };
}
