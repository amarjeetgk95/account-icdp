-- ============================================================================
-- 064_party_tds_ddo_and_dates.sql
-- Add DDO Bill Number, Vendor Invoice Date, and Settlement Date
-- to public.party_transactions for complete standalone office audit & tax compliance.
-- ============================================================================

BEGIN;

-- 1. Add columns to party_transactions
ALTER TABLE public.party_transactions
  ADD COLUMN IF NOT EXISTS ddo_bill_no TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS settlement_date DATE;

-- 2. Backfill existing rows: use transaction_date for invoice_date & settlement_date if not set
UPDATE public.party_transactions
SET
  invoice_date = COALESCE(invoice_date, transaction_date),
  settlement_date = COALESCE(settlement_date, transaction_date)
WHERE invoice_date IS NULL OR settlement_date IS NULL;

-- 3. Set default for new rows
ALTER TABLE public.party_transactions
  ALTER COLUMN invoice_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN settlement_date SET DEFAULT CURRENT_DATE;

-- 4. Create indexes for settlement_date queries (quarterly/FY scans) and DDO bill lookups
CREATE INDEX IF NOT EXISTS idx_tx_settlement_date ON public.party_transactions (settlement_date);
CREATE INDEX IF NOT EXISTS idx_tx_party_settlement ON public.party_transactions (party_id, settlement_date);
CREATE INDEX IF NOT EXISTS idx_tx_ddo_bill ON public.party_transactions (ddo_bill_no) WHERE ddo_bill_no IS NOT NULL;

-- 5. Trigger to keep transaction_date in sync with settlement_date for backward compatibility
CREATE OR REPLACE FUNCTION public.sync_tx_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.settlement_date IS NOT NULL THEN
    NEW.transaction_date := NEW.settlement_date;
  ELSIF NEW.transaction_date IS NOT NULL THEN
    NEW.settlement_date := NEW.transaction_date;
  END IF;

  IF NEW.invoice_date IS NULL THEN
    NEW.invoice_date := COALESCE(NEW.settlement_date, NEW.transaction_date, CURRENT_DATE);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_tx_sync_dates ON public.party_transactions;
CREATE TRIGGER trg_tx_sync_dates
  BEFORE INSERT OR UPDATE OF settlement_date, transaction_date, invoice_date ON public.party_transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_tx_dates();

COMMIT;
