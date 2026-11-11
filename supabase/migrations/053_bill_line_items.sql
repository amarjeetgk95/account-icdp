-- ============================================================================
-- 053_bill_line_items.sql
-- Normalize GTR bill line items into queryable child tables WITHOUT changing
-- any read path.
--
-- Snapshot JSONB (gtr30_bills.data, gtr44_bills.form_data) remains the source
-- of truth. These three tables are a best-effort normalized mirror maintained
-- by repository dual-write (delete WHERE bill_id + batch insert per save):
--   - gtr30_bill_lines    : one row per employee on a GTR-30 pay bill
--   - gtr44_bill_lines    : one row per expenditure item on a GTR-44 bill
--   - gtr44_sub_vouchers  : one row per party/sub-voucher entry on a GTR-44 bill
--
-- What this migration does (all additive + idempotent):
--   1. CREATE TABLE IF NOT EXISTS x3 (FK -> parent id ON DELETE CASCADE).
--   2. CREATE INDEX IF NOT EXISTS on each bill_id.
--   3. Enable RLS + single-office policy (auth.uid() IS NOT NULL), 043 style.
--   4. Best-effort backfill from existing JSONB (each in its own DO block so
--      one bad row family only skips itself with a NOTICE, never aborts).
--
-- What it deliberately does NOT do:
--   - No office_id columns anywhere (043 ground truth: only `offices` has one).
--   - No changes to parent tables, RPCs, or read paths.
--
-- Safe to run via `supabase db push`. Re-runnable.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. GTR-30 bill lines (one row per employee on the bill).
--    CHECK (net = gross - deductions) enforces the same invariant the
--    TypeScript calc service computes (earningsTotal - deductionsTotal).
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gtr30_bill_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.gtr30_bills (id) ON DELETE CASCADE,
  hrpn TEXT,
  employee_name TEXT NOT NULL DEFAULT '',
  gross NUMERIC(14, 2) NOT NULL DEFAULT 0,
  deductions NUMERIC(14, 2) NOT NULL DEFAULT 0,
  net NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (net = gross - deductions)
);

CREATE INDEX IF NOT EXISTS idx_gtr30_bill_lines_bill_id
  ON public.gtr30_bill_lines (bill_id);

ALTER TABLE public.gtr30_bill_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gtr30_bill_lines_single_office_all" ON public.gtr30_bill_lines;
CREATE POLICY "gtr30_bill_lines_single_office_all"
  ON public.gtr30_bill_lines FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --------------------------------------------------------------------------
-- 2. GTR-44 bill lines (one row per expenditure item on the bill).
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gtr44_bill_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.gtr44_bills (id) ON DELETE CASCADE,
  item_code TEXT,
  label TEXT NOT NULL DEFAULT '',
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gtr44_bill_lines_bill_id
  ON public.gtr44_bill_lines (bill_id);

ALTER TABLE public.gtr44_bill_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gtr44_bill_lines_single_office_all" ON public.gtr44_bill_lines;
CREATE POLICY "gtr44_bill_lines_single_office_all"
  ON public.gtr44_bill_lines FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- --------------------------------------------------------------------------
-- 3. GTR-44 sub-vouchers (one row per party/sub-voucher entry on the bill).
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gtr44_sub_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.gtr44_bills (id) ON DELETE CASCADE,
  sub_voucher_no TEXT,
  payee_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  edp_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gtr44_sub_vouchers_bill_id
  ON public.gtr44_sub_vouchers (bill_id);

ALTER TABLE public.gtr44_sub_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gtr44_sub_vouchers_single_office_all" ON public.gtr44_sub_vouchers;
CREATE POLICY "gtr44_sub_vouchers_single_office_all"
  ON public.gtr44_sub_vouchers FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;

-- --------------------------------------------------------------------------
-- 4. Best-effort backfills (outside the DDL transaction so a backfill hiccup
--    can never roll back the table creation; each guarded by table existence
--    and wrapped in its own BEGIN/EXCEPTION block with RAISE NOTICE).
--
-- Tolerance choices (deliberate):
--   - Key lookup is tolerant (camelCase + snake_case + bare variants) because
--     live JSONB was written by several client versions over time.
--   - Numeric text is accepted only if it matches a plain decimal regex;
--     anything else (null, '', 'abc', objects) becomes 0 instead of aborting.
--   - GTR-30 gross/deductions are read from the employee JSON only when
--     present (keys 'gross'/'deductions'), else 0; net is ALWAYS recomputed
--     as gross - deductions so the CHECK constraint can never fail. The live
--     TS writer uses earningsTotal/deductionsTotal from gtr30Calc.service, but
--     SQL does not duplicate that ~60-column arithmetic — keep it simple.
--   - GTR-44 sub_voucher_no falls back to srNo so legacy rows without an
--     explicit voucher number still get a traceable line.
--   - WHERE NOT EXISTS (bill already mirrored) makes every backfill
--     re-runnable without duplicating rows.
-- --------------------------------------------------------------------------

-- 4a. GTR-30 lines from gtr30_bills.data -> 'employees'.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gtr30_bills')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gtr30_bill_lines') THEN
    BEGIN
      INSERT INTO public.gtr30_bill_lines (bill_id, hrpn, employee_name, gross, deductions, net)
      SELECT
        b.id,
        NULLIF(BTRIM(COALESCE(e ->> 'hrpnNo', e ->> 'hrpn_no', e ->> 'hrpn', '')), ''),
        COALESCE(e ->> 'name', e ->> 'employeeName', e ->> 'employee_name', ''),
        CASE WHEN BTRIM(COALESCE(e ->> 'gross', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
             THEN BTRIM(e ->> 'gross')::numeric ELSE 0 END,
        CASE WHEN BTRIM(COALESCE(e ->> 'deductions', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
             THEN BTRIM(e ->> 'deductions')::numeric ELSE 0 END,
        (CASE WHEN BTRIM(COALESCE(e ->> 'gross', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
              THEN BTRIM(e ->> 'gross')::numeric ELSE 0 END)
        -
        (CASE WHEN BTRIM(COALESCE(e ->> 'deductions', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
              THEN BTRIM(e ->> 'deductions')::numeric ELSE 0 END)
      FROM public.gtr30_bills AS b,
           LATERAL jsonb_array_elements(COALESCE(b.data -> 'employees', '[]'::jsonb)) AS e
      WHERE NOT EXISTS (
        SELECT 1 FROM public.gtr30_bill_lines AS l WHERE l.bill_id = b.id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[053] gtr30_bill_lines backfill skipped: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '[053] gtr30 backfill skipped: parent or lines table missing';
  END IF;
END $$;

-- 4b. GTR-44 lines from gtr44_bills.form_data -> 'expenditureItems'.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gtr44_bills')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gtr44_bill_lines') THEN
    BEGIN
      INSERT INTO public.gtr44_bill_lines (bill_id, item_code, label, amount)
      SELECT
        b.id,
        NULLIF(BTRIM(COALESCE(e ->> 'code', e ->> 'itemCode', e ->> 'item_code', '')), ''),
        COALESCE(e ->> 'name', e ->> 'label', ''),
        CASE WHEN BTRIM(COALESCE(e ->> 'amount', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
             THEN BTRIM(e ->> 'amount')::numeric ELSE 0 END
      FROM public.gtr44_bills AS b,
           LATERAL jsonb_array_elements(COALESCE(b.form_data -> 'expenditureItems', '[]'::jsonb)) AS e
      WHERE NOT EXISTS (
        SELECT 1 FROM public.gtr44_bill_lines AS l WHERE l.bill_id = b.id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[053] gtr44_bill_lines backfill skipped: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '[053] gtr44 lines backfill skipped: parent or lines table missing';
  END IF;
END $$;

-- 4c. GTR-44 sub-vouchers from gtr44_bills.form_data -> 'partyEntries'.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gtr44_bills')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gtr44_sub_vouchers') THEN
    BEGIN
      INSERT INTO public.gtr44_sub_vouchers
        (bill_id, sub_voucher_no, payee_name, description, amount, edp_code)
      SELECT
        b.id,
        NULLIF(BTRIM(COALESCE(
          e ->> 'subVoucherNo',
          e ->> 'sub_voucher_no',
          CASE WHEN (e ->> 'srNo') IS NOT NULL THEN e ->> 'srNo' ELSE '' END,
          ''
        )), ''),
        COALESCE(e ->> 'partyName', e ->> 'party_name', e ->> 'payeeName', e ->> 'payee_name', ''),
        COALESCE(e ->> 'details', e ->> 'description', ''),
        CASE WHEN BTRIM(COALESCE(e ->> 'amount', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
             THEN BTRIM(e ->> 'amount')::numeric ELSE 0 END,
        NULLIF(BTRIM(COALESCE(e ->> 'edpCode', e ->> 'edp_code', e ->> 'edp', '')), '')
      FROM public.gtr44_bills AS b,
           LATERAL jsonb_array_elements(COALESCE(b.form_data -> 'partyEntries', '[]'::jsonb)) AS e
      WHERE NOT EXISTS (
        SELECT 1 FROM public.gtr44_sub_vouchers AS s WHERE s.bill_id = b.id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[053] gtr44_sub_vouchers backfill skipped: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '[053] gtr44 sub-voucher backfill skipped: parent or lines table missing';
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Verification (run manually after push):
--   SELECT COUNT(*) AS gtr30_bills, (SELECT COUNT(*) FROM public.gtr30_bill_lines) AS gtr30_lines FROM public.gtr30_bills;
--   SELECT COUNT(*) AS gtr44_bills, (SELECT COUNT(*) FROM public.gtr44_bill_lines) AS gtr44_lines FROM public.gtr44_bills;
--   SELECT COUNT(*) FROM public.gtr44_sub_vouchers;
--   -- Orphan check (must return 0 rows):
--   SELECT l.bill_id FROM public.gtr30_bill_lines l LEFT JOIN public.gtr30_bills b ON b.id = l.bill_id WHERE b.id IS NULL LIMIT 1;
--
-- Rollback (destructive — drops the normalized mirror only; JSONB untouched):
--   DROP TABLE IF EXISTS public.gtr44_sub_vouchers;
--   DROP TABLE IF EXISTS public.gtr44_bill_lines;
--   DROP TABLE IF EXISTS public.gtr30_bill_lines;
-- --------------------------------------------------------------------------
