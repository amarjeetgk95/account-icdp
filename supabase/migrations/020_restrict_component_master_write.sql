-- 020_restrict_component_master_write.sql
-- The payroll component master is SHARED application-wide configuration, so any
-- edit (create/update/deactivate/delete) affects the PDF parser for every office.
-- Previously any authenticated user could manage it, letting one office disrupt
-- imports for all others. Restrict write access to admins; regular users keep
-- read-only access so the parser and matching still work for them.

-- -----------------------------------------------------------------------------
-- 1. payroll_components
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Any authenticated user can manage components" ON public.payroll_components;
DROP POLICY IF EXISTS "Admins can manage all components" ON public.payroll_components;
DROP POLICY IF EXISTS "Users can view components" ON public.payroll_components;
DROP POLICY IF EXISTS "Admins can manage components" ON public.payroll_components;

CREATE POLICY "Users can view components"
  ON public.payroll_components FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage components"
  ON public.payroll_components FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 2. payroll_component_aliases
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Any authenticated user can manage component aliases" ON public.payroll_component_aliases;
DROP POLICY IF EXISTS "Admins can manage all component aliases" ON public.payroll_component_aliases;
DROP POLICY IF EXISTS "Users can view component aliases" ON public.payroll_component_aliases;
DROP POLICY IF EXISTS "Admins can manage component aliases" ON public.payroll_component_aliases;

CREATE POLICY "Users can view component aliases"
  ON public.payroll_component_aliases FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage component aliases"
  ON public.payroll_component_aliases FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
