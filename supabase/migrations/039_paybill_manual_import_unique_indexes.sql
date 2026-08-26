-- Migration 039: Allow multiple months under single imports and drop obsolete (import_id, hrpn) unique index
--
-- The true uniqueness for payroll entries across both earnings and deductions
-- is (office_id, hrpn, month, financial_year), established in Migration 038.
-- The obsolete indexes idx_paybill_deductions_import_hrpn and idx_paybill_earnings_import_hrpn
-- incorrectly blocked employees from having multiple months under manual adjustments.

DROP INDEX IF EXISTS public.idx_paybill_deductions_import_hrpn;
DROP INDEX IF EXISTS public.idx_paybill_earnings_import_hrpn;

-- Recreate as non-unique lookup indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_paybill_deductions_import_hrpn
  ON public.paybill_employee_deductions(import_id, hrpn);

CREATE INDEX IF NOT EXISTS idx_paybill_earnings_import_hrpn
  ON public.paybill_employee_earnings(import_id, hrpn);
