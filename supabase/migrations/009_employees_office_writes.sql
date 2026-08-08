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

-- ---------------------------------------------------------------------------
-- employees: office users can now insert, update, delete within their office
-- ---------------------------------------------------------------------------
CREATE POLICY IF NOT EXISTS "employees_office_manage"
  ON public.employees FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

-- ---------------------------------------------------------------------------
-- employee_salaries: remove conflicting duplicate policy and use consistent naming
-- Migration 007 created "Users can manage salaries in their office" without
-- dropping old policies, which can cause conflicts.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage salaries in their office" ON public.employee_salaries;

CREATE POLICY IF NOT EXISTS "salaries_office_manage"
  ON public.employee_salaries FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

-- ---------------------------------------------------------------------------
-- parties: office users can now insert, update, delete within their office
-- ---------------------------------------------------------------------------
CREATE POLICY IF NOT EXISTS "parties_office_manage"
  ON public.parties FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

-- ---------------------------------------------------------------------------
-- party_transactions: office users can now insert, update, delete within their office
-- ---------------------------------------------------------------------------
CREATE POLICY IF NOT EXISTS "transactions_office_manage"
  ON public.party_transactions FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

-- ---------------------------------------------------------------------------
-- office_details: office users can now insert, update, delete within their office
-- ---------------------------------------------------------------------------
CREATE POLICY IF NOT EXISTS "office_details_office_manage"
  ON public.office_details FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

-- ---------------------------------------------------------------------------
-- app_config: office users can now insert, update, delete within their office
-- ---------------------------------------------------------------------------
CREATE POLICY IF NOT EXISTS "app_config_office_manage"
  ON public.app_config FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));
