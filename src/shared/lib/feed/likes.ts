/**
 * BRIEF-17 — helpers serveur likes feed items
 *
 * Utilise getServerSupabase (service_role, bypass RLS) car ces helpers
 * sont appelés depuis routes API et server components (pre-render).
 *
 * Ref : plans/PMO/briefs/BRIEF-2026-04-25-17-header-admin-feed-ig-likes.md
 */

import { getServerSupabase } from "@/lib/supabase-server";

/**
 * Vérifie si un client a liké un feed item.
 * @returns false si Supabase non configuré ou erreur DB.
 */
export async function hasLiked(
  feedItemId: string,
  clientId: string,
): Promise<boolean> {
  if (!feedItemId || !clientId) return false;
  const supabase = getServerSupabase();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("agence_feed_likes")
    .select("id")
    .eq("feed_item_id", feedItemId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) {
    console.error("[lib/feed/likes] hasLiked:", error);
    return false;
  }
  return !!data;
}

/**
 * Pour un set d'IDs feed items, retourne le sous-ensemble que le client a liké.
 * Utilisé en pre-render pour batcher les flags `liked` côté serveur.
 *
 * @returns Set vide si Supabase non configuré, liste vide, ou erreur DB.
 */
export async function getLikedSet(
  feedItemIds: string[],
  clientId: string,
): Promise<Set<string>> {
  if (!clientId || feedItemIds.length === 0) return new Set();
  const supabase = getServerSupabase();
  if (!supabase) return new Set();
  const { data, error } = await supabase
    .from("agence_feed_likes")
    .select("feed_item_id")
    .in("feed_item_id", feedItemIds)
    .eq("client_id", clientId);
  if (error) {
    console.error("[lib/feed/likes] getLikedSet:", error);
    return new Set();
  }
  return new Set(
    (data || []).map((r) => (r as { feed_item_id: string }).feed_item_id),
  );
}
