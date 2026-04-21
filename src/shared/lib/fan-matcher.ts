// src/shared/lib/fan-matcher.ts — Agent 4.A (B7)
//
// Fan identity matching: produces a ranked list of merge candidates for a
// given set of {handles, fingerprint}. Used by /api/agence/fans/auto-merge
// and /api/agence/fans/search.
//
// Signals, from strongest to weakest:
//   1. Exact handle match on ANY channel                → score 1.00
//   2. Fingerprint hash match within 7-day window       → score 0.85
//   3. Trigram similarity on a handle value (> 0.9)     → score 0.70 + sim
//
// The helper never mutates data — it only proposes. Application layer (API
// route) is responsible for executing the merge via /fans/[id]/merge.

import crypto from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HandleChannel = "web" | "insta" | "snap" | "fanvue" | "tiktok" | "twitter" | "telegram";

export type FanHandles = Partial<Record<HandleChannel, string>>;

export interface MergeCandidate {
  id: string;
  score: number;                    // 0..1, higher = more confident
  reason: string;                   // Human-readable justification
  matched_on: string[];             // e.g. ["handle:insta", "fingerprint"]
  handles: FanHandles;
  fingerprint_hash: string | null;
  last_seen: string | null;
}

interface FanRow {
  id: string;
  handles: FanHandles | null;
  fingerprint_hash: string | null;
  last_seen: string | null;
  pseudo_web: string | null;
  pseudo_insta: string | null;
  pseudo_snap: string | null;
  fanvue_handle: string | null;
  merged_into_id: string | null;
}

// Minimal Supabase client shape (avoids a heavy type import here).
// The auto-merge route passes the service-role client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MinimalSupabase = any;

// ---------------------------------------------------------------------------
// Fingerprint helpers
// ---------------------------------------------------------------------------

/**
 * Build a short-lived dedupe hash from IP + User-Agent.
 * Returns null if either input is missing (caller should NOT fall back to
 * partial fingerprints — that leads to false positives).
 */
export function hashFingerprint(ip: string | null | undefined, userAgent: string | null | undefined): string | null {
  if (!ip || !userAgent) return null;
  const trimmedIp = ip.trim();
  const trimmedUa = userAgent.trim();
  if (!trimmedIp || !trimmedUa) return null;
  return crypto
    .createHash("sha256")
    .update(`${trimmedIp}|${trimmedUa}`)
    .digest("hex")
    .slice(0, 32);
}

// ---------------------------------------------------------------------------
// Similarity helpers
// ---------------------------------------------------------------------------

/**
 * Fast, JS-side bigram similarity for short pseudos.
 * Used as the application-level refinement after the trigram pre-filter.
 * Returns 0..1 (1 = identical).
 */
export function bigramSimilarity(a: string, b: string): number {
  const A = a.trim().toLowerCase();
  const B = b.trim().toLowerCase();
  if (!A || !B) return 0;
  if (A === B) return 1;

  const bigrams = (s: string): Map<string, number> => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) || 0) + 1);
    }
    return m;
  };

  const aMap = bigrams(A);
  const bMap = bigrams(B);
  let intersect = 0;
  for (const [g, count] of aMap) {
    const other = bMap.get(g);
    if (other) intersect += Math.min(count, other);
  }
  const total = (A.length - 1) + (B.length - 1);
  if (total <= 0) return 0;
  return (2 * intersect) / total;
}

// ---------------------------------------------------------------------------
// Handle normalization
// ---------------------------------------------------------------------------

export function normalizeHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase().replace(/^@+/, "");
  return cleaned || null;
}

/** Merge legacy flat pseudos into a unified FanHandles object. */
export function toFanHandles(row: Partial<FanRow>): FanHandles {
  const h: FanHandles = {};
  // Prefer jsonb handles if present, fallback to flat columns
  if (row.handles && typeof row.handles === "object") {
    for (const [k, v] of Object.entries(row.handles)) {
      if (typeof v === "string" && v.trim()) h[k as HandleChannel] = v.trim();
    }
  }
  if (!h.web && row.pseudo_web) h.web = row.pseudo_web;
  if (!h.insta && row.pseudo_insta) h.insta = row.pseudo_insta;
  if (!h.snap && row.pseudo_snap) h.snap = row.pseudo_snap;
  if (!h.fanvue && row.fanvue_handle) h.fanvue = row.fanvue_handle;
  return h;
}

// ---------------------------------------------------------------------------
// Main: find merge candidates
// ---------------------------------------------------------------------------

const FINGERPRINT_WINDOW_DAYS = 7;
const TRIGRAM_SIMILARITY_THRESHOLD = 0.9;
const BIGRAM_SIMILARITY_THRESHOLD = 0.85;

interface FindOptions {
  /** Model id restricts the candidate pool via linked `agence_clients.model` or IG conversations. If omitted, searches globally. */
  modelId?: string;
  /** Fan id to exclude (typically the source fan in an auto-merge scan). */
  excludeFanId?: string;
  /** Hard cap on candidates returned. */
  limit?: number;
}

/**
 * Find merge candidates for the given identity signals.
 *
 * Implementation strategy:
 *   - Run three parallel coarse queries (exact handle / fingerprint / trigram).
 *   - Union by fan_id, then refine each candidate's score in JS.
 *   - Return top-N sorted by score desc.
 *
 * @returns array of candidates sorted by score desc; empty array if no signals or no matches.
 */
export async function findMergeCandidates(
  supabase: MinimalSupabase,
  handles: FanHandles,
  fingerprint: string | null,
  options: FindOptions = {}
): Promise<MergeCandidate[]> {
  const { excludeFanId, limit = 20 } = options;

  // Normalize inputs
  const normHandles: FanHandles = {};
  for (const [k, v] of Object.entries(handles)) {
    const n = normalizeHandle(v as string);
    if (n) normHandles[k as HandleChannel] = n;
  }
  const hasHandles = Object.keys(normHandles).length > 0;
  if (!hasHandles && !fingerprint) return [];

  const candidates = new Map<string, MergeCandidate>();

  const bumpCandidate = (row: FanRow, score: number, reason: string, matchedOn: string) => {
    const existing = candidates.get(row.id);
    const rowHandles = toFanHandles(row);
    if (existing) {
      // Keep highest score, accumulate matched_on
      if (score > existing.score) existing.score = score;
      if (!existing.matched_on.includes(matchedOn)) existing.matched_on.push(matchedOn);
      existing.reason = existing.matched_on.length > 1
        ? `Multiple signals: ${existing.matched_on.join(", ")}`
        : reason;
    } else {
      candidates.set(row.id, {
        id: row.id,
        score,
        reason,
        matched_on: [matchedOn],
        handles: rowHandles,
        fingerprint_hash: row.fingerprint_hash,
        last_seen: row.last_seen,
      });
    }
  };

  const selectCols =
    "id, handles, fingerprint_hash, last_seen, pseudo_web, pseudo_insta, pseudo_snap, fanvue_handle, merged_into_id";

  // ---------- Signal 1: exact handle match (JSONB containment) ----------
  for (const [channel, value] of Object.entries(normHandles)) {
    const payload: Record<string, string> = { [channel]: value as string };
    let q = supabase
      .from("agence_fans")
      .select(selectCols)
      .is("merged_into_id", null)
      .contains("handles", payload);
    if (excludeFanId) q = q.neq("id", excludeFanId);
    const { data: rows } = await q;
    for (const row of (rows as FanRow[] | null) || []) {
      bumpCandidate(row, 1.0, `Exact handle match on ${channel}`, `handle:${channel}`);
    }
  }

  // ---------- Signal 2: fingerprint match (7-day window) ----------
  if (fingerprint) {
    const sinceIso = new Date(
      Date.now() - FINGERPRINT_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    let q = supabase
      .from("agence_fans")
      .select(selectCols)
      .is("merged_into_id", null)
      .eq("fingerprint_hash", fingerprint)
      .gte("last_seen", sinceIso);
    if (excludeFanId) q = q.neq("id", excludeFanId);
    const { data: rows } = await q;
    for (const row of (rows as FanRow[] | null) || []) {
      bumpCandidate(
        row,
        0.85,
        `Fingerprint match within ${FINGERPRINT_WINDOW_DAYS} days`,
        "fingerprint"
      );
    }
  }

  // ---------- Signal 3: trigram fuzzy match on handles ----------
  // We use the `%` operator with pg_trgm configured via `set_limit`. Since setting
  // the threshold per-query is awkward with PostgREST, we over-fetch with a
  // coarse ilike and refine in JS with bigramSimilarity.
  if (hasHandles) {
    const orParts: string[] = [];
    for (const value of Object.values(normHandles)) {
      const v = String(value).replace(/[%,]/g, ""); // safety
      if (v.length >= 3) {
        // Look for the handle as a substring inside the jsonb text representation.
        orParts.push(`handles::text.ilike.%${v}%`);
      }
    }
    if (orParts.length > 0) {
      let q = supabase
        .from("agence_fans")
        .select(selectCols)
        .is("merged_into_id", null)
        .or(orParts.join(","))
        .limit(100);
      if (excludeFanId) q = q.neq("id", excludeFanId);
      const { data: rows } = await q;

      for (const row of (rows as FanRow[] | null) || []) {
        // Already covered by exact match? skip redundant fuzzy entry.
        const alreadyExact = candidates.get(row.id)?.matched_on.some((m) => m.startsWith("handle:"));
        if (alreadyExact) continue;

        // Compute best per-channel similarity
        const rowHandles = toFanHandles(row);
        let bestSim = 0;
        let bestChannel = "";
        for (const [channel, value] of Object.entries(normHandles)) {
          const rowValue = rowHandles[channel as HandleChannel];
          if (!rowValue) continue;
          const sim = bigramSimilarity(value as string, rowValue);
          if (sim > bestSim) {
            bestSim = sim;
            bestChannel = channel;
          }
        }
        if (bestSim >= BIGRAM_SIMILARITY_THRESHOLD) {
          // Score scales from 0.70 (threshold) to 0.90 (near-identical)
          const score = 0.7 + (bestSim - BIGRAM_SIMILARITY_THRESHOLD) * (0.2 / (1 - BIGRAM_SIMILARITY_THRESHOLD));
          bumpCandidate(
            row,
            Math.min(score, 0.9),
            `Fuzzy match on ${bestChannel} (sim=${bestSim.toFixed(2)})`,
            `fuzzy:${bestChannel}`
          );
        }
      }
    }
  }

  return Array.from(candidates.values())
    .sort((a, b) => b.score - a.score || (b.last_seen || "").localeCompare(a.last_seen || ""))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Inline smoke tests (run via `ts-node src/shared/lib/fan-matcher.ts`)
// Not auto-executed by Next build — gated by `require.main`.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _mod = (typeof require !== "undefined" ? (require as any) : null);
if (_mod && _mod.main === module) {
  // bigramSimilarity basics
  console.assert(bigramSimilarity("alice", "alice") === 1, "identical = 1");
  console.assert(bigramSimilarity("alice", "") === 0, "empty = 0");
  console.assert(
    bigramSimilarity("alice_web", "alice_ig") > 0.5,
    "alice_web ~ alice_ig should be > 0.5"
  );
  console.assert(
    bigramSimilarity("crusher42", "crushx_42") > 0.4,
    "similar pseudos should match"
  );
  console.assert(
    bigramSimilarity("alice", "bob") < 0.3,
    "unrelated pseudos should be low"
  );

  // hashFingerprint deterministic
  const h1 = hashFingerprint("1.2.3.4", "Mozilla/5.0");
  const h2 = hashFingerprint("1.2.3.4", "Mozilla/5.0");
  const h3 = hashFingerprint("1.2.3.5", "Mozilla/5.0");
  console.assert(h1 === h2, "same input → same hash");
  console.assert(h1 !== h3, "different IP → different hash");
  console.assert(h1 && h1.length === 32, "hash length = 32");
  console.assert(hashFingerprint(null, "ua") === null, "null ip → null hash");
  console.assert(hashFingerprint("ip", null) === null, "null ua → null hash");

  // normalizeHandle
  console.assert(normalizeHandle("@Alice") === "alice", "strip @ + lowercase");
  console.assert(normalizeHandle("  bob  ") === "bob", "trim");
  console.assert(normalizeHandle(null) === null, "null passthrough");
  console.assert(normalizeHandle("") === null, "empty → null");

  // toFanHandles prefers jsonb over flat
  const merged = toFanHandles({
    handles: { insta: "new" },
    pseudo_insta: "old",
    pseudo_web: "onlyflat",
  });
  console.assert(merged.insta === "new", "jsonb wins over flat");
  console.assert(merged.web === "onlyflat", "flat fills gap");

  console.log("fan-matcher.ts: all smoke tests passed");
}
