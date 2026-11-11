-- ============================================================================
-- 047_purge_legacy_bill_codes.sql
-- Guaranteed server-side purge of legacy dummy bill codes from
-- gtr30_bill_code_mappings.
--
-- Migration 046 deleted 'GTR30-SAL', 'GTR30-DA', 'GTR30-BONUS' once, but
-- stale clients could re-persist them via the debounced replaceAll() sync.
-- The frontend (src/modules/gtr30/constants/billCodes.ts) now filters these
-- codes at every layer, so they can no longer be written back. This migration
-- removes any rows that survived, including case/hyphen/spacing variants,
-- matching the frontend normalizeBillCodeKey() logic.
-- ============================================================================

BEGIN;

-- 1. Deduplicate variant rows first (keep the earliest per normalized code)
--    so deleting variants cannot leave a duplicate-free table inconsistent
--    with the unique constraint on bill_code.
DELETE FROM public.gtr30_bill_code_mappings
WHERE ctid NOT IN (
  SELECT min(ctid)
  FROM public.gtr30_bill_code_mappings
  GROUP BY UPPER(REPLACE(REPLACE(REPLACE(bill_code, '-', ''), ' ', ''), E'\t', ''))
);

-- 2. Purge legacy dummy bill codes (normalized comparison mirrors
--    normalizeBillCodeKey: trim, drop hyphens/spaces, uppercase).
DELETE FROM public.gtr30_bill_code_mappings
WHERE UPPER(REPLACE(REPLACE(REPLACE(bill_code, '-', ''), ' ', ''), E'\t', ''))
  IN ('GTR30SAL', 'GTR30DA', 'GTR30BONUS');

COMMIT;
