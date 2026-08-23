-- 027_gtr30_controlling_officer_sync.sql
-- Migration: Ensure controlling officer code is present in GTR-30 settings and existing bills.

-- 1. Update GTR-30 Defaults in paybill_settings
UPDATE public.paybill_settings
SET settings_value = jsonb_set(
  settings_value,
  '{settings,controllingOfficer}',
  COALESCE(settings_value->'settings'->'controllingOfficer', '"0101"'::jsonb),
  true
)
WHERE settings_key = 'gtr30_defaults';

-- 2. Backfill existing bills with controllingOfficer if missing or null in data JSONB
UPDATE public.gtr30_bills
SET data = jsonb_set(
  data,
  '{controllingOfficer}',
  COALESCE(
    to_jsonb(NULLIF(data->>'controllingOfficer', '')),
    (
      SELECT to_jsonb(NULLIF(ps.settings_value->'settings'->>'controllingOfficer', ''))
      FROM public.paybill_settings ps
      WHERE ps.office_id = gtr30_bills.office_id AND ps.settings_key = 'gtr30_defaults'
      LIMIT 1
    ),
    '"0101"'::jsonb
  ),
  true
)
WHERE data->>'controllingOfficer' IS NULL OR data->>'controllingOfficer' = '';
