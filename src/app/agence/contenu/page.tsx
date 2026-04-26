import { redirect } from "next/navigation";

/**
 * /agence/contenu — DEPRECATED (NB 2026-04-26).
 *
 * Le tab "Contenu" du CP a été retiré (BRIEF-22+23 Profile-as-Hub) :
 * la gestion du contenu (uploads, packs, feed) est unifiée sur le profil
 * admin overlay `/m/[slug]` (modèle voit son profil avec couche admin).
 *
 * Cette route legacy redirige vers le Dashboard (/agence). Les bookmarks
 * existants `/agence/contenu` ou `/agence?tab=contenu` arrivent ici, on
 * les renvoie au dashboard plutôt que vers une tab disparue.
 */
export default function ContenuPageDeprecated() {
  redirect("/agence");
}
