import { redirect } from "next/navigation";
import { toSlug } from "@/lib/model-utils";

/**
 * NB 2026-04-25 — `/agence/models/[id]` redirige vers le PROFIL PUBLIC `/m/[slug]`.
 *
 * Décision : il n'existe qu'UN SEUL skeleton de page profil = `/m/[slug]` (version complète
 * avec HeaderBar, login, retour, message, chat, etc.). La page admin RH/dossier a été
 * renommée en `/agence/models/[id]/dossier` pour éviter toute confusion sémantique.
 *
 * Si tu cherches le dossier RH (Plan Identité, Palier, Statut, Contrat, DMCA) :
 *  - `/agence/models/[id]/dossier`
 *  - `/agence/models/[id]/contract`
 *  - `/agence/models/[id]/dmca`
 */
export default async function AgenceModelRootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const slug = toSlug(id) || id;
  redirect(`/m/${slug}`);
}
