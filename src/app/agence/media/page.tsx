"use client";

import { useState, useEffect, useCallback } from "react";
import { useModel } from "@/lib/model-context";
import { OsLayout } from "@/components/os-layout";
import { ArrowLeft, Trash2, Search, Image, Check } from "lucide-react";
import type { FeedPost as Post } from "@/types/heaven";

export default function MediaPage() {
  const { currentModel, authHeaders } = useModel();
  const model = currentModel || "yumi";
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "public" | "vip" | "gold" | "diamond" | "platinum">("all");

  const fetchPosts = useCallback(() => {
    fetch(`/api/posts?model=${model}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setPosts(d.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [model, authHeaders]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const imagePosts = posts.filter(p => p.media_url);
  const filtered = filter === "all" ? imagePosts : imagePosts.filter(p => (p.tier_required || "public") === filter);

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectAll = () => setSelected(new Set(filtered.map(p => p.id)));
  const selectNone = () => setSelected(new Set());

  const deleteSelected = async () => {
    if (!confirm(`Supprimer ${selected.size} post(s) ?`)) return;
    for (const id of selected) {
      await fetch(`/api/posts?id=${id}&model=${model}`, { method: "DELETE", headers: authHeaders() });
    }
    selectNone();
    fetchPosts();
  };

  const changeTier = async (newTier: string) => {
    for (const id of selected) {
      await fetch("/api/posts", { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ id, model, updates: { tier_required: newTier } }) });
    }
    selectNone();
    fetchPosts();
  };

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-6 pb-24" style={{ background: "var(--bg)" }}>
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <a href="/agence" className="p-2 rounded-lg no-underline hover:opacity-70" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-4 h-4" />
            </a>
            <h1 className="text-base font-bold flex-1" style={{ color: "var(--text)" }}>
              <Image className="w-4 h-4 inline mr-1.5 -mt-0.5" />Media ({imagePosts.length})
            </h1>
            {selected.size > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>{selected.size}</span>
                {/* Change tier */}
                <select onChange={e => { if (e.target.value) changeTier(e.target.value); e.target.value = ""; }}
                  className="text-[10px] px-1.5 py-1 rounded cursor-pointer outline-none"
                  style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}>
                  <option value="">Pack...</option>
                  <option value="public">Public</option>
                  <option value="vip">VIP</option>
                  <option value="gold">Gold</option>
                  <option value="diamond">Diamond</option>
                  <option value="platinum">Platinum</option>
                </select>
                <button onClick={deleteSelected} className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                  style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "none" }}>
                  <Trash2 className="w-3 h-3" />
                </button>
                <button onClick={selectNone} className="text-[10px] cursor-pointer" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>✕</button>
              </div>
            )}
          </div>

          {/* Tier filter */}
          <div className="flex gap-1 mb-4 overflow-x-auto">
            {["all", "public", "vip", "gold", "diamond", "platinum"].map(t => {
              const count = t === "all" ? imagePosts.length : imagePosts.filter(p => (p.tier_required || "public") === t).length;
              return (
                <button key={t} onClick={() => setFilter(t as typeof filter)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-medium cursor-pointer shrink-0"
                  style={{ background: filter === t ? "var(--accent)" : "rgba(0,0,0,0.04)", color: filter === t ? "#fff" : "var(--text-muted)" }}>
                  {t === "all" ? "Tout" : t.charAt(0).toUpperCase() + t.slice(1)} ({count})
                </button>
              );
            })}
            <div className="flex-1" />
            <button onClick={selected.size === filtered.length ? selectNone : selectAll}
              className="px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer shrink-0"
              style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              {selected.size === filtered.length ? "Aucun" : "Tout"}
            </button>
          </div>

          {loading && <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Chargement...</p>}

          {/* Grid */}
          {!loading && filtered.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Aucun media — poste dans le Feed</p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {filtered.map(post => {
              const isSelected = selected.has(post.id);
              const tier = post.tier_required || "public";
              return (
                <div key={post.id} className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => toggleSelect(post.id)}
                  style={{ border: isSelected ? "3px solid var(--accent)" : "1px solid var(--border)" }}>
                  <img src={post.media_url!} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {/* Selection check */}
                  {isSelected && (
                    <div className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {/* Tier badge */}
                  {tier !== "public" && (
                    <span className="absolute bottom-1 right-1 text-[8px] font-bold px-1 py-0.5 rounded"
                      style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}>
                      {tier === "vip" ? "♥" : tier === "gold" ? "★" : tier === "diamond" ? "♦" : "♛"}
                    </span>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>

          {/* Text-only posts */}
          {posts.filter(p => !p.media_url && p.content).length > 0 && (
            <div className="mt-6">
              <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Posts texte ({posts.filter(p => !p.media_url).length})</h3>
              <div className="space-y-1">
                {posts.filter(p => !p.media_url && p.content).map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg group"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <p className="text-xs flex-1 truncate" style={{ color: "var(--text)" }}>{p.content}</p>
                    <span className="text-[9px] uppercase" style={{ color: "var(--text-muted)" }}>{p.tier_required || "public"}</span>
                    <button onClick={async () => {
                      await fetch(`/api/posts?id=${p.id}&model=${model}`, { method: "DELETE", headers: authHeaders() });
                      fetchPosts();
                    }} className="opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </OsLayout>
  );
}
