-- ═══════════════════════════════════════════════════════════════════════════
-- 038b_claim_jobs_rpc.sql
-- TARGET: HEAVEN DB
--
-- PURPOSE
--   RPC used by /api/cron/process-ig-replies to atomically claim up to
--   `p_limit` pending jobs from ig_reply_queue. Uses FOR UPDATE SKIP LOCKED
--   so parallel worker ticks never fight over the same row.
--
-- DEPENDENCIES (supplied by migration 038)
--   - table public.ig_reply_queue (id, conversation_id, ig_message_id,
--     status ('pending'|'processing'|'done'|'failed'), retry_count,
--     started_at, completed_at, last_error?, created_at)
--   - table public.instagram_conversations(id, ig_user_id, ...)
--
-- RETURNS
--   For each claimed job: (id, conversation_id, ig_message_id, recipient_id,
--   retry_count). `recipient_id` is the fan's IG user id, pulled from the
--   parent conversation row (instagram_conversations.ig_user_id). The worker
--   uses it as the Graph API recipient.
--
-- NOTES
--   SECURITY DEFINER so it can be invoked with the service_role key regardless
--   of per-table RLS. Locked to the queue table only — no lateral reach.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.claim_ig_reply_jobs(p_limit INT)
RETURNS TABLE (
  id              UUID,
  conversation_id UUID,
  ig_message_id   TEXT,
  recipient_id    TEXT,
  retry_count     INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT q.id
      FROM public.ig_reply_queue q
     WHERE q.status = 'pending'
     ORDER BY q.created_at ASC
     LIMIT GREATEST(COALESCE(p_limit, 1), 1)
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.ig_reply_queue q
     SET status     = 'processing',
         started_at = now()
    FROM claimed
   WHERE q.id = claimed.id
  RETURNING
    q.id,
    q.conversation_id,
    q.ig_message_id,
    (SELECT ic.ig_user_id
       FROM public.instagram_conversations ic
      WHERE ic.id = q.conversation_id) AS recipient_id,
    q.retry_count;
END;
$$;

COMMENT ON FUNCTION public.claim_ig_reply_jobs(INT) IS
  'Atomically claim up to N pending ig_reply_queue rows (FOR UPDATE SKIP LOCKED). Returns (id, conversation_id, ig_message_id, recipient_id, retry_count).';

-- ═══════════════════════════════════════════════════════════════════════════
-- END 038b_claim_jobs_rpc.sql
-- ═══════════════════════════════════════════════════════════════════════════
