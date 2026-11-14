-- 015_employees_add_designation_and_payscale.sql
-- Add designation and pay_scale columns to public.employees table

ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS pay_scale TEXT;

COMMENT ON COLUMN public.employees.designation IS 'Employee official designation';
COMMENT ON COLUMN public.employees.pay_scale IS 'Employee pay scale (e.g. PB-2 (9300-34800)/4200)';
