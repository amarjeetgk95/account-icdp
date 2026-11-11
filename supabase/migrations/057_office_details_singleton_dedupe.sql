-- ============================================================================
-- 057_office_details_singleton_dedupe.sql
-- Fix "saved but gone after refresh": office_details had no singleton guard,
-- so earlier buggy saves (limit 1 without ORDER BY, upsert->insert churn)
-- could leave N rows. Reads/updates then hit an arbitrary row, making saves
-- look successful while refresh showed a different (stale/empty) row.
--
-- Defensive: live DBs have drifted from 001_initial_schema (unexpected
-- NOT NULLs, missing updated_at column -> ERROR 42703), so every step here
-- checks for column existence first and is safe to re-run.
--
-- What this migration does (idempotent):
--   1. Ensures created_at / updated_at exist (ADD COLUMN IF NOT EXISTS).
--   2. Backfills NULL timestamps so ordering is deterministic.
--   3. Drops NOT NULL on the 7 text columns (safety net if 056 wasn't applied).
--   4. Deletes duplicate rows, keeping the most recently created row
--      (tie-break: most non-empty fields).
-- ============================================================================

BEGIN;

-- 1. Ensure timestamp columns exist (live DBs are missing updated_at).
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.office_details ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Backfill NULL timestamps.
UPDATE public.office_details SET created_at = NOW() WHERE created_at IS NULL;
UPDATE public.office_details SET updated_at = created_at WHERE updated_at IS NULL;

-- 3. Drop NOT NULL on text columns, guarded by existence checks.
DO $$
DECLARE
  c TEXT;
BEGIN
  FOREACH c IN ARRAY ARRAY['office_name','subtitle','address','phone','email','gst','tan']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'office_details'
        AND column_name = c
    ) THEN
      EXECUTE format('ALTER TABLE public.office_details ALTER COLUMN %I DROP NOT NULL;', c);
    END IF;
  END LOOP;
END $$;

-- 4. Keep exactly one row: newest created_at wins, then most-filled row wins.
DELETE FROM public.office_details
WHERE ctid NOT IN (
  SELECT ctid FROM public.office_details
  ORDER BY
    created_at DESC NULLS LAST,
    (
      (CASE WHEN COALESCE(office_name,'') <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(subtitle,'')    <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(address,'')     <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(phone,'')       <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(email,'')       <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(gst,'')         <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(tan,'')         <> '' THEN 1 ELSE 0 END)
    ) DESC,
    ctid ASC
  LIMIT 1
);

COMMIT;
