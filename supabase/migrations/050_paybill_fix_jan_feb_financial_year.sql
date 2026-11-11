-- ============================================================================
-- 050_paybill_fix_jan_feb_financial_year.sql
-- Repair paybill rows stored under the calendar year instead of the FY
-- start year for January/February bills.
--
-- The app's parseMonthAndFy() used to store e.g. "January-2026" as
-- (month='January', financial_year=2026), while the app convention books
-- expenditure in the PAYMENT month (the month after the bill's work month)
-- on the April-March FY calendar: January-2026 work, paid February-2026,
-- belongs to FY 2025. Those rows were invisible in the correct FY view
-- (matrix, yearly reports, Q4 groupings).
--
-- March bills need NO repair: "March-2026" work, paid April-2026, correctly
-- belongs to FY 2026 (first month of the FY).
--
-- The guard `financial_year = EXTRACT(YEAR FROM created_at)` only repairs
-- rows imported in the same calendar year as the (mislabelled) FY, i.e.
-- rows written by the buggy code path. Correctly labelled rows from other
-- years are left untouched. Safe to run once via `supabase db push`.
-- ============================================================================

BEGIN;

UPDATE public.paybill_employee_earnings
SET financial_year = financial_year - 1
WHERE month IN ('January', 'February')
  AND financial_year = EXTRACT(YEAR FROM created_at)::integer;

UPDATE public.paybill_employee_deductions
SET financial_year = financial_year - 1
WHERE month IN ('January', 'February')
  AND financial_year = EXTRACT(YEAR FROM created_at)::integer;

UPDATE public.paybill_imports
SET financial_year = financial_year - 1
WHERE month IN ('January', 'February')
  AND financial_year = EXTRACT(YEAR FROM created_at)::integer;

COMMIT;
