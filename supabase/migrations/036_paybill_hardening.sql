-- 036_paybill_hardening.sql
-- PayBill module hardening: duplicate prevention, period normalization,
-- auditable manual adjustments, and import lifecycle tracking.
-- Idempotent — safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. paybill_imports: lifecycle + file identity + duplicate guard
-- ---------------------------------------------------------------------------
ALTER TABLE public.paybill_imports
  ADD COLUMN IF NOT EXISTS file_hash TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'IMPORTED',
  ADD COLUMN IF NOT EXISTS source_file_name TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES public.paybill_vouchers(id) ON DELETE SET NULL;

-- Ensure sheet_type is always normalized
ALTER TABLE public.paybill_imports
  ADD CONSTRAINT chk_paybill_imports_sheet_type
  CHECK (sheet_type IN ('EARNING', 'DEDUCTION', 'COMBINED', 'MANUAL'))
  NOT VALID;
ALTER TABLE public.paybill_imports VALIDATE CONSTRAINT chk_paybill_imports_sheet_type;

ALTER TABLE public.paybill_imports
  ADD CONSTRAINT chk_paybill_imports_status
  CHECK (status IN ('IMPORTED', 'REVIEWED', 'APPROVED', 'POSTED', 'REVERSED'))
  NOT VALID;
ALTER TABLE public.paybill_imports VALIDATE CONSTRAINT chk_paybill_imports_status;

-- Normalize month values: allow only canonical English month names
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_paybill_imports_month'
      AND conrelid = 'public.paybill_imports'::regclass
  ) THEN
    ALTER TABLE public.paybill_imports
      ADD CONSTRAINT chk_paybill_imports_month
      CHECK (month IN ('January','February','March','April','May','June','July','August','September','October','November','December'))
      NOT VALID;
    ALTER TABLE public.paybill_imports VALIDATE CONSTRAINT chk_paybill_imports_month;
  END IF;
END $$;

-- Duplicate prevention: same office cannot import same bill_no + month + FY + sheet side twice.
-- Uses lower() to make bill_no/month case-insensitive and to handle legacy mixed-case data.
CREATE UNIQUE INDEX IF NOT EXISTS idx_paybill_imports_unique_bill
  ON public.paybill_imports (office_id, financial_year, lower(bill_no), lower(month), sheet_type);

CREATE INDEX IF NOT EXISTS idx_paybill_imports_file_hash
  ON public.paybill_imports (office_id, file_hash) WHERE file_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_paybill_imports_status
  ON public.paybill_imports (office_id, status);

-- ---------------------------------------------------------------------------
-- 2. paybill_employee_earnings / deductions: enforce validation lifecycle
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_paybill_earnings_validation_status'
      AND conrelid = 'public.paybill_employee_earnings'::regclass
  ) THEN
    ALTER TABLE public.paybill_employee_earnings
      ADD CONSTRAINT chk_paybill_earnings_validation_status
      CHECK (validation_status IS NULL OR validation_status IN ('VALID','WARNING','ERROR'))
      NOT VALID;
    ALTER TABLE public.paybill_employee_earnings VALIDATE CONSTRAINT chk_paybill_earnings_validation_status;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_paybill_deductions_validation_status'
      AND conrelid = 'public.paybill_employee_deductions'::regclass
  ) THEN
    ALTER TABLE public.paybill_employee_deductions
      ADD CONSTRAINT chk_paybill_deductions_validation_status
      CHECK (validation_status IS NULL OR validation_status IN ('VALID','WARNING','ERROR'))
      NOT VALID;
    ALTER TABLE public.paybill_employee_deductions VALIDATE CONSTRAINT chk_paybill_deductions_validation_status;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Auditable manual ledger adjustments (replaces opaque paybill_settings manual_values)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paybill_manual_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  hrpn TEXT NOT NULL,
  param_key TEXT NOT NULL,
  param_label TEXT NOT NULL,
  month TEXT NOT NULL CHECK (month IN ('January','February','March','April','May','June','July','August','September','October','November','December')),
  financial_year INTEGER NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  group_type TEXT NOT NULL DEFAULT 'EARNING' CHECK (group_type IN ('EARNING','DEDUCTION')),
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (office_id, hrpn, param_key, month, financial_year)
);

CREATE INDEX IF NOT EXISTS idx_paybill_manual_adj_office_hrpn
  ON public.paybill_manual_adjustments (office_id, hrpn);
CREATE INDEX IF NOT EXISTS idx_paybill_manual_adj_lookup
  ON public.paybill_manual_adjustments (office_id, financial_year, month);

ALTER TABLE public.paybill_manual_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view manual adjustments in their office" ON public.paybill_manual_adjustments;
CREATE POLICY "Users can view manual adjustments in their office"
  ON public.paybill_manual_adjustments FOR SELECT
  USING (public.can_access_office(office_id));

DROP POLICY IF EXISTS "Users can manage manual adjustments in their office" ON public.paybill_manual_adjustments;
CREATE POLICY "Users can manage manual adjustments in their office"
  ON public.paybill_manual_adjustments FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

DROP POLICY IF EXISTS "Admins can manage all manual adjustments" ON public.paybill_manual_adjustments;
CREATE POLICY "Admins can manage all manual adjustments"
  ON public.paybill_manual_adjustments FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Import audit trail (immutable per-import events)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paybill_import_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.paybill_imports(id) ON DELETE CASCADE,
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('CREATED','VALIDATED','REVIEWED','APPROVED','POSTED','REVERSED','DELETED','MANUAL_ADJUSTMENT')),
  actor_id UUID REFERENCES public.profiles(id),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paybill_import_audits_import
  ON public.paybill_import_audits (import_id);
CREATE INDEX IF NOT EXISTS idx_paybill_import_audits_office
  ON public.paybill_import_audits (office_id);

ALTER TABLE public.paybill_import_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view import audits in their office" ON public.paybill_import_audits;
CREATE POLICY "Users can view import audits in their office"
  ON public.paybill_import_audits FOR SELECT
  USING (public.can_access_office(office_id));

DROP POLICY IF EXISTS "Users can manage import audits in their office" ON public.paybill_import_audits;
CREATE POLICY "Users can manage import audits in their office"
  ON public.paybill_import_audits FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

DROP POLICY IF EXISTS "Admins can manage all import audits" ON public.paybill_import_audits;
CREATE POLICY "Admins can manage all import audits"
  ON public.paybill_import_audits FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. Helper: log an audit event (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_paybill_import_audit(
  p_import_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_office_id BIGINT;
  v_id UUID;
BEGIN
  SELECT office_id INTO v_office_id FROM public.paybill_imports WHERE id = p_import_id;
  IF v_office_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT public.can_access_office(v_office_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Office access required for paybill audit' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.paybill_import_audits (import_id, office_id, action, actor_id, details)
  VALUES (p_import_id, v_office_id, p_action, auth.uid(), COALESCE(p_details, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.log_paybill_import_audit(UUID, TEXT, JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Backfill: existing imports get status IMPORTED if null/empty
-- ---------------------------------------------------------------------------
UPDATE public.paybill_imports
SET status = 'IMPORTED'
WHERE status IS NULL OR status = '';

COMMIT;
