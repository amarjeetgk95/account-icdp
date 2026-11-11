-- ============================================================================
-- 051_canonical_employee_link.sql
-- Phase 3 (employee canonicalization), step 1: link salary stores to the
-- canonical register WITHOUT dropping anything.
--
-- Canonical choice: public.establishment_employees (one row per person,
-- richest person-level columns, the only employee table that ever had a
-- UNIQUE(hrpn) constraint). `employees` (payroll) and `gtr30_employee_master`
-- (month/bill-code roster snapshots) stay fully operational; they become
-- read views in a later migration after a dual-read verification cycle.
--
-- What this migration does (all additive + idempotent):
--   1. Re-assert partial UNIQUE(hrpn) and UNIQUE(pan) on
--      establishment_employees (the 029 index died with office_id in 043).
--   2. Add nullable establishment_employee_id FK columns to
--      employee_salaries, paybill_employee_earnings, paybill_employee_deductions.
--   3. Backfill those FKs by HRPN (fallback PAN for employee_salaries).
--   4. Add covering indexes for the new FKs.
--
-- What it deliberately does NOT do:
--   - No drops/renames (043 drift question still open on live DB).
--   - No change to gtr30_employee_master (roster snapshots key on
--     month_key+bill_code, not on person identity).
--   - No RPC changes (045/048 own the RPC layer).
--
-- Safe to run via `supabase db push`. Re-runnable.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- -1. Drop pre-043 leftover trigger function (NOT in version control — found
--    live 2026-10-11 when it aborted this migration with
--    "42703: column e.office_id does not exist" inside
--    enforce_employee_office()). Dropping a column does not drop functions
--    that reference it, so 043 left this corpse behind; it fires on
--    employee_salaries writes and breaks them. CASCADE also drops the
--    trigger(s) that call it, on whatever table(s) they live on.
-- --------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.enforce_employee_office() CASCADE;
-- Sibling corpse on party_transactions, found live in the same discovery
-- (function list, 2026-10-11). Same fate: references dropped office columns.
DROP FUNCTION IF EXISTS public.enforce_party_office() CASCADE;

-- --------------------------------------------------------------------------
-- 0. Data cleanup preamble (verified live 2026-10-11: 52 establishment rows,
--    53 payroll rows, zero true duplicates, but HRPNs carry trailing CRLF
--    from imports, e.g. '20106461\r\n', which would defeat exact matching).
--    Trim whitespace (incl. CR/LF/TAB) and null-out placeholders so the
--    partial unique indexes below only ever see real identities.
-- --------------------------------------------------------------------------

UPDATE public.establishment_employees
SET hrpn_no = NULL
WHERE hrpn_no IS NOT NULL
  AND (btrim(hrpn_no, E' \t\n\r\f\v') = ''
    OR upper(btrim(hrpn_no, E' \t\n\r\f\v')) IN ('0', '-', 'NA', 'N/A', 'NULL', 'NONE', 'NIL'));

UPDATE public.establishment_employees
SET hrpn_no = btrim(hrpn_no, E' \t\n\r\f\v')
WHERE hrpn_no IS NOT NULL;

UPDATE public.establishment_employees
SET pan = NULL
WHERE pan IS NOT NULL AND btrim(pan) = '';

UPDATE public.establishment_employees
SET pan = upper(btrim(pan))
WHERE pan IS NOT NULL;

UPDATE public.employees
SET hprn_no = NULL
WHERE hprn_no IS NOT NULL
  AND (btrim(hprn_no, E' \t\n\r\f\v') = ''
    OR upper(btrim(hprn_no, E' \t\n\r\f\v')) IN ('0', '-', 'NA', 'N/A', 'NULL', 'NONE', 'NIL'));

UPDATE public.employees
SET hprn_no = btrim(hprn_no, E' \t\n\r\f\v')
WHERE hprn_no IS NOT NULL;

-- --------------------------------------------------------------------------
-- 1. Canonical identity guarantees on establishment_employees.
--    Partial indexes (ignore NULL/empty) so legacy incomplete rows never block.
-- --------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_establishment_employees_hrpn
  ON public.establishment_employees (hrpn_no)
  WHERE hrpn_no IS NOT NULL AND hrpn_no <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_establishment_employees_pan
  ON public.establishment_employees (pan)
  WHERE pan IS NOT NULL AND pan <> '';

-- --------------------------------------------------------------------------
-- 2. Link columns (nullable FK -> canonical register).
-- --------------------------------------------------------------------------

ALTER TABLE public.employee_salaries
  ADD COLUMN IF NOT EXISTS establishment_employee_id UUID
  REFERENCES public.establishment_employees (id) ON DELETE SET NULL;

ALTER TABLE public.paybill_employee_earnings
  ADD COLUMN IF NOT EXISTS establishment_employee_id UUID
  REFERENCES public.establishment_employees (id) ON DELETE SET NULL;

ALTER TABLE public.paybill_employee_deductions
  ADD COLUMN IF NOT EXISTS establishment_employee_id UUID
  REFERENCES public.establishment_employees (id) ON DELETE SET NULL;

-- --------------------------------------------------------------------------
-- 3. Backfill by HRPN.
--    employees.hprn_no carries the legacy 'hp' typo; establishment uses hrpn_no.
--    PAN fallback covers rows whose HRPN was never recorded (HRPN match first
--    so a shared/blank PAN can never hijack the link).
-- --------------------------------------------------------------------------

UPDATE public.employee_salaries AS es
SET establishment_employee_id = ee.id
FROM public.employees AS e
JOIN public.establishment_employees AS ee
  ON ee.hrpn_no = e.hprn_no
WHERE es.employee_id = e.id
  AND es.establishment_employee_id IS NULL
  AND e.hprn_no IS NOT NULL AND e.hprn_no <> '';

UPDATE public.employee_salaries AS es
SET establishment_employee_id = ee.id
FROM public.employees AS e
JOIN public.establishment_employees AS ee
  ON ee.pan = e.pan
WHERE es.employee_id = e.id
  AND es.establishment_employee_id IS NULL
  AND e.pan IS NOT NULL AND e.pan <> '';

UPDATE public.paybill_employee_earnings AS pe
SET establishment_employee_id = ee.id
FROM public.establishment_employees AS ee
WHERE ee.hrpn_no = btrim(pe.hrpn, E' \t\n\r\f\v')
  AND pe.establishment_employee_id IS NULL
  AND pe.hrpn IS NOT NULL AND btrim(pe.hrpn, E' \t\n\r\f\v') <> '';

UPDATE public.paybill_employee_deductions AS pd
SET establishment_employee_id = ee.id
FROM public.establishment_employees AS ee
WHERE ee.hrpn_no = btrim(pd.hrpn, E' \t\n\r\f\v')
  AND pd.establishment_employee_id IS NULL
  AND pd.hrpn IS NOT NULL AND btrim(pd.hrpn, E' \t\n\r\f\v') <> '';

-- --------------------------------------------------------------------------
-- 4. Covering indexes for the new join path.
-- --------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_employee_salaries_est_emp
  ON public.employee_salaries (establishment_employee_id);

CREATE INDEX IF NOT EXISTS idx_paybill_earnings_est_emp
  ON public.paybill_employee_earnings (establishment_employee_id);

CREATE INDEX IF NOT EXISTS idx_paybill_deductions_est_emp
  ON public.paybill_employee_deductions (establishment_employee_id);

COMMIT;
