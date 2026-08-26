-- 022_paybill_salary_rls_fix.sql
-- Recreate missing RLS policies for pay bill and legacy salary import tables.
-- These tables had RLS enabled but no policies, causing every authenticated
-- write (and read) to be denied with "new row violates row-level security policy".

-- Helper functions are expected to exist from remediation.sql / 013_admin_consolidation.sql:
--   public.is_admin()            -> boolean
--   public.can_access_office(bigint) -> boolean

-- ---------------------------------------------------------------------------
-- 1. Pay Bill import batches
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view paybill imports in their office" ON public.paybill_imports;
DROP POLICY IF EXISTS "Users can manage paybill imports in their office" ON public.paybill_imports;
DROP POLICY IF EXISTS "Admins can manage all paybill imports" ON public.paybill_imports;

CREATE POLICY "Users can view paybill imports in their office"
  ON public.paybill_imports FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage paybill imports in their office"
  ON public.paybill_imports FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all paybill imports"
  ON public.paybill_imports FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Pay Bill employee earnings
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view paybill employee earnings in their office" ON public.paybill_employee_earnings;
DROP POLICY IF EXISTS "Users can manage paybill employee earnings in their office" ON public.paybill_employee_earnings;
DROP POLICY IF EXISTS "Admins can manage all paybill employee earnings" ON public.paybill_employee_earnings;

CREATE POLICY "Users can view paybill employee earnings in their office"
  ON public.paybill_employee_earnings FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage paybill employee earnings in their office"
  ON public.paybill_employee_earnings FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all paybill employee earnings"
  ON public.paybill_employee_earnings FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Pay Bill employee deductions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view paybill employee deductions in their office" ON public.paybill_employee_deductions;
DROP POLICY IF EXISTS "Users can manage paybill employee deductions in their office" ON public.paybill_employee_deductions;
DROP POLICY IF EXISTS "Admins can manage all paybill employee deductions" ON public.paybill_employee_deductions;

CREATE POLICY "Users can view paybill employee deductions in their office"
  ON public.paybill_employee_deductions FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage paybill employee deductions in their office"
  ON public.paybill_employee_deductions FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all paybill employee deductions"
  ON public.paybill_employee_deductions FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Pay Bill employee components (fix admin policy WITH CHECK)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view employee components in their office" ON public.paybill_employee_components;
DROP POLICY IF EXISTS "Users can manage employee components in their office" ON public.paybill_employee_components;
DROP POLICY IF EXISTS "Admins can manage all employee components" ON public.paybill_employee_components;

CREATE POLICY "Users can view employee components in their office"
  ON public.paybill_employee_components FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage employee components in their office"
  ON public.paybill_employee_components FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all employee components"
  ON public.paybill_employee_components FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. Pay Bill ledger vouchers
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view paybill vouchers in their office" ON public.paybill_vouchers;
DROP POLICY IF EXISTS "Users can manage paybill vouchers in their office" ON public.paybill_vouchers;
DROP POLICY IF EXISTS "Admins can manage all paybill vouchers" ON public.paybill_vouchers;

CREATE POLICY "Users can view paybill vouchers in their office"
  ON public.paybill_vouchers FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage paybill vouchers in their office"
  ON public.paybill_vouchers FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all paybill vouchers"
  ON public.paybill_vouchers FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Pay Bill office settings
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view paybill settings in their office" ON public.paybill_settings;
DROP POLICY IF EXISTS "Users can manage paybill settings in their office" ON public.paybill_settings;
DROP POLICY IF EXISTS "Admins can manage all paybill settings" ON public.paybill_settings;

CREATE POLICY "Users can view paybill settings in their office"
  ON public.paybill_settings FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage paybill settings in their office"
  ON public.paybill_settings FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all paybill settings"
  ON public.paybill_settings FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. Legacy salary imports
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view salary imports in their office" ON public.salary_imports;
DROP POLICY IF EXISTS "Users can manage salary imports in their office" ON public.salary_imports;
DROP POLICY IF EXISTS "Admins can manage all salary imports" ON public.salary_imports;

CREATE POLICY "Users can view salary imports in their office"
  ON public.salary_imports FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage salary imports in their office"
  ON public.salary_imports FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all salary imports"
  ON public.salary_imports FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. Legacy employee salary rows
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view employee salaries in their office" ON public.employee_salary;
DROP POLICY IF EXISTS "Users can manage employee salaries in their office" ON public.employee_salary;
DROP POLICY IF EXISTS "Admins can manage all employee salaries" ON public.employee_salary;

CREATE POLICY "Users can view employee salaries in their office"
  ON public.employee_salary FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage employee salaries in their office"
  ON public.employee_salary FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all employee salaries"
  ON public.employee_salary FOR ALL
  USING (public.is_admin());
