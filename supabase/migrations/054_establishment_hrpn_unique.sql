-- ============================================================================
-- 054_establishment_hrpn_unique.sql
-- HRPN No. is the single source of truth linking the Establishment employee
-- directory with the Paybill employee ledger.
--
-- 1. Canonicalize existing hrpn_no values (trim + upper-case) so
--    ` 20014113 ` and `20014113` are the same identity.
-- 2. Drop case-variant duplicates, keeping the earliest row per HRPN.
-- 3. Enforce a case-insensitive UNIQUE index on hrpn_no (single-office mode:
--    no office_id column since 043).
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'establishment_employees'
  ) THEN
    -- 1. Canonicalize stored HRPNs
    UPDATE public.establishment_employees
    SET hrpn_no = UPPER(TRIM(hrpn_no)),
        updated_at = NOW()
    WHERE hrpn_no IS NOT NULL AND TRIM(hrpn_no) <> '';

    -- Normalize empty / whitespace-only HRPNs to NULL (no identity)
    UPDATE public.establishment_employees
    SET hrpn_no = NULL,
        updated_at = NOW()
    WHERE hrpn_no IS NOT NULL AND TRIM(hrpn_no) = '';

    -- 2. Remove case-variant duplicates, keeping the earliest created row
    DELETE FROM public.establishment_employees a
    USING public.establishment_employees b
    WHERE a.ctid > b.ctid
      AND a.hrpn_no IS NOT NULL
      AND b.hrpn_no IS NOT NULL
      AND UPPER(TRIM(a.hrpn_no)) = UPPER(TRIM(b.hrpn_no));

    -- 3. Drop the legacy case-sensitive index if present and enforce
    --    case-insensitive uniqueness on non-empty HRPNs.
    DROP INDEX IF EXISTS public.idx_establishment_employees_office_hrpn;
    DROP INDEX IF EXISTS public.idx_establishment_employees_hrpn_unique;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_establishment_employees_hrpn_unique
      ON public.establishment_employees (UPPER(TRIM(hrpn_no)))
      WHERE hrpn_no IS NOT NULL AND TRIM(hrpn_no) <> '';
  END IF;
END $$;

COMMIT;
