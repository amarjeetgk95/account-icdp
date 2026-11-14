-- 017_paybill_validation_flags.sql
-- Creates the missing paybill_employee_deductions table (the app has always written to it,
-- but no earlier migration created it) and adds per-record validation columns to both
-- earnings and deductions tables for the HRPN-centric validation layer.

-- 1. paybill_employee_deductions (created here so the chain is self-sufficient)
CREATE TABLE IF NOT EXISTS public.paybill_employee_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.paybill_imports(id) ON DELETE CASCADE,
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  employee_id TEXT,
  hrpn TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  designation TEXT,
  month TEXT NOT NULL,
  financial_year INTEGER NOT NULL,
  income_tax NUMERIC(12,2) DEFAULT 0,
  prof_tax NUMERIC(12,2) DEFAULT 0,
  hba_interest NUMERIC(12,2) DEFAULT 0,
  gpf_regular NUMERIC(12,2) DEFAULT 0,
  gpf_class4 NUMERIC(12,2) DEFAULT 0,
  nps_regular NUMERIC(12,2) DEFAULT 0,
  gis_govt_fund NUMERIC(12,2) DEFAULT 0,
  gis_govt_saving NUMERIC(12,2) DEFAULT 0,
  other_deductions NUMERIC(12,2) DEFAULT 0,
  total_deductions NUMERIC(12,2) DEFAULT 0,
  net_pay NUMERIC(12,2) DEFAULT 0,
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('MATCHED', 'NOT_FOUND', 'DUPLICATE', 'INVALID_HRPN')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paybill_deductions_office ON public.paybill_employee_deductions(office_id);
CREATE INDEX IF NOT EXISTS idx_paybill_deductions_hrpn ON public.paybill_employee_deductions(hrpn);
CREATE INDEX IF NOT EXISTS idx_paybill_deductions_lookup ON public.paybill_employee_deductions(office_id, financial_year, month);
CREATE UNIQUE INDEX IF NOT EXISTS idx_paybill_deductions_import_hrpn
  ON public.paybill_employee_deductions(import_id, hrpn);

ALTER TABLE public.paybill_employee_deductions ENABLE ROW LEVEL SECURITY;

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

-- 2. Validation columns on earnings
ALTER TABLE public.paybill_employee_earnings
  ADD COLUMN IF NOT EXISTS validation_status TEXT,
  ADD COLUMN IF NOT EXISTS mapping_message TEXT,
  ADD COLUMN IF NOT EXISTS name_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_flags JSONB;

-- 3. Validation columns on deductions
ALTER TABLE public.paybill_employee_deductions
  ADD COLUMN IF NOT EXISTS validation_status TEXT,
  ADD COLUMN IF NOT EXISTS mapping_message TEXT,
  ADD COLUMN IF NOT EXISTS name_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_flags JSONB;

CREATE INDEX IF NOT EXISTS idx_paybill_earnings_validation_status
  ON public.paybill_employee_earnings (validation_status);
CREATE INDEX IF NOT EXISTS idx_paybill_deductions_validation_status
  ON public.paybill_employee_deductions (validation_status);