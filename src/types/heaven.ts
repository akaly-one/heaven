// ══════════════════════════════════════════════
//  Heaven OS — Centralized Types
//  Source of truth for all shared interfaces
// ══════════════════════════════════════════════

// ── Auth ──

export type HeavenRole = "root" | "model" | "client";

export interface HeavenAuth {
  role: HeavenRole;
  scope: string[];
  model_slug: string | null;
  display_name: string;
  loggedAt: string;
  token?: string;
}

// ── Packs ──

export interface PackBonuses {
  fanvueAccess: boolean;
  freeNudeExpress: boolean;
  nudeDedicaceLevres: boolean;
  freeVideoOffer: boolean;
}

export interface PackConfig {
  id: string;
  name: string;
  price: number;
  color: string;
  features: string[];
  bonuses?: PackBonuses;
  face: boolean;
  badge: string | null;
  active: boolean;
  wise_url?: string;
  stripe_link?: string;
  code?: string;
}

// ── Codes ──

export interface AccessCode {
  code: string;
  model: string;
  client: string;
  platform: string;
  role?: "client" | "admin";
  tier: string;
  pack?: string;
  type: string;
  duration: number;
  expiresAt: string;
  created: string;
  used: boolean;
  active: boolean;
  revoked: boolean;
  isTrial?: boolean;
  lastUsed: string | null;
  clientId?: string;
}

// ── Clients ──

export type VisitorPlatform = "snap" | "insta" | "phone" | "pseudo";

export interface ClientInfo {
  id: string;
  pseudo_snap?: string;
  pseudo_insta?: string;
  phone?: string;
  nickname?: string;
  delivery_platform?: string;
  tier?: string;
  is_verified?: boolean;
  is_blocked?: boolean;
  notes?: string;
  tag?: string;
  preferences?: string;
  total_spent?: number;
  total_tokens_bought?: number;
  total_tokens_spent?: number;
  firstname?: string;
  last_active?: string;
}

export interface ClientWithSubs {
  client: ClientInfo;
  codes: AccessCode[];
  activeCode: AccessCode | null;
  status: "active" | "expiring" | "expired" | "blocked";
  timeLeft: string;
}

// ── Posts / Feed ──

export interface FeedPost {
  id: string;
  model: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  tier_required: string;
  pinned: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

// Alias — same shape, used in m/[slug]
export type Post = FeedPost;

// ── Wall ──

export interface WallPost {
  id: string;
  model: string;
  pseudo: string;
  content: string | null;
  photo_url: string | null;
  created_at: string;
  pseudo_snap?: string | null;
  pseudo_insta?: string | null;
  client_id?: string | null;
  likes_count?: number;
}

// ── Model ──

export interface ModelInfo {
  slug: string;
  display_name: string;
  bio: string | null;
  avatar: string | null;
  online: boolean;
  status: string | null;
  banner: string | null;
}

// ── Gallery / Uploads ──

export interface UploadedContent {
  id: string;
  tier: string;
  type: "photo" | "video" | "reel";
  label: string;
  dataUrl: string;
  uploadedAt: string;
  visibility?: "pack" | "promo";
  tokenPrice?: number;
  isNew?: boolean;
}

// ── Messages ──

export interface Message {
  id: string;
  model: string;
  client_id: string;
  sender_type: "client" | "model" | "admin";
  content: string;
  read: boolean;
  created_at: string;
}

export interface Conversation {
  client: ClientInfo;
  messages: Message[];
  lastMessage: Message;
  unread: number;
}

// ── Pipeline ──

export interface ContentItem {
  id: string;
  model_slug: string;
  title: string;
  content_type: string;
  platforms: string[];
  stage: string;
  scheduled_date: string | null;
  published_date: string | null;
  tier: string | null;
  price: number | null;
  views: number;
  likes: number;
  revenue: number;
  notes: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

export interface PlatformAccount {
  id: string;
  model_slug: string;
  platform: string;
  handle: string;
  profile_url: string | null;
  status: string;
  subscribers_count: number;
  monthly_revenue: number;
  commission_rate: number;
  notes: string | null;
}

export interface Goal {
  id: string;
  model_slug: string;
  title: string;
  category: string;
  target_value: number;
  current_value: number;
  unit: string;
  deadline: string | null;
  status: string;
}

// ── API (server-side mapper shape) ──

export interface CodeRow {
  code: string;
  model: string;
  client: string;
  platform: string;
  role: string;
  tier: string;
  pack: string;
  type: string;
  duration: number;
  expiresAt: string;
  created: string;
  used: boolean;
  active: boolean;
  revoked: boolean;
  isTrial: boolean;
  lastUsed: string | null;
  clientId?: string;
}

// ── Wise link (codes-list) ──

export interface WiseLink {
  tier: string;
  url: string;
}
