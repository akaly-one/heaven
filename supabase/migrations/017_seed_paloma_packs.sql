-- 017: Seed Paloma's packs (copy of Yumi's structure with Revolut payment)

DELETE FROM agence_packs WHERE model = 'paloma';

INSERT INTO agence_packs (model, pack_id, name, price, code, color, features, bonuses, face, badge, active, revolut_url, sort_order) VALUES
(
  'paloma', 'vip', 'VIP Glamour', 150, 'AG-P150', '#E63329',
  '["Pieds glamour/sales + accessoires", "Lingerie sexy + haul", "Teasing + demandes custom", "Dedicaces personnalisees"]'::jsonb,
  '{"fanvueAccess": false, "freeNudeExpress": true, "nudeDedicaceLevres": false, "freeVideoOffer": false}'::jsonb,
  false, NULL, true,
  'https://revolut.me/xia0_xin', 0
),
(
  'paloma', 'gold', 'Gold', 200, 'AG-P200', '#D4A017',
  '["TOUT du VIP inclus", "Nudes complets", "Cosplay", "Sextape sans visage"]'::jsonb,
  '{"fanvueAccess": true, "freeNudeExpress": true, "nudeDedicaceLevres": true, "freeVideoOffer": false}'::jsonb,
  false, 'Populaire', true,
  'https://revolut.me/xia0_xin', 1
),
(
  'paloma', 'diamond', 'Diamond', 250, 'AG-P250', '#4F46E5',
  '["TOUT du Gold inclus", "Nudes avec visage", "Cosplay avec visage", "Sextape avec visage", "Hard illimite"]'::jsonb,
  '{"fanvueAccess": true, "freeNudeExpress": true, "nudeDedicaceLevres": true, "freeVideoOffer": false}'::jsonb,
  true, NULL, true,
  'https://revolut.me/xia0_xin', 2
),
(
  'paloma', 'platinum', 'Platinum All-Access', 320, 'AG-P320', '#7C3AED',
  '["Acces TOTAL aux 3 packs", "Demandes personnalisees", "Video calls prives", "Contenu exclusif illimite"]'::jsonb,
  '{"fanvueAccess": true, "freeNudeExpress": true, "nudeDedicaceLevres": true, "freeVideoOffer": true}'::jsonb,
  true, 'Ultimate', true,
  'https://revolut.me/xia0_xin', 3
);
