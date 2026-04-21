import { redirect } from "next/navigation";

/**
 * Agent 7.C — Dispatcher `/agence/models/[id]` → redirect vers profile par defaut.
 *
 * Tabs disponibles :
 *  - Profile (general + plan identite + palier + statut)      → /profile
 *  - Contrat (versioning + generator + dossier business)      → /contract
 *  - Release Form DMCA (Agent 7.B — NE PAS TOUCHER)           → /dmca
 */
export default async function AgenceModelRootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/agence/models/${id}/profile`);
}
