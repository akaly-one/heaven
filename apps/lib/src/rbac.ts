// Minimal RBAC helpers — scope a model user to their own entity.
import { can, type Permission } from "./config/permissions";
import type { RoleSlug } from "./config/roles";

export type HeavenSession = {
  sub: string; // model_slug or "root"
  role: RoleSlug;
  scope?: string[];
  display_name?: string;
};

export function isAdmin(session: HeavenSession | null | undefined): boolean {
  return session?.role === "admin";
}

export function canAccessEntity(
  session: HeavenSession | null | undefined,
  entitySlug: string
): boolean {
  if (!session) return false;
  if (session.role === "admin") return true;
  if (session.role === "model") {
    return session.sub === entitySlug || (session.scope ?? []).includes(entitySlug);
  }
  return false;
}

export function authorize(
  session: HeavenSession | null | undefined,
  permission: Permission
): boolean {
  if (!session) return false;
  return can(session.role, permission);
}
