-- ═══════════════════════════════════════════════════════════════════════════
-- 076_pending_pseudo_correction.sql
-- BRIEF-16 Phase G — Agent IA pack awareness : tag client correction pseudo
--
-- Ajoute une colonne BOOLEAN sur agence_clients pour flagger qu'un fan a
-- probablement fait une erreur de pseudo sur un paiement précédent. L'agent
-- IA (detectPseudoCorrection) met le flag à true, la modèle le voit dans
-- le drawer pending + peut re-valider manuellement le paiement vers le
-- nouveau compte.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE agence_clients
  ADD COLUMN IF NOT EXISTS pending_pseudo_correction BOOLEAN DEFAULT false;

COMMENT ON COLUMN agence_clients.pending_pseudo_correction IS
  'BRIEF-16 — true quand agent IA détecte une demande correction pseudo du fan. Reset manuel par modèle après traitement.';

CREATE INDEX IF NOT EXISTS idx_agence_clients_pending_pseudo_correction
  ON agence_clients(model, pending_pseudo_correction)
  WHERE pending_pseudo_correction = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- END 076_pending_pseudo_correction.sql
-- ═══════════════════════════════════════════════════════════════════════════
