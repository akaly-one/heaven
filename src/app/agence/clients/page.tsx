import { redirect } from "next/navigation";

/**
 * B7 — « Clients » tab supprimée. La page liste est désormais absorbée par
 * la Messagerie unifiée. Ce fichier remplace l'ancienne page et redirige
 * vers `/agence/messagerie?view=contacts`, en préservant toute la query
 * string déjà passée (back-compat ancienne URL `/agence/clients?sort=...`).
 *
 * La route dynamique `[fanId]/page.tsx` reste accessible via un lien
 * direct (ex : `/agence/clients/<id>`), notamment depuis le drawer fan.
 */
export default async function AgenceClientsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  // Default view param — overridden by any explicit ?view=...
  qs.set("view", "contacts");
  for (const [k, v] of Object.entries(params || {})) {
    if (!v) continue;
    if (Array.isArray(v)) {
      for (const vv of v) qs.append(k, vv);
    } else {
      qs.set(k, v);
    }
  }
  redirect(`/agence/messagerie?${qs.toString()}`);
}
