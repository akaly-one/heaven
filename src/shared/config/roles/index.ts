export { ADMIN_ROLE } from "./admin";
export { MODEL_ROLE } from "./model";

import { ADMIN_ROLE } from "./admin";
import { MODEL_ROLE } from "./model";

export const ROLES = {
  admin: ADMIN_ROLE,
  model: MODEL_ROLE,
} as const;

export type RoleSlug = keyof typeof ROLES;
