-- ===========================================================================
-- 054_seed_missing_settings.sql
-- ---------------------------------------------------------------------------
-- WHY: usd_to_bdt_rate and enable_notice_board are read by the app
-- (lib/actions/auth.ts registration BDT conversion, lib/actions/payments.ts
-- getUsdToBdtRate, components/providers/settings-provider.tsx +
-- components/shared/notice-board.tsx) but were never seeded into the settings
-- table. Because /settings only renders rows that actually exist, these were
-- invisible/unsettable by an admin -- and with no usd_to_bdt_rate row,
-- convertCurrency() silently falls back to rate 0, so BDT pricing never
-- converts. This seeds both with sane defaults under an existing category so
-- they surface in the /settings UI.
--
-- IMPACT: inserts up to 2 rows into settings; existing rows untouched.
-- ROLLBACK: DELETE FROM settings WHERE key IN ('usd_to_bdt_rate','enable_notice_board');
-- ===========================================================================

INSERT INTO settings (key, value, category) VALUES
  ('usd_to_bdt_rate', '110', 'general'),
  ('enable_notice_board', 'true', 'general')
ON CONFLICT (key) DO NOTHING;
