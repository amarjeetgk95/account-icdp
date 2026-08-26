-- 016_paybill_vouchers_settings_and_refinements.sql
-- Refinements: real ledger voucher posting, office-level settings, sheet-type tracking,
-- missing allowance columns, duplicate-import protection support.

-- 1. Track EARNING / DEDUCTION side on imports (enables duplicate bill+month+side guard)
ALTER TABLE public.paybill_imports ADD COLUMN IF NOT EXISTS sheet_type TEXT DEFAULT 'EARNING';

-- 2. Persist Special Pay & Washing Allowance that the app already reads/extracts
ALTER TABLE public.paybill_employee_earnings ADD COLUMN IF NOT EXISTS special_pay NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.paybill_employee_earnings ADD COLUMN IF NOT EXISTS washing_allowance NUMERIC(12,2) DEFAULT 0;

-- 3. Salary expenditure voucher posting (real accounting ledger entry)
CREATE TABLE IF NOT EXISTS public.paybill_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  voucher_no TEXT NOT NULL UNIQUE,
  bill_no TEXT NOT NULL,
  month TEXT NOT NULL,
  financial_year INTEGER NOT NULL,
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  major_head TEXT,
  gross_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  basic_pay_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  da_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  hra_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  cla_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  med_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  trans_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  special_pay_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  washing_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  npp_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  gpf_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  nps_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  income_tax_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  pt_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  gis_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED', 'REVERSED')),
  posted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_paybill_vouchers_office_month
  ON public.paybill_vouchers(office_id, month, financial_year);
CREATE INDEX IF NOT EXISTS idx_paybill_vouchers_office
  ON public.paybill_vouchers(office_id);

ALTER TABLE public.paybill_vouchers ENABLE ROW LEVEL SECURITY;

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

-- 4. Office-level settings: DA rates per FY, bill metadata defaults, audit tolerances
CREATE TABLE IF NOT EXISTS public.paybill_settings (
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  settings_key TEXT NOT NULL,
  settings_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id),
  PRIMARY KEY (office_id, settings_key)
);

ALTER TABLE public.paybill_settings ENABLE ROW LEVEL SECURITY;

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
