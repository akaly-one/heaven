"use client";

import { useState } from "react";
import type { FeedItem } from "@/types/heaven";
import { FeedItemCard } from "@cp/components/profile/feed-item-card";
import { FeedItemDetailModal } from "./feed-item-detail-modal";

/**
 * Instagram-style grid of feed items.
 *
 *  - Filtre : seuls les items avec `media_url` (ou `thumbnail_url`) sont affichés
 *    pour garantir une grille photo cohérente. Les posts texte-only sont exclus.
 *  - Render : `<FeedItemCard mode="thumbnail" />` carré 1:1 avec hover overlay.
 *  - Click : ouvre `<FeedItemDetailModal />` (lightbox + commentaires).
 *  - Like : optimistic update inline dans `<FeedItemCard>`.
 *
 * Props :
 *  - feedItems : liste pré-filtrée (généralement IG only — caller filtre).
 *  - clientId  : pour la persistance like + comment (anonyme si null).
 *  - modelSlug : passé au modal (pour future contextualisation).
 */

interface InstagramFeedGridProps {
  feedItems: FeedItem[];
  clientId?: string | null;
  modelSlug: string;
  className?: string;
  /** Set d'IDs déjà likés par ce client (Agent 1 : getLikedSet). */
  likedSet?: Set<string>;
}

export function InstagramFeedGrid({
  feedItems,
  clientId,
  modelSlug,
  className,
  likedSet,
}: InstagramFeedGridProps) {
  const [openItem, setOpenItem] = useState<FeedItem | null>(null);

  // Garde uniquement les items avec une image (grille photo).
  const photoItems = feedItems.filter(
    (it) => !!(it.media_url || it.thumbnail_url)
  );
  if (photoItems.length === 0) return null;

  return (
    <>
      <div
        className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 sm:gap-1.5 ${className || ""}`}
      >
        {photoItems.map((item, idx) => (
          <FeedItemCard
            key={item.id}
            item={item}
            mode="thumbnail"
            clientId={clientId}
            initialLiked={likedSet ? likedSet.has(item.id) : false}
            onClick={() => setOpenItem(item)}
            index={idx}
          />
        ))}
      </div>
      {openItem && (
        <FeedItemDetailModal
          item={openItem}
          clientId={clientId}
          modelSlug={modelSlug}
          initialLiked={likedSet ? likedSet.has(openItem.id) : false}
          onClose={() => setOpenItem(null)}
        />
      )}
    </>
  );
}
