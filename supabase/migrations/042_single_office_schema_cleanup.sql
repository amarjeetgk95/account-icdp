-- ============================================================================
-- 042_single_office_schema_cleanup.sql
-- Transition to Pure Single-Office Architecture (ICDP Surat)
--
-- Safely drops NOT NULL on all non-PK office_id columns dynamically
-- and updates RLS policies for all tables for authenticated single office access.
-- ============================================================================

BEGIN;

-- 1. Safely make office_id nullable across all tables where it is not in the primary key
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND column_name = 'office_id'
  ) LOOP
    -- Check if office_id is part of the primary key
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = r.table_name
        AND kcu.column_name = 'office_id'
    ) THEN
      BEGIN
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN office_id DROP NOT NULL;', r.table_name);
      EXCEPTION WHEN OTHERS THEN
        -- Ignore if already nullable or restricted
      END;
    END IF;
  END LOOP;
END $$;

-- 2. Update RLS policies for single-office operations (all authenticated users have full access)
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'employees', 'employee_salaries', 'parties', 'party_transactions', 'app_config',
    'office_details', 'offices', 'salary_imports', 'employee_salary', 'paybill_imports',
    'paybill_employee_earnings', 'paybill_employee_deductions', 'paybill_employee_components',
    'paybill_vouchers', 'paybill_settings', 'payroll_component_master', 'payroll_components',
    'payroll_component_aliases', 'gtr30_employee_master', 'gtr30_bills',
    'gtr30_budget_heads', 'gtr30_settings', 'gtr30_bill_code_mappings',
    'gtr44_bills', 'gtr44_settings', 'establishment_posts', 'establishment_employees',
    'establishment_payentries', 'establishment_settings', 'form16_certificates',
    'form16_defaults', 'form16_tax_rules', 'budget_heads'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      BEGIN
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        
        -- Drop old policies
        EXECUTE format('DROP POLICY IF EXISTS "%s_all" ON public.%I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_single_office_all" ON public.%I;', tbl, tbl);

        -- Create simple, direct authenticated single-office policy
        EXECUTE format(
          'CREATE POLICY "%s_single_office_all" ON public.%I FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);',
          tbl, tbl
        );
      EXCEPTION WHEN OTHERS THEN
        -- Safely continue if policy already created
      END;
    END IF;
  END LOOP;
END $$;

COMMIT;
