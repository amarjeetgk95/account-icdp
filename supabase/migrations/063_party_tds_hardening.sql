-- ============================================================================
-- 063_party_tds_hardening.sql
-- Party TDS data-integrity hardening (single-office).
--
-- Fixes:
--  P0-1 duplicate (party_id, bill_no) enforced only in JS (race-prone)
--  P0-2 partial GST edit zeroes missing legs (DB backstop via trigger)
--  P1   unbounded FY queries (indexes for date-bounded scans)
--  Dead RPC get_party_tds_summary still references dropped office_id
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 0. Backfill total_gst where drifted (client used to trust JS sum)
-- --------------------------------------------------------------------------
UPDATE public.party_transactions
SET total_gst = COALESCE(cgst, 0) + COALESCE(sgst, 0) + COALESCE(igst, 0)
WHERE total_gst IS DISTINCT FROM (COALESCE(cgst, 0) + COALESCE(sgst, 0) + COALESCE(igst, 0));

-- --------------------------------------------------------------------------
-- 1. Dedupe parties case-insensitively, repoint transactions first.
--    Keep earliest created row per UPPER(TRIM(name)).
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='parties')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='party_transactions') THEN
    -- Repoint transactions from duplicate parties to keeper
    WITH ranked AS (
      SELECT id, UPPER(TRIM(name)) AS k,
        ROW_NUMBER() OVER (PARTITION BY UPPER(TRIM(name)) ORDER BY created_at, id) AS rn
      FROM public.parties
    ),
    dup_map AS (
      SELECT r.id AS dup_id, first.id AS keep_id
      FROM ranked r
      JOIN (SELECT k, id FROM ranked WHERE rn = 1) first USING (k)
      WHERE r.rn > 1
    )
    UPDATE public.party_transactions t SET party_id = m.keep_id
    FROM dup_map m WHERE t.party_id = m.dup_id;

    -- Delete duplicate party rows
    DELETE FROM public.parties p USING (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY UPPER(TRIM(name)) ORDER BY created_at, id) AS rn
      FROM public.parties
    ) d WHERE p.id = d.id AND d.rn > 1;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 2. Dedupe transactions on (party_id, bill_no case-insensitive, trimmed).
--    Keep earliest created row.
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='party_transactions') THEN
    DELETE FROM public.party_transactions a USING public.party_transactions b
    WHERE a.ctid > b.ctid
      AND a.party_id = b.party_id
      AND LOWER(TRIM(a.bill_no)) = LOWER(TRIM(b.bill_no));
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 3. Constraints + indexes
-- --------------------------------------------------------------------------
-- Unique party name (case-insensitive, trimmed)
CREATE UNIQUE INDEX IF NOT EXISTS uq_parties_name_ci
  ON public.parties (UPPER(TRIM(name)));

-- Unique transaction per party+ bill (case-insensitive, trimmed)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tx_party_bill_ci
  ON public.party_transactions (party_id, LOWER(TRIM(bill_no)));

-- Date index for FY-bounded scans (reports/dashboard used unbounded .gte only)
CREATE INDEX IF NOT EXISTS idx_tx_date ON public.party_transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_tx_party_date ON public.party_transactions (party_id, transaction_date);

-- Format checks (match frontend regexes so valid data never blocked)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_parties_gst_fmt') THEN
    ALTER TABLE public.parties ADD CONSTRAINT chk_parties_gst_fmt
      CHECK (gst_no IS NULL OR gst_no = '' OR gst_no ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_parties_pan_fmt') THEN
    ALTER TABLE public.parties ADD CONSTRAINT chk_parties_pan_fmt
      CHECK (pan_no IS NULL OR pan_no = '' OR pan_no ~ '^[A-Z]{5}[0-9]{4}[A-Z]$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tx_amount_pos') THEN
    ALTER TABLE public.party_transactions ADD CONSTRAINT chk_tx_amount_pos CHECK (amount > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tx_taxes_nn') THEN
    ALTER TABLE public.party_transactions ADD CONSTRAINT chk_tx_taxes_nn
      CHECK (cgst >= 0 AND sgst >= 0 AND igst >= 0 AND income_tax >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tx_total_gst') THEN
    ALTER TABLE public.party_transactions ADD CONSTRAINT chk_tx_total_gst
      CHECK (total_gst = cgst + sgst + igst);
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 4. Server computes total_gst so partial edits can't drift it.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_tx_total_gst()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_gst := COALESCE(NEW.cgst, 0) + COALESCE(NEW.sgst, 0) + COALESCE(NEW.igst, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_tx_total_gst ON public.party_transactions;
CREATE TRIGGER trg_tx_total_gst
  BEFORE INSERT OR UPDATE OF cgst, sgst, igst ON public.party_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_tx_total_gst();

-- --------------------------------------------------------------------------
-- 5. Dead RPC: get_party_tds_summary still references dropped office_id
--    (dropped in 043). It was never called from the app. Drop all overloads.
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_party_tds_summary(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_party_tds_summary(UUID, INT);
DROP FUNCTION IF EXISTS public.get_party_tds_summary(INTEGER);
DROP FUNCTION IF EXISTS public.get_party_tds_summary(INT);

COMMIT;
