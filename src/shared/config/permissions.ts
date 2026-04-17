// Permission matrix for Heaven roles.
// Scope: actions allowed per role. Modèles are limited to their own entity.
import type { RoleSlug } from "./roles";

export const PERMISSIONS = {
  admin: {
    manage_entities: true,
    manage_codes: true,
    manage_finances: true,
    manage_packs: true,
    view_all_profiles: true,
    post_wall: true,
    send_messages: true,
    purge: true,
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
  },
} as const;

export type Permission = keyof typeof PERMISSIONS["admin"];

export function can(role: RoleSlug, permission: Permission): boolean {
  return PERMISSIONS[role]?.[permission] === true;
}
