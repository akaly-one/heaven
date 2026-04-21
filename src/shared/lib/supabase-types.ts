// ══════════════════════════════════════════════════════════════════════════
//  supabase-types.ts — Minimal hand-rolled types for tables impacted by
//  migration 032_yumi_unified_messaging.
//
//  This file is a stopgap until `npx supabase gen types typescript` can be
//  run against the Heaven project with the service_role key.
//
//  Scope : only the tables directly touched by 032.
//   - agence_models (new hierarchy columns)
//   - agence_fans (new table)
//   - agence_clients.fan_id (new column)
//   - instagram_conversations.fan_id (new column)
//   - agence_messages_timeline (new view)
//
//  Keep naming aligned with the SQL : snake_case in the DB, mapped to the
//  same keys in TS (Supabase JS client returns raw rows).
// ══════════════════════════════════════════════════════════════════════════

export type RoleTier = "root" | "model";

// ─── agence_models (enriched) ─────────────────────────────────────────────
export interface AgenceModelRow {
  id: string;
  slug: string;
  model_id: string | null;          // "m2" / "m3" / "m4" (m1 legacy)
  model_number: number | null;
  display: string | null;
  display_name: string | null;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  status: string | null;
  online: boolean | null;
  // migration 021
  status_text: string | null;
  status_updated_at: string | null;
  // migration 011 registry
  is_active: boolean | null;
  activated_at: string | null;
  activated_by: string | null;
  config: Record<string, unknown> | null;
  // migration 023
  total_revenue: number | null;
  total_transactions: number | null;
  // migration 032 : hierarchy + Fanvue
  role_tier: RoleTier;
  agency_parent_slug: string | null;
  is_ai_generated: boolean | null;
  fanvue_handle: string | null;
  fanvue_url: string | null;
  fanvue_monthly_revenue: number | null;
  can_manage_children: boolean | null;
  created_at: string;
  updated_at: string;
}

// ─── agence_fans (new in 032) ─────────────────────────────────────────────
export interface AgenceFanRow {
  id: string;
  pseudo_web: string | null;
  pseudo_insta: string | null;
  pseudo_snap: string | null;
  fanvue_handle: string | null;
  phone: string | null;
  email: string | null;
  first_seen: string;
  last_seen: string;
  notes: string | null;
  merged_into_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── agence_clients.fan_id (new column in 032) ────────────────────────────
// Only the fields relevant to 032 (plus pre-existing identity columns).
export interface AgenceClientRow {
  id: string;
  model: string;                    // mN
  pseudo: string | null;
  pseudo_insta: string | null;
  pseudo_snap: string | null;
  tier: string | null;
  // 032 addition :
  fan_id: string | null;
  // pre-existing (non-exhaustive — extend as needed) :
  avatar_url: string | null;
  display_name: string | null;
  badge_grade: string | null;
  verified_status: string | null;
  verified_at: string | null;
  verified_by: string | null;
  lead_source: string | null;
  lead_hook: string | null;
  last_active: string | null;
  created_at: string;
}

// ─── instagram_conversations.fan_id (new column in 032) ──────────────────
export interface InstagramConversationRow {
  id: string;
  model_slug: string;               // mN
  ig_user_id: string;
  ig_username: string | null;
  mode: "agent" | "human";
  status: "active" | "archived" | "blocked";
  last_message_at: string | null;
  message_count: number;
  metadata: Record<string, unknown>;
  // 032 addition :
  fan_id: string | null;
  created_at: string;
}

// ─── agence_messages_timeline VIEW (new in 032) ──────────────────────────
export type TimelineSource = "web" | "instagram";
export type TimelineDirection = "in" | "out";

export interface AgenceMessagesTimelineRow {
  source: TimelineSource;
  id: string;
  model: string;                    // mN
  fan_id: string | null;
  client_id: string | null;
  ig_conversation_id: string | null;
  text: string;
  direction: TimelineDirection;
  read_flag: boolean;
  created_at: string;
}

// ─── RPC : set_session_context (new in 032) ──────────────────────────────
export interface SetSessionContextArgs {
  p_model_slug: string;
  p_role_tier: RoleTier | "anon";
}
