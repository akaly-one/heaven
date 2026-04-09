"use client";

import { useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toModelId } from "@/lib/model-utils";
import type { ModelInfo, PackConfig, UploadedContent } from "@/types/heaven";

interface UseEditModeParams {
  slug: string;
  isModelLoggedIn: boolean;
  model: ModelInfo | null;
  packs: PackConfig[];
  setModel: React.Dispatch<React.SetStateAction<ModelInfo | null>>;
  setPacks: React.Dispatch<React.SetStateAction<PackConfig[]>>;
  setUploads: React.Dispatch<React.SetStateAction<UploadedContent[]>>;
  setGalleryTier: React.Dispatch<React.SetStateAction<string>>;
}

interface UseEditModeReturn {
  isEditMode: boolean;
  editDirty: boolean;
  editSaving: boolean;
  editToast: string | null;
  editProfile: Partial<ModelInfo>;
  editPacks: PackConfig[] | null;
  displayModel: ModelInfo | null;
  displayPacks: PackConfig[];
  editingUploadId: string | null;
  editUploadData: Partial<UploadedContent>;
  uploading: boolean;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  bannerInputRef: React.RefObject<HTMLInputElement | null>;
  mediaInputRef: React.RefObject<HTMLInputElement | null>;
  setEditingUploadId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditUploadData: React.Dispatch<React.SetStateAction<Partial<UploadedContent>>>;
  updateEditField: (field: string, value: unknown) => void;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleAddMedia: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDeleteMedia: (id: string) => Promise<void>;
  handleUpdateMedia: (id: string, updates: Partial<UploadedContent>) => Promise<void>;
  handleUpdatePack: (packId: string, updates: Partial<PackConfig>) => void;
  handleAddPack: () => void;
  handleDeletePack: (packId: string) => void;
  saveAllEdits: () => Promise<void>;
  cancelEdits: () => void;
}

export function useEditMode({
  slug, isModelLoggedIn, model, packs,
  setModel, setPacks, setUploads, setGalleryTier,
}: UseEditModeParams): UseEditModeReturn {
  const searchParams = useSearchParams();
  const modelId = toModelId(slug);

  const isEditMode = searchParams.get("edit") === "true" && isModelLoggedIn;
  const [editDirty, setEditDirty] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editProfile, setEditProfile] = useState<Partial<ModelInfo>>({});
  const [editPacks, setEditPacks] = useState<PackConfig[] | null>(null);
  const [editingUploadId, setEditingUploadId] = useState<string | null>(null);
  const [editUploadData, setEditUploadData] = useState<Partial<UploadedContent>>({});
  const [editToast, setEditToast] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const displayModel = model ? { ...model, ...editProfile } : null;
  const displayPacks = editPacks ?? packs;

  const showToast = useCallback((msg: string, duration = 3000) => {
    setEditToast(msg);
    setTimeout(() => setEditToast(null), duration);
  }, []);

  // Upload to Cloudinary
  const uploadToCloudinary = useCallback(async (file: File, folder: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file: reader.result, folder }),
          });
          if (res.ok) {
            const data = await res.json();
            resolve(data.url);
          } else resolve(null);
        } catch { resolve(null); }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const updateEditField = useCallback((field: string, value: unknown) => {
    setEditProfile(prev => ({ ...prev, [field]: value }));
    setEditDirty(true);
  }, []);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, `heaven/${slug}/avatar`);
      if (url) {
        setModel(prev => prev ? { ...prev, avatar: url } : prev);
        updateEditField("avatar", url);
        fetch(`/api/models/${slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: url }),
        }).then(res => {
          if (res.ok) { setEditDirty(false); showToast("Avatar sauvegarde !"); }
          else showToast("Photo mise a jour (sync DB en attente)");
        }).catch(() => showToast("Photo mise a jour localement"));
      } else showToast("Erreur upload photo");
    } catch { showToast("Erreur"); }
    setUploading(false);
  }, [slug, uploadToCloudinary, updateEditField, setModel, showToast]);

  const handleBannerUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, `heaven/${slug}/banner`);
      if (url) {
        setModel(prev => prev ? { ...prev, banner: url } : prev);
        updateEditField("banner", url);
        fetch(`/api/models/${slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ banner: url }),
        }).then(res => {
          if (res.ok) { setEditDirty(false); showToast("Banniere sauvegardee !"); }
          else showToast("Banniere mise a jour (sync DB en attente)");
        }).catch(() => showToast("Banniere mise a jour localement"));
      } else showToast("Erreur upload");
    } catch { showToast("Erreur"); }
    setUploading(false);
  }, [slug, uploadToCloudinary, updateEditField, setModel, showToast]);

  const handleAddMedia = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadToCloudinary(file, `heaven/${slug}/content`);
    if (url) {
      const newUpload: UploadedContent = {
        id: `upl-${Date.now()}`,
        tier: "p1",
        type: file.type.startsWith("video/") ? "video" : "photo",
        label: "",
        dataUrl: url,
        uploadedAt: new Date().toISOString(),
        visibility: "pack",
        tokenPrice: 0,
        isNew: true,
      };
      try {
        const res = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...newUpload, model: modelId }),
        });
        const data = await res.json();
        if (res.ok) {
          setUploads(prev => [data.upload || newUpload, ...prev]);
          showToast("Média ajouté", 2000);
          setGalleryTier("feed");
        } else {
          console.error("[EditMode] Upload save failed:", data);
          showToast("Erreur: " + (data.error || "upload échoué"));
        }
      } catch (err) {
        console.error("[EditMode] Upload save error:", err);
        showToast("Erreur réseau");
      }
    }
    setUploading(false);
    if (mediaInputRef.current) mediaInputRef.current.value = "";
  }, [slug, modelId, uploadToCloudinary, setUploads, setGalleryTier, showToast]);

  const handleDeleteMedia = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/uploads?model=${modelId}&id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setUploads(prev => prev.filter(u => u.id !== id));
        showToast("Média supprimé", 2000);
      } else {
        const data = await res.json();
        console.error("[EditMode] Delete failed:", data);
        showToast("Erreur suppression");
      }
    } catch (err) {
      console.error("[EditMode] Delete error:", err);
    }
  }, [modelId, setUploads, showToast]);

  const handleUpdateMedia = useCallback(async (id: string, updates: Partial<UploadedContent>) => {
    try {
      const res = await fetch("/api/uploads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId, id, updates }),
      });
      if (res.ok) {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
        setEditingUploadId(null);
        setEditUploadData({});
        showToast("Média mis à jour", 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("[EditMode] Update failed:", data);
        showToast("Erreur mise à jour");
      }
    } catch (err) {
      console.error("[EditMode] Update error:", err);
      showToast("Erreur réseau", 2000);
    }
  }, [modelId, setUploads, showToast]);

  const handleUpdatePack = useCallback((packId: string, updates: Partial<PackConfig>) => {
    setEditPacks(prev => {
      const list = prev ?? [...packs];
      return list.map(p => p.id === packId ? { ...p, ...updates } : p);
    });
    setEditDirty(true);
  }, [packs]);

  const handleAddPack = useCallback(() => {
    setEditPacks(prev => {
      const list = prev ?? [...packs];
      return [...list, {
        id: `pack-${Date.now()}`,
        name: "New Pack",
        price: 100,
        color: "#7C6A2F",
        features: ["Feature 1"],
        face: false,
        badge: null,
        active: true,
      }];
    });
    setEditDirty(true);
  }, [packs]);

  const handleDeletePack = useCallback((packId: string) => {
    setEditPacks(prev => {
      const list = prev ?? [...packs];
      return list.filter(p => p.id !== packId);
    });
    setEditDirty(true);
  }, [packs]);

  const saveAllEdits = useCallback(async () => {
    setEditSaving(true);
    try {
      if (Object.keys(editProfile).length > 0) {
        const profileRes = await fetch(`/api/models/${slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editProfile),
        });
        if (!profileRes.ok) {
          const err = await profileRes.json().catch(() => ({}));
          throw new Error(err.error || "Erreur profil");
        }
        setModel(prev => prev ? { ...prev, ...editProfile } : prev);
      }
      if (editPacks) {
        const packsRes = await fetch("/api/packs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: modelId, packs: editPacks }),
        });
        if (!packsRes.ok) {
          const err = await packsRes.json().catch(() => ({}));
          throw new Error(err.error || "Erreur packs");
        }
        setPacks(editPacks);
      }
      setEditProfile({});
      setEditPacks(null);
      setEditDirty(false);
      showToast("Modifications sauvegardées !");
    } catch (err) {
      console.error("[EditMode] saveAll error:", err);
      showToast(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    }
    setEditSaving(false);
  }, [slug, modelId, editProfile, editPacks, setModel, setPacks, showToast]);

  const cancelEdits = useCallback(() => {
    setEditProfile({});
    setEditPacks(null);
    setEditDirty(false);
    setEditingUploadId(null);
    setEditUploadData({});
  }, []);

  return {
    isEditMode, editDirty, editSaving, editToast,
    editProfile, editPacks, displayModel, displayPacks,
    editingUploadId, editUploadData, uploading,
    avatarInputRef, bannerInputRef, mediaInputRef,
    setEditingUploadId, setEditUploadData,
    updateEditField, handleAvatarUpload, handleBannerUpload,
    handleAddMedia, handleDeleteMedia, handleUpdateMedia,
    handleUpdatePack, handleAddPack, handleDeletePack,
    saveAllEdits, cancelEdits,
  };
}
