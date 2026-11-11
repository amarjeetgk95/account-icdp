-- 059_three_track_recon.sql
-- Three-track tax reconciliation: split Regular vs DA-Difference vs Pay-Difference.
-- Idempotent — safe to re-run. Backward compatible (all new columns nullable or defaulted).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. paybill_imports: tag every PDF bill at import time
-- ---------------------------------------------------------------------------
ALTER TABLE public.paybill_imports
  ADD COLUMN IF NOT EXISTS bill_type TEXT NOT NULL DEFAULT 'REGULAR',
  ADD COLUMN IF NOT EXISTS paid_month TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_paybill_imports_bill_type'
      AND conrelid = 'public.paybill_imports'::regclass
  ) THEN
    ALTER TABLE public.paybill_imports
      ADD CONSTRAINT chk_paybill_imports_bill_type
      CHECK (bill_type IN ('REGULAR','DA_ARREAR','PAY_ARREAR','SUPPLEMENTARY'))
      NOT VALID;
    ALTER TABLE public.paybill_imports VALIDATE CONSTRAINT chk_paybill_imports_bill_type;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_paybill_imports_bill_type
  ON public.paybill_imports (financial_year, bill_type);

-- ---------------------------------------------------------------------------
-- 2. paybill rows: denormalize bill_type so sums don't need joins
-- ---------------------------------------------------------------------------
ALTER TABLE public.paybill_employee_earnings
  ADD COLUMN IF NOT EXISTS bill_type TEXT NOT NULL DEFAULT 'REGULAR';
ALTER TABLE public.paybill_employee_deductions
  ADD COLUMN IF NOT EXISTS bill_type TEXT NOT NULL DEFAULT 'REGULAR';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_paybill_earnings_bill_type'
      AND conrelid = 'public.paybill_employee_earnings'::regclass
  ) THEN
    ALTER TABLE public.paybill_employee_earnings
      ADD CONSTRAINT chk_paybill_earnings_bill_type
      CHECK (bill_type IN ('REGULAR','DA_ARREAR','PAY_ARREAR','SUPPLEMENTARY'))
      NOT VALID;
    ALTER TABLE public.paybill_employee_earnings VALIDATE CONSTRAINT chk_paybill_earnings_bill_type;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_paybill_deductions_bill_type'
      AND conrelid = 'public.paybill_employee_deductions'::regclass
  ) THEN
    ALTER TABLE public.paybill_employee_deductions
      ADD CONSTRAINT chk_paybill_deductions_bill_type
      CHECK (bill_type IN ('REGULAR','DA_ARREAR','PAY_ARREAR','SUPPLEMENTARY'))
      NOT VALID;
    ALTER TABLE public.paybill_employee_deductions VALIDATE CONSTRAINT chk_paybill_deductions_bill_type;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_paybill_earnings_bill_lookup
  ON public.paybill_employee_earnings (financial_year, month, bill_type);
CREATE INDEX IF NOT EXISTS idx_paybill_deductions_bill_lookup
  ON public.paybill_employee_deductions (financial_year, month, bill_type);

-- Replace single-bill-per-month unique constraints with per-import unique constraints
-- so multiple bills in the same month (e.g. Regular + DA Arrear) can coexist.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'paybill_employee_earnings') THEN
    DELETE FROM public.paybill_employee_earnings
    WHERE ctid NOT IN (
      SELECT min(ctid)
      FROM public.paybill_employee_earnings
      GROUP BY import_id, hrpn
    );

    ALTER TABLE public.paybill_employee_earnings
      DROP CONSTRAINT IF EXISTS paybill_employee_earnings_single_office_key;
    ALTER TABLE public.paybill_employee_earnings
      DROP CONSTRAINT IF EXISTS paybill_employee_earnings_import_hrpn_key;
    ALTER TABLE public.paybill_employee_earnings
      ADD CONSTRAINT paybill_employee_earnings_import_hrpn_key
      UNIQUE (import_id, hrpn);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'paybill_employee_deductions') THEN
    DELETE FROM public.paybill_employee_deductions
    WHERE ctid NOT IN (
      SELECT min(ctid)
      FROM public.paybill_employee_deductions
      GROUP BY import_id, hrpn
    );

    ALTER TABLE public.paybill_employee_deductions
      DROP CONSTRAINT IF EXISTS paybill_employee_deductions_single_office_key;
    ALTER TABLE public.paybill_employee_deductions
      DROP CONSTRAINT IF EXISTS paybill_employee_deductions_import_hrpn_key;
    ALTER TABLE public.paybill_employee_deductions
      ADD CONSTRAINT paybill_employee_deductions_import_hrpn_key
      UNIQUE (import_id, hrpn);
  END IF;
END $$;

-- Backfill bill_type from parent import where present
UPDATE public.paybill_employee_earnings e
SET bill_type = i.bill_type
FROM public.paybill_imports i
WHERE e.import_id = i.id
  AND e.bill_type = 'REGULAR'
  AND i.bill_type IS DISTINCT FROM 'REGULAR';

UPDATE public.paybill_employee_deductions d
SET bill_type = i.bill_type
FROM public.paybill_imports i
WHERE d.import_id = i.id
  AND d.bill_type = 'REGULAR'
  AND i.bill_type IS DISTINCT FROM 'REGULAR';

-- ---------------------------------------------------------------------------
-- 3. employee_salaries: split arrears out of the total
-- gross/da/tax stay as TOTALS (backward compat).
-- regular = (gross + da) - pay_diff - da_diff ; regular_tax = tax - arrears_tax
-- ---------------------------------------------------------------------------
ALTER TABLE public.employee_salaries
  ADD COLUMN IF NOT EXISTS pay_diff NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS da_diff NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arrears_tax NUMERIC(14,2) NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 4. Constrain manual adjustments to the two arrears labels (036 table reused)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_paybill_manual_adj_arrears_label'
      AND conrelid = 'public.paybill_manual_adjustments'::regclass
  ) THEN
    ALTER TABLE public.paybill_manual_adjustments
      ADD CONSTRAINT chk_paybill_manual_adj_arrears_label
      CHECK (param_key IN ('PAY_DIFFERENCE','DA_DIFFERENCE','Pay Difference','DA Difference')
             OR group_type = 'DEDUCTION')
      NOT VALID;
    ALTER TABLE public.paybill_manual_adjustments VALIDATE CONSTRAINT chk_paybill_manual_adj_arrears_label;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'paybill_manual_adjustments') THEN
    DELETE FROM public.paybill_manual_adjustments
    WHERE ctid NOT IN (
      SELECT min(ctid)
      FROM public.paybill_manual_adjustments
      GROUP BY hrpn, param_key, month, financial_year
    );

    ALTER TABLE public.paybill_manual_adjustments
      DROP CONSTRAINT IF EXISTS paybill_manual_adj_unique_entry;
    ALTER TABLE public.paybill_manual_adjustments
      ADD CONSTRAINT paybill_manual_adj_unique_entry
      UNIQUE (hrpn, param_key, month, financial_year);

    ALTER TABLE public.paybill_manual_adjustments
      ALTER COLUMN param_label DROP NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Sync audit log: who overwrote payroll with paybill, when, old vs new
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tax_recon_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_year INTEGER NOT NULL,
  quarter TEXT NOT NULL,
  month TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  hrpn TEXT NOT NULL,
  old_gross NUMERIC(14,2),
  old_da NUMERIC(14,2),
  old_tax NUMERIC(14,2),
  new_gross NUMERIC(14,2),
  new_da NUMERIC(14,2),
  new_tax NUMERIC(14,2),
  new_pay_diff NUMERIC(14,2) NOT NULL DEFAULT 0,
  new_da_diff NUMERIC(14,2) NOT NULL DEFAULT 0,
  actor_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_recon_sync_log_lookup
  ON public.tax_recon_sync_log (financial_year, quarter, hrpn);

ALTER TABLE public.tax_recon_sync_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['tax_recon_sync_log']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_authenticated_all" ON public.%I', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='allow_authenticated_all'
    ) THEN
      EXECUTE format('CREATE POLICY "allow_authenticated_all" ON public.%I FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)', t);
    END IF;
  END LOOP;
END $$;

COMMIT;
