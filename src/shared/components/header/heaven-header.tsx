"use client";

/**
 * HeavenHeader — BRIEF-18 wrapper auto-detect
 * ───────────────────────────────────────────
 * Détecte automatiquement le rôle utilisateur via `useModel()` et rend :
 * - <HeavenAdminHeader> si auth.role ∈ {root, model}
 * - <HeavenClientHeader> sinon (visiteur / fan / non connecté)
 *
 * Permet d'avoir un seul point d'entrée header dans toute l'app et garantit
 * la cohérence demandée par NB : "le profil doit reconnaître qui est connecté
 * au cp et afficher le header correspondant".
 *
 * Usage :
 *   - Dans /m/[slug] : <HeavenHeader context="profile-public" {...visitorProps} />
 *   - Dans /agence/* : OsLayout enveloppe déjà <Header> legacy (Phase 3 fusionnera)
 *
 * Le `forceRole` permet de bypasser la détection auto pour cas spécifiques
 * (preview mode visiteur depuis admin, par ex.).
 */

import { useModel } from "@/lib/model-context";
import {
  HeavenAdminHeader,
  type HeavenAdminHeaderProps,
} from "./heaven-admin-header";
import {
  HeavenClientHeader,
  type HeavenClientHeaderProps,
} from "./heaven-client-header";

export type HeavenHeaderProps =
  | ({ forceRole: "admin" } & HeavenAdminHeaderProps)
  | ({ forceRole: "client" } & HeavenClientHeaderProps)
  | ({ forceRole?: undefined } & (HeavenAdminHeaderProps | HeavenClientHeaderProps));

export function HeavenHeader(props: HeavenHeaderProps) {
  const { auth, ready } = useModel();

  // Évite hydration mismatch tant que le hook n'a pas lu le storage
  if (!ready) return null;

  const role: "admin" | "client" =
    props.forceRole ??
    (auth?.role === "root" || auth?.role === "model" ? "admin" : "client");

  if (role === "admin") {
    return <HeavenAdminHeader {...(props as HeavenAdminHeaderProps)} />;
  }
  return <HeavenClientHeader {...(props as HeavenClientHeaderProps)} />;
}

// Re-exports pour faciliter l'import unique
export { HeavenAdminHeader } from "./heaven-admin-header";
export { HeavenClientHeader } from "./heaven-client-header";
export type { HeavenAdminHeaderProps } from "./heaven-admin-header";
export type { HeavenClientHeaderProps } from "./heaven-client-header";
