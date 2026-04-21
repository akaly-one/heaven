// Minimal RBAC helpers — scope a model user to their own entity.
//
// Compat note (Agent 1.B Phase 1):
// La DB stocke role='root' pour le tier admin (yumi, heaven, root).
// `'admin'` est conserve comme alias semantique pour la matrice de
// permissions (cf. SECURITY-v1.2026-04-21.md). isAdmin() retourne true
// pour `'root'` ET `'admin'` afin que les helpers fonctionnent quel que
// soit le claim emis.
import { can, type Permission } from "./config/permissions";
import type { RoleSlug } from "./config/roles";

export type HeavenSession = {
  sub: string; // model_slug or "root"
  role: RoleSlug | "root"; // 'root' = admin tier (DB legacy), 'admin' = semantic alias
  scope?: string[];        // legacy paths
  display_name?: string;
  model_id?: string | null;
  model_slug?: string | null;
  scopes?: string[];       // granular: ['dmca:read', ...] ou ['*']
};

/** True si l'utilisateur a un acces admin (DB role='root' OU 'admin'). */
export function isAdmin(session: HeavenSession | null | undefined): boolean {
  if (!session) return false;
  return session.role === "admin" || session.role === "root";
}

/**
 * True si l'utilisateur peut acceder a l'entite donnee.
 * - Admin/root: acces toutes entites
 * - Model: uniquement sa propre entite (matched par sub OU model_slug OU model_id)
 */
export function canAccessEntity(
  session: HeavenSession | null | undefined,
  entitySlug: string
): boolean {
  if (!session) return false;
  if (isAdmin(session)) return true;
  if (session.role === "model") {
    // Match par sub (legacy), model_slug (canonical), ou liste scope (legacy paths)
    if (session.sub === entitySlug) return true;
    if (session.model_slug && session.model_slug === entitySlug) return true;
    if ((session.scope ?? []).includes(entitySlug)) return true;
  }
  return false;
}

/** True si le role a la permission (matrice statique). */
export function authorize(
  session: HeavenSession | null | undefined,
  permission: Permission
): boolean {
  if (!session) return false;
  // Normalise role='root' vers 'admin' pour la matrice
  const normalizedRole: RoleSlug = isAdmin(session) ? "admin" : (session.role as RoleSlug);
  return can(normalizedRole, permission);
}

/**
 * True si le JWT contient un scope granulaire donne (ex: 'dmca:read').
 * - Wildcard '*' donne acces a tous les scopes (root dev).
 * - Comparaison stricte sur le slug du scope.
 */
export function hasScope(
  session: HeavenSession | null | undefined,
  scope: string
): boolean {
  if (!session) return false;
  const granted = session.scopes ?? [];
  if (granted.includes("*")) return true;
  return granted.includes(scope);
}
