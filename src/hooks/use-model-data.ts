import { useEffect, useState, useCallback } from "react";
import { toModelId } from "@/lib/model-utils";
import type { ModelInfo, Post, PackConfig, UploadedContent, WallPost } from "@/types/heaven";

interface UseModelDataReturn {
  model: ModelInfo | null;
  posts: Post[];
  stories: Post[];
  packs: PackConfig[];
  uploads: UploadedContent[];
  wallPosts: WallPost[];
  loading: boolean;
  notFound: boolean;
  setModel: React.Dispatch<React.SetStateAction<ModelInfo | null>>;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  setUploads: React.Dispatch<React.SetStateAction<UploadedContent[]>>;
  setWallPosts: React.Dispatch<React.SetStateAction<WallPost[]>>;
  setPacks: React.Dispatch<React.SetStateAction<PackConfig[]>>;
  setStories: React.Dispatch<React.SetStateAction<Post[]>>;
  refresh: () => void;
}

/**
 * Fetches all model data (profile, posts, stories, packs, uploads, wall).
 * Also refreshes uploads & wall on window focus.
 */
export function useModelData(slug: string): UseModelDataReturn {
  const modelId = toModelId(slug);

  const [model, setModel] = useState<ModelInfo | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Post[]>([]);
  const [packs, setPacks] = useState<PackConfig[]>([]);
  const [uploads, setUploads] = useState<UploadedContent[]>([]);
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Full data load
  const loadData = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/models/${slug}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch(`/api/posts?model=${modelId}`).then(r => r.json()).catch(e => { console.error("[Profile] posts fetch failed:", e); return { posts: [] }; }),
      fetch(`/api/packs?model=${modelId}`).then(r => r.json()).catch(e => { console.error("[Profile] packs fetch failed:", e); return { packs: [] }; }),
      fetch(`/api/uploads?model=${modelId}`).then(r => r.json()).catch(e => { console.error("[Profile] uploads fetch failed:", e); return { uploads: [] }; }),
      fetch(`/api/wall?model=${modelId}`).then(r => r.json()).catch(e => { console.error("[Profile] wall fetch failed:", e); return { posts: [] }; }),
    ]).then(([modelData, postsData, packsData, uploadsData, wallData]) => {
      setModel(modelData);
      if (modelData?.display_name) document.title = `${modelData.display_name} — Heaven`;
      setPosts(postsData.posts || []);
      setPacks(packsData.packs || []);
      setUploads(uploadsData.uploads || []);
      setWallPosts(wallData.posts || []);
      // Fetch stories
      fetch(`/api/posts?model=${modelId}&type=story`).then(r => r.json()).then(d => {
        setStories((d.posts || []).filter((p: Post) => p.media_url));
      }).catch(() => {});
    }).catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [slug, modelId]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh uploads & wall on window focus
  useEffect(() => {
    const onFocus = () => {
      fetch(`/api/uploads?model=${modelId}`).then(r => r.json()).then(d => { if (d.uploads) setUploads(d.uploads); }).catch(e => console.error("[Profile] refresh uploads failed:", e));
      fetch(`/api/wall?model=${modelId}`).then(r => r.json()).then(d => { if (d.posts) setWallPosts(d.posts); }).catch(e => console.error("[Profile] refresh wall failed:", e));
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [modelId]);

  return {
    model, posts, stories, packs, uploads, wallPosts,
    loading, notFound,
    setModel, setPosts, setUploads, setWallPosts, setPacks, setStories,
    refresh: loadData,
  };
}
