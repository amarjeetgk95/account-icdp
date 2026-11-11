-- ============================================================================
-- 043_drop_office_id_columns.sql
-- Completely drop the "office_id" column from all tables in public schema,
-- deduplicate multi-office config rows using ctid, and create clean single-office constraints.
-- ============================================================================

BEGIN;

-- 1. Deduplicate app_config using PostgreSQL ctid (works without 'id' column)
DELETE FROM public.app_config
WHERE ctid NOT IN (
  SELECT min(ctid)
  FROM public.app_config
  GROUP BY key
);

-- 2. Drop office_id column from every table in the public schema dynamically
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND column_name = 'office_id'
      AND table_name != 'offices'
  ) LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS office_id CASCADE;', r.table_name);
    EXCEPTION WHEN OTHERS THEN
      -- Safely continue
    END;
  END LOOP;
END $$;

-- 3. Add single-office unique constraints
DO $$
BEGIN
  -- app_config (key unique)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_config') THEN
    ALTER TABLE public.app_config DROP CONSTRAINT IF EXISTS app_config_office_id_key_key;
    ALTER TABLE public.app_config DROP CONSTRAINT IF EXISTS app_config_key_unique;
    ALTER TABLE public.app_config ADD CONSTRAINT app_config_key_unique UNIQUE (key);
  END IF;

  -- budget_heads
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budget_heads') THEN
    ALTER TABLE public.budget_heads DROP CONSTRAINT IF EXISTS budget_heads_office_code_unique;
    ALTER TABLE public.budget_heads DROP CONSTRAINT IF EXISTS budget_heads_code_unique;
    DELETE FROM public.budget_heads
    WHERE ctid NOT IN (
      SELECT min(ctid)
      FROM public.budget_heads
      GROUP BY code
    );
    ALTER TABLE public.budget_heads ADD CONSTRAINT budget_heads_code_unique UNIQUE (code);
  END IF;

  -- employee_salaries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_salaries') THEN
    ALTER TABLE public.employee_salaries DROP CONSTRAINT IF EXISTS employee_salaries_employee_id_financial_year_month_key;
    ALTER TABLE public.employee_salaries DROP CONSTRAINT IF EXISTS employee_salaries_unique_entry;
    ALTER TABLE public.employee_salaries ADD CONSTRAINT employee_salaries_unique_entry UNIQUE (employee_id, financial_year, month);
  END IF;

  -- paybill_vouchers (month, financial_year unique)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paybill_vouchers') THEN
    DROP INDEX IF EXISTS public.idx_paybill_vouchers_office_month;
    DROP INDEX IF EXISTS public.idx_paybill_vouchers_month_fy;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_paybill_vouchers_month_fy ON public.paybill_vouchers(month, financial_year);
  END IF;

  -- form16_certificates (hrpn, financial_year unique)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form16_certificates') THEN
    DROP INDEX IF EXISTS public.idx_form16_certificates_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_form16_certificates_unique ON public.form16_certificates(lower(hrpn), financial_year);
  END IF;
END $$;

-- 4. Set clean single-office RLS policies
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'employees', 'employee_salaries', 'parties', 'party_transactions', 'app_config',
    'office_details', 'salary_imports', 'employee_salary', 'paybill_imports',
    'paybill_employee_earnings', 'paybill_employee_deductions', 'paybill_employee_components',
    'paybill_vouchers', 'paybill_settings', 'payroll_component_master', 'payroll_components',
    'payroll_component_aliases', 'gtr30_employee_master', 'gtr30_bills',
    'gtr30_budget_heads', 'gtr30_settings', 'gtr30_bill_code_mappings',
    'gtr44_bills', 'gtr44_settings', 'establishment_posts', 'establishment_employees',
    'establishment_payentries', 'establishment_settings', 'form16_certificates',
    'form16_defaults', 'form16_tax_rules', 'budget_heads', 'profiles'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      BEGIN
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_single_office_all" ON public.%I;', tbl, tbl);
        EXECUTE format(
          'CREATE POLICY "%s_single_office_all" ON public.%I FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);',
          tbl, tbl
        );
      EXCEPTION WHEN OTHERS THEN
      END;
    END IF;
  END LOOP;
END $$;

COMMIT;
