export { ROOT_ENTITY } from "./root";
export { YUMI_ENTITY } from "./yumi";
export { RUBY_ENTITY } from "./ruby";
export { PALOMA_ENTITY } from "./paloma";

import { ROOT_ENTITY } from "./root";
import { YUMI_ENTITY } from "./yumi";
import { RUBY_ENTITY } from "./ruby";
import { PALOMA_ENTITY } from "./paloma";

export const ENTITIES = {
  root: ROOT_ENTITY,
  yumi: YUMI_ENTITY,
  ruby: RUBY_ENTITY,
  paloma: PALOMA_ENTITY,
} as const;

export type EntitySlug = keyof typeof ENTITIES;

export function getEntityBySlug(slug: string) {
  return ENTITIES[slug as EntitySlug];
}

export function getEntityByModelId(model_id: string) {
  return Object.values(ENTITIES).find((e) => e.model_id === model_id);
}
