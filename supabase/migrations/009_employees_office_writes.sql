-- 009_employees_office_writes.sql
-- Allow office users to insert, update, and delete records in their own office
-- for tables that only had SELECT policies for office users.
-- This fixes save operations (create/update) for:
--   - employees (payroll employee registration)
--   - employee_salaries (salary entry)
--   - parties (vendor/party management)
--   - party_transactions (party transaction entry)
--   - office_details (office settings)
--   - app_config (financial year rollover)
-- Admins remain unrestricted via is_admin().
--
-- NOTE: PostgreSQL has no "CREATE POLICY IF NOT EXISTS". Each policy below is
-- guarded by a check against pg_policies so the file stays idempotent.

-- ---------------------------------------------------------------------------
-- employees: office users can now insert, update, delete within their office
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'employees' AND policyname = 'employees_office_manage'
  ) THEN
    CREATE POLICY "employees_office_manage"
      ON public.employees FOR ALL
      USING (public.can_access_office(office_id))
      WITH CHECK (public.can_access_office(office_id));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- employee_salaries: remove conflicting duplicate policy and use consistent naming
-- Migration 007 created "Users can manage salaries in their office" without
-- dropping old policies, which can cause conflicts.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage salaries in their office" ON public.employee_salaries;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'employee_salaries' AND policyname = 'salaries_office_manage'
  ) THEN
    CREATE POLICY "salaries_office_manage"
      ON public.employee_salaries FOR ALL
      USING (public.can_access_office(office_id))
      WITH CHECK (public.can_access_office(office_id));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- parties: office users can now insert, update, delete within their office
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'parties' AND policyname = 'parties_office_manage'
  ) THEN
    CREATE POLICY "parties_office_manage"
      ON public.parties FOR ALL
      USING (public.can_access_office(office_id))
      WITH CHECK (public.can_access_office(office_id));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- party_transactions: office users can now insert, update, delete within their office
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'party_transactions' AND policyname = 'transactions_office_manage'
  ) THEN
    CREATE POLICY "transactions_office_manage"
      ON public.party_transactions FOR ALL
      USING (public.can_access_office(office_id))
      WITH CHECK (public.can_access_office(office_id));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- office_details: office users can now insert, update, delete within their office
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'office_details' AND policyname = 'office_details_office_manage'
  ) THEN
    CREATE POLICY "office_details_office_manage"
      ON public.office_details FOR ALL
      USING (public.can_access_office(office_id))
      WITH CHECK (public.can_access_office(office_id));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- app_config: office users can now insert, update, delete within their office
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_config' AND policyname = 'app_config_office_manage'
  ) THEN
    CREATE POLICY "app_config_office_manage"
      ON public.app_config FOR ALL
      USING (public.can_access_office(office_id))
      WITH CHECK (public.can_access_office(office_id));
  END IF;
END $$;
