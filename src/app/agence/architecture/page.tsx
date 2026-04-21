import { redirect } from "next/navigation";

/**
 * Agent 2.C / Brief B1 : l'Architecture Map vit désormais dans
 * /agence/settings > tab Dev Center > sous-onglet Architecture.
 *
 * On conserve cette route comme redirect (moins destructif que 404)
 * pour préserver les bookmarks admin.
 */
export default function ArchitectureRedirect() {
  redirect("/agence/settings?tab=dev-center&section=architecture");
}
