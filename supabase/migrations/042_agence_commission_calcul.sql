-- ═══════════════════════════════════════════════════════════════════════════
-- 042_agence_commission_calcul.sql
-- TARGET: HEAVEN DB
--
-- PURPOSE
--   Materialized view computing monthly commission split per model:
--     - revenu brut plateforme (sum of agence_revenus_modele in the period)
--     - commission Fanvue/plateforme (15% in modes A & B)
--     - TVA applicable (21%) only when palier = P4
--     - frais production dédiés (default forfait 80 €)
--     - net distribuable = brut - commission - frais
--     - part_modele / part_sqwensy according to mode (A: 100% Sqwensy,
--       B: 70/30 model/Sqwensy)
--     - palier_escalation_triggered : true when revenu_monthly_avg_3m > 750
--       and palier currently P2 (signal to upgrade tier)
--
--   The view is unique on (model_id, period) so REFRESH MATERIALIZED VIEW
--   CONCURRENTLY can be wired in Phase 8.B (cron end-of-month).
-- ═══════════════════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS public.agence_commission_calcul;

CREATE MATERIALIZED VIEW public.agence_commission_calcul AS
SELECT
  m.model_id,
  date_trunc('month', COALESCE(r.created_at, now()))      AS period,
  COALESCE(SUM(r.amount), 0)                              AS revenu_brut_plateforme,
  CASE
    WHEN m.mode_operation = 'A' THEN 0.15
    WHEN m.mode_operation = 'B' THEN 0.15
    ELSE 0
  END                                                     AS commission_plateforme_pct,
  COALESCE(SUM(r.amount) * 0.15, 0)                       AS commission_plateforme,
  CASE
    WHEN m.palier_remuneration = 'P4' THEN COALESCE(SUM(r.amount) * 0.21, 0)
    ELSE 0
  END                                                     AS tva_applicable,
  80                                                      AS frais_production_dedies,
  GREATEST(
    COALESCE(SUM(r.amount), 0)
      - COALESCE(SUM(r.amount) * 0.15, 0)
      - 80,
    0
  )                                                       AS net_distribuable,
  CASE
    WHEN m.mode_operation = 'B' THEN
      GREATEST(
        COALESCE(SUM(r.amount), 0)
          - COALESCE(SUM(r.amount) * 0.15, 0)
          - 80,
        0
      ) * 0.70
    ELSE 0
  END                                                     AS part_modele,
  CASE
    WHEN m.mode_operation = 'B' THEN
      GREATEST(
        COALESCE(SUM(r.amount), 0)
          - COALESCE(SUM(r.amount) * 0.15, 0)
          - 80,
        0
      ) * 0.30
    WHEN m.mode_operation = 'A' THEN
      GREATEST(
        COALESCE(SUM(r.amount), 0)
          - COALESCE(SUM(r.amount) * 0.15, 0)
          - 80,
        0
      ) * 1.00
    ELSE 0
  END                                                     AS part_sqwensy,
  m.palier_remuneration                                   AS palier_detected,
  (m.revenue_monthly_avg_3m > 750 AND m.palier_remuneration = 'P2')
                                                          AS palier_escalation_triggered
FROM public.agence_models m
LEFT JOIN public.agence_revenus_modele r ON r.model_id = m.model_id
GROUP BY
  m.model_id,
  m.mode_operation,
  m.palier_remuneration,
  m.revenue_monthly_avg_3m,
  date_trunc('month', COALESCE(r.created_at, now()));

CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_model_period
  ON public.agence_commission_calcul (model_id, period);

COMMENT ON MATERIALIZED VIEW public.agence_commission_calcul IS
  'Monthly commission split per model. Refreshed end-of-month by cron (Phase 8.B). Frais production dedies = forfait 80 EUR (to be refined per model later).';

-- ═══════════════════════════════════════════════════════════════════════════
-- END 042_agence_commission_calcul.sql
-- ═══════════════════════════════════════════════════════════════════════════
