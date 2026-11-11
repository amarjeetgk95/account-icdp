-- ============================================================================
-- 056_merge_payroll_into_establishment.sql
-- Single integrated register: `establishment_employees` becomes the ONLY
-- person table with complete data. The legacy payroll `employees` table stays
-- readable (salary stores still key on it) but every person and every usable
-- field is merged here, so the Establishment directory renders complete rows
-- and the payroll duplicate list can go away.
--
-- What this migration does (idempotent, fill-empty-only, re-runnable):
--   0. Normalize HRPN/PAN whitespace + placeholders (same as 051 preamble).
--   1. Fill EMPTY establishment columns from the payroll row matched by HRPN
--      (designation, pay_scale, budget_head_id, join/transfer dates, pan).
--      Never overwrites a non-empty canonical value.
--   2. Same fill by PAN fallback for rows whose HRPN never matched, plus
--      guarded HRPN adoption (NULL HRPN takes the payroll HRPN only when no
--      other establishment row already owns it).
--   3. Insert payroll-only persons (matched by neither HRPN nor PAN).
--   4. Re-run the 051 FK backfill for still-unlinked salary rows.
--
-- What it deliberately does NOT do:
--   - No drops/renames of `employees` (salary FKs still point at it).
--   - No overwrite of any non-empty establishment value.
--
-- Safe to run via `supabase db push`. Re-runnable.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 0. Normalize identities (idempotent).
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
-- 1. Fill empty establishment columns from the HRPN-matched payroll row.
-- --------------------------------------------------------------------------

UPDATE public.establishment_employees AS ee
SET
  designation = COALESCE(NULLIF(btrim(ee.designation), ''), NULLIF(btrim(e.designation), ''), ee.designation),
  pay_scale = COALESCE(NULLIF(btrim(ee.pay_scale), ''), NULLIF(btrim(e.pay_scale), ''), ee.pay_scale),
  budget_head_id = COALESCE(NULLIF(btrim(ee.budget_head_id), ''), NULLIF(btrim(e.budget_head_id::text), ''), ee.budget_head_id),
  join_date = COALESCE(ee.join_date, e.join_date),
  transfer_date = COALESCE(ee.transfer_date, e.transfer_date),
  pan = COALESCE(NULLIF(ee.pan, ''), NULLIF(upper(btrim(e.pan)), ''), ee.pan)
FROM public.employees AS e
WHERE ee.hrpn_no IS NOT NULL AND ee.hrpn_no <> ''
  AND e.hprn_no IS NOT NULL AND e.hprn_no <> ''
  AND ee.hrpn_no = upper(e.hprn_no)
  AND (
    NULLIF(btrim(ee.designation), '') IS NULL AND NULLIF(btrim(e.designation), '') IS NOT NULL
    OR NULLIF(btrim(ee.pay_scale), '') IS NULL AND NULLIF(btrim(e.pay_scale), '') IS NOT NULL
    OR NULLIF(btrim(ee.budget_head_id), '') IS NULL AND NULLIF(btrim(e.budget_head_id::text), '') IS NOT NULL
    OR (ee.join_date IS NULL AND e.join_date IS NOT NULL)
    OR (ee.transfer_date IS NULL AND e.transfer_date IS NOT NULL)
    OR (NULLIF(ee.pan, '') IS NULL AND NULLIF(btrim(e.pan), '') IS NOT NULL)
  )
  -- Never steal a PAN that another establishment row already owns (partial
  -- unique index would abort the whole migration otherwise).
  AND (
    NULLIF(ee.pan, '') IS NOT NULL
    OR NULLIF(btrim(e.pan), '') IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.establishment_employees x
      WHERE x.id <> ee.id AND x.pan = upper(btrim(e.pan))
    )
  );

-- --------------------------------------------------------------------------
-- 2. PAN-fallback fill for rows whose HRPN never matched a payroll row.
-- --------------------------------------------------------------------------

UPDATE public.establishment_employees AS ee
SET
  designation = COALESCE(NULLIF(btrim(ee.designation), ''), NULLIF(btrim(e.designation), ''), ee.designation),
  pay_scale = COALESCE(NULLIF(btrim(ee.pay_scale), ''), NULLIF(btrim(e.pay_scale), ''), ee.pay_scale),
  budget_head_id = COALESCE(NULLIF(btrim(ee.budget_head_id), ''), NULLIF(btrim(e.budget_head_id::text), ''), ee.budget_head_id),
  join_date = COALESCE(ee.join_date, e.join_date),
  transfer_date = COALESCE(ee.transfer_date, e.transfer_date)
FROM public.employees AS e
WHERE ee.pan IS NOT NULL AND ee.pan <> ''
  AND e.pan IS NOT NULL AND btrim(e.pan) <> ''
  AND ee.pan = upper(btrim(e.pan))
  AND NOT EXISTS (
    SELECT 1 FROM public.employees m
    WHERE m.hprn_no IS NOT NULL AND m.hprn_no <> ''
      AND ee.hrpn_no IS NOT NULL AND ee.hrpn_no <> ''
      AND upper(m.hprn_no) = ee.hrpn_no
  )
  AND (
    NULLIF(btrim(ee.designation), '') IS NULL AND NULLIF(btrim(e.designation), '') IS NOT NULL
    OR NULLIF(btrim(ee.pay_scale), '') IS NULL AND NULLIF(btrim(e.pay_scale), '') IS NOT NULL
    OR NULLIF(btrim(ee.budget_head_id), '') IS NULL AND NULLIF(btrim(e.budget_head_id::text), '') IS NOT NULL
    OR (ee.join_date IS NULL AND e.join_date IS NOT NULL)
    OR (ee.transfer_date IS NULL AND e.transfer_date IS NOT NULL)
  );

-- Guarded HRPN adoption: establishment rows with no HRPN take the payroll
-- HRPN (same PAN) only when nobody else owns it.
UPDATE public.establishment_employees AS ee
SET hrpn_no = btrim(e.hprn_no, E' \t\n\r\f\v')
FROM public.employees AS e
WHERE (ee.hrpn_no IS NULL OR ee.hrpn_no = '')
  AND e.hprn_no IS NOT NULL AND e.hprn_no <> ''
  AND ee.pan IS NOT NULL AND ee.pan <> ''
  AND e.pan IS NOT NULL AND btrim(e.pan) <> ''
  AND ee.pan = upper(btrim(e.pan))
  AND NOT EXISTS (
    SELECT 1 FROM public.establishment_employees x
    WHERE x.id <> ee.id AND x.hrpn_no = upper(btrim(e.hprn_no, E' \t\n\r\f\v'))
  );

-- --------------------------------------------------------------------------
-- 3. Insert payroll-only persons (matched by neither HRPN nor PAN).
-- --------------------------------------------------------------------------

INSERT INTO public.establishment_employees
  (id, hrpn_no, name, designation, pan, pay_scale, join_date, transfer_date,
   budget_head_id, active, allowances, deductions)
SELECT
  uuid_generate_v4(),
  CASE
    WHEN e.hprn_no IS NULL OR upper(e.hprn_no) IN ('0', '-', 'NA', 'N/A', 'NULL', 'NONE', 'NIL')
    THEN NULL
    ELSE upper(e.hprn_no)
  END,
  btrim(e.name),
  NULLIF(btrim(e.designation), ''),
  NULLIF(upper(btrim(e.pan)), ''),
  NULLIF(btrim(e.pay_scale), ''),
  e.join_date,
  e.transfer_date,
  NULLIF(btrim(e.budget_head_id::text), ''),
  (e.transfer_date IS NULL),
  '{}'::jsonb,
  '{}'::jsonb
FROM public.employees AS e
WHERE btrim(e.name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.establishment_employees x
    WHERE (
      e.hprn_no IS NOT NULL
      AND upper(e.hprn_no) NOT IN ('0', '-', 'NA', 'N/A', 'NULL', 'NONE', 'NIL')
      AND x.hrpn_no = upper(e.hprn_no)
    ) OR (
      e.pan IS NOT NULL AND btrim(e.pan) <> ''
      AND x.pan = upper(btrim(e.pan))
    )
  );

-- --------------------------------------------------------------------------
-- 4. Re-run the 051 FK backfill for still-unlinked salary rows.
-- --------------------------------------------------------------------------

UPDATE public.employee_salaries AS es
SET establishment_employee_id = ee.id
FROM public.employees AS e
JOIN public.establishment_employees AS ee
  ON ee.hrpn_no = upper(e.hprn_no)
WHERE es.employee_id = e.id
  AND es.establishment_employee_id IS NULL
  AND e.hprn_no IS NOT NULL AND e.hprn_no <> '';

UPDATE public.employee_salaries AS es
SET establishment_employee_id = ee.id
FROM public.employees AS e
JOIN public.establishment_employees AS ee
  ON ee.pan = upper(e.pan)
WHERE es.employee_id = e.id
  AND es.establishment_employee_id IS NULL
  AND e.pan IS NOT NULL AND btrim(e.pan) <> '';

UPDATE public.paybill_employee_earnings AS pe
SET establishment_employee_id = ee.id
FROM public.establishment_employees AS ee
WHERE ee.hrpn_no = upper(btrim(pe.hrpn, E' \t\n\r\f\v'))
  AND pe.establishment_employee_id IS NULL
  AND pe.hrpn IS NOT NULL AND btrim(pe.hrpn, E' \t\n\r\f\v') <> '';

UPDATE public.paybill_employee_deductions AS pd
SET establishment_employee_id = ee.id
FROM public.establishment_employees AS ee
WHERE ee.hrpn_no = upper(btrim(pd.hrpn, E' \t\n\r\f\v'))
  AND pd.establishment_employee_id IS NULL
  AND pd.hrpn IS NOT NULL AND btrim(pd.hrpn, E' \t\n\r\f\v') <> '';

COMMIT;
