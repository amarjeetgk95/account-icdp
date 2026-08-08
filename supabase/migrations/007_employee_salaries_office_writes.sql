-- 007_employee_salaries_office_writes.sql
-- Allow office users to manage their own office's monthly salary entries.
-- This fixes Save (upsert), Copy-from-previous (insert), and Clear All (delete)
-- for non-admin office users. Admins remain unrestricted via is_admin().

CREATE POLICY "Users can manage salaries in their office"
  ON public.employee_salaries
  FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));
