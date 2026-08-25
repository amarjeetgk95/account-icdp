-- Migration 038: Paybill FY shift to March-February + single-entry guard
--
-- Business rule: salary is paid in the next month, so March salary is booked in April.
-- Therefore the financial year runs March -> February.
--
-- Also enforce a single row per employee/month/FY in earnings and deductions so
-- manual legacy edits and PDF imports never duplicate each other.

-- 1. Remove existing duplicate earning rows per office/hrpn/month/fy, keeping the most recent.
DELETE FROM public.paybill_employee_earnings a
USING public.paybill_employee_earnings b
WHERE a.id < b.id
  AND a.office_id = b.office_id
  AND a.hrpn = b.hrpn
  AND a.month = b.month
  AND a.financial_year = b.financial_year;

-- 2. Enforce single entry per employee/month/FY on earnings.
ALTER TABLE public.paybill_employee_earnings
  ADD CONSTRAINT uniq_paybill_earnings_office_hrpn_month_fy
  UNIQUE (office_id, hrpn, month, financial_year);

-- 3. Remove existing duplicate deduction rows per office/hrpn/month/fy, keeping the most recent.
DELETE FROM public.paybill_employee_deductions a
USING public.paybill_employee_deductions b
WHERE a.id < b.id
  AND a.office_id = b.office_id
  AND a.hrpn = b.hrpn
  AND a.month = b.month
  AND a.financial_year = b.financial_year;

-- 4. Enforce single entry per employee/month/FY on deductions.
ALTER TABLE public.paybill_employee_deductions
  ADD CONSTRAINT uniq_paybill_deductions_office_hrpn_month_fy
  UNIQUE (office_id, hrpn, month, financial_year);

-- 5. Allow manual adjustment import rows.
ALTER TABLE public.paybill_imports
  DROP CONSTRAINT IF EXISTS chk_paybill_imports_sheet_type;
ALTER TABLE public.paybill_imports
  ADD CONSTRAINT chk_paybill_imports_sheet_type
  CHECK (sheet_type IN ('EARNING', 'DEDUCTION', 'COMBINED', 'MANUAL'))
  NOT VALID;
ALTER TABLE public.paybill_imports VALIDATE CONSTRAINT chk_paybill_imports_sheet_type;
