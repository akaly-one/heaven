"use client";

/**
 * PostComposer — BRIEF-23 (Session 2026-04-25 evening)
 * ────────────────────────────────────────────────────
 * Composant inline pour publier text + photo depuis le profil admin.
 *
 * Pattern SPRBP : visible UNIQUEMENT si `canPost === true` (admin connecté).
 * Réutilise les routes API existantes : POST /api/upload (Cloudinary) +
 * POST /api/wall (text + media_url).
 *
 * Responsive mobile-first : full-width mobile, max-w-2xl desktop, touch
 * targets 44×44 minimum.
 */

import { useState, useRef } from "react";
import { Send, Image as ImageIcon, X, Loader2 } from "lucide-react";

interface PostComposerProps {
  /** Permission post (true = admin connecté propriétaire). */
  canPost: boolean;
  /** Slug du modèle pour le champ `model` du POST. */
  slug: string;
  /** Callback optionnel après post réussi (ex: refresh feed). */
  onPosted?: () => void;
}

const MAX_PHOTO_MB = 10;
const MAX_TEXT_CHARS = 500;

export function PostComposer({ canPost, slug, onPosted }: PostComposerProps) {
  const [text, setText] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!canPost) return null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setError(`Photo > ${MAX_PHOTO_MB} MB`);
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!text.trim() && !photoFile) return;
    setPosting(true);
    setError(null);
    try {
      let mediaUrl: string | null = null;

      // Upload Cloudinary si photo présente
      if (photoFile) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = () => reject(new Error("Lecture fichier échouée"));
          reader.readAsDataURL(photoFile);
        });
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: dataUrl, folder: `heaven/${slug}/wall` }),
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok || !uploadJson?.url) {
          throw new Error(uploadJson?.error || "Upload Cloudinary échoué");
        }
        mediaUrl = uploadJson.url as string;
      }

      // POST wall
      const postRes = await fetch("/api/wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: slug,
          content: text.trim(),
          media_url: mediaUrl,
          author_type: "model",
        }),
      });
      if (!postRes.ok) {
        const data = await postRes.json().catch(() => ({}));
        throw new Error(data?.error || "Post échoué");
      }

      // Reset
      setText("");
      setPhotoFile(null);
      setPhotoPreview(null);
      onPosted?.();
      // Event global pour refresh feed côté parent
      window.dispatchEvent(new CustomEvent("heaven:wall-refresh"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div
      className="w-full max-w-2xl mx-auto mb-3 sm:mb-5 p-3 sm:p-4 rounded-2xl"
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_CHARS))}
        placeholder="Quoi de neuf ?"
        rows={2}
        className="w-full bg-transparent outline-none resize-none text-sm sm:text-base"
        style={{ color: "var(--text)" }}
        disabled={posting}
        aria-label="Contenu du post"
      />

      {photoPreview && (
        <div className="relative mt-2 inline-block">
          <img src={photoPreview} alt="Aperçu photo" className="max-h-40 sm:max-h-60 rounded-lg" />
          <button
            type="button"
            onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
            className="absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all hover:brightness-110"
            style={{ background: "rgba(0,0,0,0.7)", color: "#fff", border: "none" }}
            aria-label="Retirer la photo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && <p className="text-xs mt-2" style={{ color: "#EF4444" }}>{error}</p>}

      <div className="flex items-center justify-between mt-3 gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={posting}
          aria-label="Ajouter une photo"
          className="p-2 rounded-lg cursor-pointer flex items-center gap-1 text-xs sm:text-sm transition-all hover:bg-white/[0.06] border-none bg-transparent"
          style={{ color: "var(--text-muted)", minHeight: 44, minWidth: 44 }}
        >
          <ImageIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Photo</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
        />

        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {text.length}/{MAX_TEXT_CHARS}
        </span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={posting || (!text.trim() && !photoFile)}
          className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-40 transition-all hover:brightness-110"
          style={{
            background: "linear-gradient(135deg, var(--accent), #A78BFA)",
            color: "#fff",
            border: "none",
            minHeight: 44,
            minWidth: 88,
          }}
        >
          {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Publier
        </button>
      </div>
    </div>
  );
}
