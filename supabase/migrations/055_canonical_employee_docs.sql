-- ============================================================================
-- 055_canonical_employee_docs.sql
-- Document the canonical employee decision in the DB catalog (additive only).
--
-- Canonical: public.establishment_employees (one row per person, HRPN/PAN unique).
-- Legacy read-only mirror: public.employees (payroll, `hprn_no` typo) — kept for
-- roster / 24Q / salary history until the dual-read verification cycle ends.
-- Transactions: employee_salaries + paybill_employee_earnings/deductions link
-- via establishment_employee_id FK (added in 051).
--
-- What this migration does (idempotent, no drops/renames):
--   1. Re-assert partial UNIQUE(hrpn_no) + UNIQUE(pan) on establishment_employees.
--   2. COMMENT ON TABLE to mark canonical vs legacy in psql / dashboard.
--
-- Safe to run via `supabase db push`. Re-runnable.
-- ============================================================================

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_establishment_employees_hrpn
  ON public.establishment_employees (hrpn_no)
  WHERE hrpn_no IS NOT NULL AND hrpn_no <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_establishment_employees_pan
  ON public.establishment_employees (pan)
  WHERE pan IS NOT NULL AND pan <> '';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='establishment_employees') THEN
    EXECUTE $c$COMMENT ON TABLE public.establishment_employees IS 'CANONICAL employee master — single source of truth for HRPN/PAN identity. Only writable register; payroll employees is a legacy read-only mirror.'$c$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='employees') THEN
    EXECUTE $c$COMMENT ON TABLE public.employees IS 'LEGACY payroll mirror (read-only) — canonical writes live in establishment_employees. Kept for 24Q roster/salary history.'$c$;
  END IF;
END $$;

COMMIT;
