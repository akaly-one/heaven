export { ADMIN_ROLE } from "./admin";
export { MODEL_ROLE } from "./model";
export { DEV_ROLE } from "./dev";
export { PUBLIC_ROLE } from "./public";

import { ADMIN_ROLE } from "./admin";
import { MODEL_ROLE } from "./model";
import { DEV_ROLE } from "./dev";
import { PUBLIC_ROLE } from "./public";

export const ROLES = {
  admin: ADMIN_ROLE,
  model: MODEL_ROLE,
  dev: DEV_ROLE,
  public: PUBLIC_ROLE,
} as const;

export type RoleSlug = keyof typeof ROLES;
