// Permission matrix for Heaven roles.
// Scope: actions allowed per role. Modeles are limited to their own entity.
// Source: plans/03-tech/SECURITY-v1.2026-04-21.md §Matrice de permissions
import type { RoleSlug } from "./roles";

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
} as const;

export type Permission = keyof typeof PERMISSIONS["admin"];

export function can(role: RoleSlug, permission: Permission): boolean {
  return PERMISSIONS[role]?.[permission] === true;
}
