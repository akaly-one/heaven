-- 052 : compteur visiteur séquentiel par model — NB 2026-04-24
-- Permet de générer des pseudos guest incrémentaux ("visiteur-001", "visiteur-042"...)
-- atomiques même sous concurrence. Utilisé par /api/clients POST lead_source=web_guest.

ALTER TABLE agence_models
  ADD COLUMN IF NOT EXISTS visitor_counter INT DEFAULT 0;

CREATE OR REPLACE FUNCTION next_visitor_number(p_model_id TEXT)
RETURNS INT AS $$
DECLARE
  v_counter INT;
BEGIN
  UPDATE agence_models
  SET visitor_counter = COALESCE(visitor_counter, 0) + 1
  WHERE model_id = p_model_id
  RETURNING visitor_counter INTO v_counter;

  IF v_counter IS NULL THEN
    RETURN 1;
  END IF;

  RETURN v_counter;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION next_visitor_number IS 'Compteur visiteur atomique par model. Retourne le prochain numéro séquentiel.';
