// Permission matrix for Heaven roles.
// Scope: actions allowed per role. Modeles are limited to their own entity.
// Source: plans/03-tech/SECURITY-v1.2026-04-21.md §Matrice de permissions
//
// Extension (Agent 10.B Phase 10 — B5 4 modes d'accès):
// Matrice MODE_PERMISSIONS ajoutée en complément de la matrice par role.
// La matrice par role reste la source de vérité pour `can()`/`authorize()`
// (compat Phase 1). La matrice par mode fournit une vue orientée UX (quel
// mode peut quoi), utile pour les garde-fous UI et le badge.
import type { RoleSlug } from "./roles";
import type { AccessMode } from "../lib/access-mode";

export const PERMISSIONS = {
  admin: {
    // Core admin
    manage_entities: true,
    manage_codes: true,
    manage_finances: true,
    manage_packs: true,
    view_all_profiles: true,
    post_wall: true,
    send_messages: true,
    purge: true,
    // Granular scopes (cf. SECURITY-v1)
    "dmca:read": true,
    "dmca:write": true,
    "identity_plan:switch": true,
    "palier:escalate": true,
    "contract:view": true,
    "caming:operate": true,
    "view_revenue_self": true,
    "identity:view_legal": true,
  },
  model: {
    manage_entities: false,
    manage_codes: false,
    manage_finances: false,
    manage_packs: true,
    view_all_profiles: false,
    post_wall: true,
    send_messages: true,
    purge: false,
    // Granular scopes — model est limite a son propre profil
    "dmca:read": false,
    "dmca:write": false,
    "identity_plan:switch": false, // request only, approval admin
    "palier:escalate": false,       // notif only
    "contract:view": true,           // own only
    "caming:operate": true,          // own sessions
    "view_revenue_self": true,       // own only
    "identity:view_legal": false,
  },
  // Dev / Public — définis pour la complétude typée ROLES (roles/index.ts).
  // Dev hérite d'admin + overrides ; public = tout faux (redondance explicite
  // pour éviter les lookups vides). La détection de mode (cf. access-mode.ts)
  // reste la source de vérité opérationnelle pour dev vs admin.
  dev: {
    manage_entities: true,
    manage_codes: true,
    manage_finances: true,
    manage_packs: true,
    view_all_profiles: true,
    post_wall: true,
    send_messages: true,
    purge: true,
    "dmca:read": true,
    "dmca:write": true,
    "identity_plan:switch": true,
    "palier:escalate": true,
    "contract:view": true,
    "caming:operate": true,
    "view_revenue_self": true,
    "identity:view_legal": true,
  },
  public: {
    manage_entities: false,
    manage_codes: false,
    manage_finances: false,
    manage_packs: false,
    view_all_profiles: false,
    post_wall: false,
    send_messages: false,
    purge: false,
    "dmca:read": false,
    "dmca:write": false,
    "identity_plan:switch": false,
    "palier:escalate": false,
    "contract:view": false,
    "caming:operate": false,
    "view_revenue_self": false,
    "identity:view_legal": false,
  },
} as const;

export type Permission = keyof typeof PERMISSIONS["admin"];

export function can(role: RoleSlug, permission: Permission): boolean {
  return PERMISSIONS[role]?.[permission] === true;
}

// ══════════════════════════════════════════════
//  Matrice de permissions par MODE d'accès
//  (complément orienté UX — la matrice par role reste source de vérité RBAC)
// ══════════════════════════════════════════════

/**
 * Permissions listées par mode d'accès. Utilisé pour les garde-fous UI
 * (ex: afficher/masquer un panneau selon le mode actif). `'*'` en
 * première position = override total (dev only).
 */
export const MODE_PERMISSIONS: Record<AccessMode, readonly string[]> = {
  dev: [
    "*",
    "edit_infra",
    "override_scope",
    "manage_entities",
    "manage_codes",
    "manage_finances",
    "view_all_models",
    "activate_modules",
    "dev:architecture_map",
    "dev:env_vars",
    "dev:migrations_log",
  ],
  agence: [
    "manage_entities",
    "view_all_models",
    "activate_modules",
    "manage_finance",
    "manage_ops",
    "manage_agent_dm",
    "dmca:read",
    "dmca:write",
    "contract:view",
    "palier:escalate",
    "identity:view_legal",
    "view_revenue_self",
    "post_wall",
    "send_messages",
  ],
  model: [
    "view_revenue_self",
    "caming:operate",
    "contract:view",
    "post_wall",
    "send_messages",
    "manage_packs",
  ],
  public: [],
} as const;

/**
 * True si le mode possède la permission donnée. Wildcard `'*'` (dev)
 * accorde toutes les permissions.
 */
export function modeCan(mode: AccessMode, permission: string): boolean {
  const perms = MODE_PERMISSIONS[mode] ?? [];
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}
