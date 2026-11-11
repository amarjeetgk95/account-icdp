-- ============================================================================
-- 065_gr_repository_hardening.sql
-- GR Repository hardening (single-office).
--
-- Additive only — does NOT modify the destructive 040_gr_repository.sql.
--
-- Fixes:
--  P0-1 duplicate gr_number enforced only in JS (race-prone)  -> unique CI index
--  P0-2 empty/whitespace gr_number slips through JS only      -> CHECK constraint
--  P1   updated_at never refreshed on UPDATE (client relied on payload)
--  P1   keywords search lacks a GIN index
--  P1   audit log listing orders by created_at without a matching index
--  P1   audit action open text column (typos possible)        -> CHECK NOT VALID
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Dedupe case-insensitive / trimmed gr_number before the unique index.
--    Keep the earliest row per normalized number. Audit rows are repointed
--    to the keeper so the trail survives; relations and explicit access
--    grants on duplicates are cascade-deleted with the duplicate rows.
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='gr_repository') THEN
    WITH ranked AS (
      SELECT id,
        LOWER(BTRIM(gr_number)) AS k,
        ROW_NUMBER() OVER (PARTITION BY LOWER(BTRIM(gr_number)) ORDER BY created_at, id) AS rn
      FROM public.gr_repository
    ),
    dup_map AS (
      SELECT r.id AS dup_id, first.id AS keep_id
      FROM ranked r
      JOIN (SELECT k, id FROM ranked WHERE rn = 1) first USING (k)
      WHERE r.rn > 1
    )
    UPDATE public.gr_audit_logs a SET gr_id = m.keep_id
    FROM dup_map m WHERE a.gr_id = m.dup_id;

    DELETE FROM public.gr_repository p USING (
      SELECT id,
        ROW_NUMBER() OVER (PARTITION BY LOWER(BTRIM(gr_number)) ORDER BY created_at, id) AS rn
      FROM public.gr_repository
    ) d WHERE p.id = d.id AND d.rn > 1;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 2. Constraints + indexes
-- --------------------------------------------------------------------------
-- Unique GR number (case-insensitive, trimmed) — mirrors JS pre-check
CREATE UNIQUE INDEX IF NOT EXISTS uq_gr_repo_gr_number_ci
  ON public.gr_repository (LOWER(BTRIM(gr_number)));

-- Non-empty GR number (NOT VALID: historical rows are not re-scanned)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_gr_repo_gr_number_not_blank') THEN
    ALTER TABLE public.gr_repository ADD CONSTRAINT chk_gr_repo_gr_number_not_blank
      CHECK (BTRIM(gr_number) <> '') NOT VALID;
  END IF;
END $$;

-- Keyword array containment search
CREATE INDEX IF NOT EXISTS idx_gr_repo_keywords
  ON public.gr_repository USING gin (keywords);

-- Audit listing: WHERE gr_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_gr_audit_gr_id_created
  ON public.gr_audit_logs (gr_id, created_at DESC);

-- Audit action whitelist (NOT VALID: tolerate historical/legacy rows)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_gr_audit_action') THEN
    ALTER TABLE public.gr_audit_logs ADD CONSTRAINT chk_gr_audit_action
      CHECK (action IN (
        'CREATED',
        'UPDATED',
        'PDF_REPLACED',
        'VISIBILITY_CHANGED',
        'ARCHIVED',
        'RESTORED',
        'DELETED'
      )) NOT VALID;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 3. Server-side updated_at touch (client no longer needs to send it)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gr_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_gr_touch_updated_at ON public.gr_repository;
CREATE TRIGGER trg_gr_touch_updated_at
  BEFORE UPDATE ON public.gr_repository
  FOR EACH ROW EXECUTE FUNCTION public.gr_touch_updated_at();

COMMIT;
