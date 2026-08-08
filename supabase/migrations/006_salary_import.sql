-- 006_salary_import.sql
-- Salary import from monthly salary Excel files (e.g. pension office payout lists).
-- Employees are matched by HRPN No. (hprn_no column added in 005).
-- Column B = HRPN No.; subsequent columns are "mmm-yy (Paid in mmm-yy) GROSS / INCOME TAX" pairs.

-- A single Excel import run (one file = one import record for a given financial year).
CREATE TABLE IF NOT EXISTS public.salary_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  excel_filename TEXT NOT NULL,
  financial_year INTEGER NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One row per (HRPN, month, financial year) holding the Gross + Income Tax pair.
CREATE TABLE IF NOT EXISTS public.employee_salary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salary_import_id UUID NOT NULL REFERENCES public.salary_imports(id) ON DELETE CASCADE,
  employee_id TEXT,
  hprn_no TEXT NOT NULL,
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  name TEXT,
  month TEXT NOT NULL,
  financial_year INTEGER NOT NULL,
  gross_salary NUMERIC(12,2) DEFAULT 0,
  income_tax NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('matched', 'unmatched', 'duplicate', 'not_detected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_imports_office ON public.salary_imports(office_id);
CREATE INDEX IF NOT EXISTS idx_salary_imports_fy ON public.salary_imports(office_id, financial_year);
CREATE INDEX IF NOT EXISTS idx_emp_salary_office ON public.employee_salary(office_id);
CREATE INDEX IF NOT EXISTS idx_emp_salary_hrpn ON public.employee_salary(hprn_no);
CREATE INDEX IF NOT EXISTS idx_emp_salary_lookup ON public.employee_salary(hprn_no, month, financial_year);
CREATE UNIQUE INDEX IF NOT EXISTS emp_salary_per_import_hrpn_month
  ON public.employee_salary(salary_import_id, hprn_no, month);

-- Row Level Security (mirrors the convention used by employees / employee_salaries)
ALTER TABLE public.salary_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salary ENABLE ROW LEVEL SECURITY;

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
