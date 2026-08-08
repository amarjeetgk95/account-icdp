-- Add HRPN No. to employees
ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS hprn_no TEXT;

COMMENT ON COLUMN public.employees.hprn_no IS 'Health Pension Registration Number (HRPN) — unique employee identifier';
