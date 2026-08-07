-- ICDP Tax System - Row Level Security Policies
-- Created: 2026-08-07

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Helper function to get current office ID
CREATE OR REPLACE FUNCTION public.current_office_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT office_id FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin' FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check office access
CREATE OR REPLACE FUNCTION public.can_access_office(target_office_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin' OR office_id = target_office_id
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Offices policies
CREATE POLICY "Authenticated users can view offices"
  ON public.offices FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage offices"
  ON public.offices FOR ALL
  USING (public.is_admin());

-- Office details policies
CREATE POLICY "Users can view office details for accessible offices"
  ON public.office_details FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all office details"
  ON public.office_details FOR ALL
  USING (public.is_admin());

-- Employees policies
CREATE POLICY "Users can view employees in their office"
  ON public.employees FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all employees"
  ON public.employees FOR ALL
  USING (public.is_admin());

-- Employee salaries policies
CREATE POLICY "Users can view salaries in their office"
  ON public.employee_salaries FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all salaries"
  ON public.employee_salaries FOR ALL
  USING (public.is_admin());

-- Parties policies
CREATE POLICY "Users can view parties in their office"
  ON public.parties FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all parties"
  ON public.parties FOR ALL
  USING (public.is_admin());

-- Party transactions policies
CREATE POLICY "Users can view transactions in their office"
  ON public.party_transactions FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all transactions"
  ON public.party_transactions FOR ALL
  USING (public.is_admin());

-- App config policies
CREATE POLICY "Users can view config in their office"
  ON public.app_config FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all config"
  ON public.app_config FOR ALL
  USING (public.is_admin());
