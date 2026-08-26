-- 037_form16.sql
-- Form 16 certificate module (Paybill / Employee IT section).
-- One certificate per (office, employee HRPN, financial year).
-- Part A quarterly/book-entry/challan details and Part B line items are stored
-- as JSONB snapshots (same pattern as gtr44_bills.form_data) so historical
-- certificates remain immutable when master data changes later.
-- Idempotent — safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. form16_certificates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.form16_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  employee_id TEXT,
  hrpn TEXT NOT NULL,
  financial_year INTEGER NOT NULL,
  assessment_year INTEGER NOT NULL,
  certificate_number TEXT NOT NULL DEFAULT '',
  certificate_last_updated TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  tax_regime TEXT NOT NULL DEFAULT 'OLD',
  employer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  employee_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  signatory_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  part_a JSONB NOT NULL DEFAULT '{}'::jsonb,
  part_b JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_totals JSONB,
  issued_at TIMESTAMPTZ,
  issued_by UUID REFERENCES public.profiles(id),
  voided_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_form16_certificates_unique
  ON public.form16_certificates (office_id, lower(hrpn), financial_year);

CREATE INDEX IF NOT EXISTS idx_form16_certificates_office_fy
  ON public.form16_certificates (office_id, financial_year);

CREATE INDEX IF NOT EXISTS idx_form16_certificates_status
  ON public.form16_certificates (office_id, status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_form16_status'
      AND conrelid = 'public.form16_certificates'::regclass
  ) THEN
    ALTER TABLE public.form16_certificates
      ADD CONSTRAINT chk_form16_status
      CHECK (status IN ('DRAFT', 'REVIEWED', 'ISSUED', 'VOIDED'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_form16_regime'
      AND conrelid = 'public.form16_certificates'::regclass
  ) THEN
    ALTER TABLE public.form16_certificates
      ADD CONSTRAINT chk_form16_regime
      CHECK (tax_regime IN ('OLD', 'NEW'));
  END IF;
END $$;

ALTER TABLE public.form16_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view form16 certificates in their office" ON public.form16_certificates;
CREATE POLICY "Users can view form16 certificates in their office"
  ON public.form16_certificates FOR SELECT
  USING (public.can_access_office(office_id));

DROP POLICY IF EXISTS "Users can manage form16 certificates in their office" ON public.form16_certificates;
CREATE POLICY "Users can manage form16 certificates in their office"
  ON public.form16_certificates FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

DROP POLICY IF EXISTS "Admins can manage all form16 certificates" ON public.form16_certificates;
CREATE POLICY "Admins can manage all form16 certificates"
  ON public.form16_certificates FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. form16_audit_log — immutable lifecycle events per certificate
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.form16_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES public.form16_certificates(id) ON DELETE CASCADE,
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('CREATED','UPDATED','REVIEWED','ISSUED','REISSUED','VOIDED','EXPORTED','OVERRIDE')),
  actor_id UUID REFERENCES public.profiles(id),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form16_audit_certificate
  ON public.form16_audit_log (certificate_id);
CREATE INDEX IF NOT EXISTS idx_form16_audit_office
  ON public.form16_audit_log (office_id);

ALTER TABLE public.form16_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view form16 audit in their office" ON public.form16_audit_log;
CREATE POLICY "Users can view form16 audit in their office"
  ON public.form16_audit_log FOR SELECT
  USING (public.can_access_office(office_id));

DROP POLICY IF EXISTS "Users can manage form16 audit in their office" ON public.form16_audit_log;
CREATE POLICY "Users can manage form16 audit in their office"
  ON public.form16_audit_log FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

DROP POLICY IF EXISTS "Admins can manage all form16 audit" ON public.form16_audit_log;
CREATE POLICY "Admins can manage all form16 audit"
  ON public.form16_audit_log FOR ALL
  USING (public.is_admin());

COMMIT;
