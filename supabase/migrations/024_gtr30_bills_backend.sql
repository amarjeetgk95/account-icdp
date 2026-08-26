-- 024_gtr30_bills_backend.sql
-- GTR-30 Pay Bill register backend.
-- Migration 023 introduces gtr30_employee_master + gtr30_bill_code_mappings.
-- This migration introduces gtr30_bills - the actual bill register per office.
--
-- Bill content is large (~120 numeric columns per employee + employee array + post array + transit array),
-- so we store the full document in JSONB plus a small set of indexed scalar columns
-- (bill_register_no, bill_date, month_of, bill_code, status, gross/deductions/net totals) for filtering.
--
-- Backend functions (RPC):
--   list_gtr30_bills(p_office_id)                              -> JSON (array of bills)
--   get_gtr30_bill(p_office_id, p_bill_id)                     -> JSON (single bill)
--   upsert_gtr30_bill(p_office_id, p_data) -> JSON (bill or {error})
--     - p_data->>'id' present => update, absent => insert
--   delete_gtr30_bill(p_office_id, p_bill_id) -> JSON {deleted: true}

-- =====================================================================
-- 1. GTR-30 Bills
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.gtr30_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  bill_register_no TEXT NOT NULL DEFAULT '',
  bill_date TEXT,
  month_of TEXT,
  bill_code TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'passed')),
  gross_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  deductions_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  net_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (office_id, bill_register_no)
);

CREATE INDEX IF NOT EXISTS idx_gtr30_bills_office ON public.gtr30_bills(office_id);
CREATE INDEX IF NOT EXISTS idx_gtr30_bills_month ON public.gtr30_bills(office_id, month_of);
CREATE INDEX IF NOT EXISTS idx_gtr30_bills_status ON public.gtr30_bills(office_id, status);
CREATE INDEX IF NOT EXISTS idx_gtr30_bills_bill_code ON public.gtr30_bills(office_id, bill_code);

-- =====================================================================
-- 2. Row-Level Security
-- =====================================================================
ALTER TABLE public.gtr30_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view gtr30 bills in their office" ON public.gtr30_bills;
DROP POLICY IF EXISTS "Users can manage gtr30 bills in their office" ON public.gtr30_bills;
DROP POLICY IF EXISTS "Admins can manage all gtr30 bills" ON public.gtr30_bills;

CREATE POLICY "Users can view gtr30 bills in their office"
  ON public.gtr30_bills FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage gtr30 bills in their office"
  ON public.gtr30_bills FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all gtr30 bills"
  ON public.gtr30_bills FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- 3. Backend functions (RPC)
-- =====================================================================
DROP FUNCTION IF EXISTS public.list_gtr30_bills(BIGINT);
DROP FUNCTION IF EXISTS public.get_gtr30_bill(BIGINT, UUID);
DROP FUNCTION IF EXISTS public.upsert_gtr30_bill(BIGINT, JSONB);
DROP FUNCTION IF EXISTS public.delete_gtr30_bill(BIGINT, UUID);

-- 3.1 List all bills for an office
CREATE OR REPLACE FUNCTION public.list_gtr30_bills(p_office_id BIGINT)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'id', id,
    'billRegisterNo', bill_register_no,
    'billDate', bill_date,
    'monthOf', month_of,
    'billCode', bill_code,
    'status', status,
    'grossTotal', gross_total,
    'deductionsTotal', deductions_total,
    'netTotal', net_total,
    'createdDate', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedDate', to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'data', data
  ) ORDER BY updated_at DESC), '[]'::json) INTO v_result
  FROM public.gtr30_bills
  WHERE office_id = p_office_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.2 Get one bill by id
CREATE OR REPLACE FUNCTION public.get_gtr30_bill(
  p_office_id BIGINT,
  p_bill_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  SELECT json_build_object(
    'id', id,
    'billRegisterNo', bill_register_no,
    'billDate', bill_date,
    'monthOf', month_of,
    'billCode', bill_code,
    'status', status,
    'grossTotal', gross_total,
    'deductionsTotal', deductions_total,
    'netTotal', net_total,
    'createdDate', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedDate', to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'data', data
  ) INTO v_result
  FROM public.gtr30_bills
  WHERE office_id = p_office_id AND id = p_bill_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.3 Upsert a single bill (insert or update by data.id)
CREATE OR REPLACE FUNCTION public.upsert_gtr30_bill(
  p_office_id BIGINT,
  p_data JSONB
)
RETURNS JSON AS $$
DECLARE
  v_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_bill_register_no TEXT;
  v_bill_date TEXT;
  v_month_of TEXT;
  v_bill_code TEXT;
  v_status TEXT;
  v_gross NUMERIC(14, 2);
  v_deductions NUMERIC(14, 2);
  v_net NUMERIC(14, 2);
  v_existing_created TIMESTAMPTZ;
  v_result JSON;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  v_id := COALESCE((p_data->>'id')::uuid, gen_random_uuid());
  v_bill_register_no := COALESCE(p_data->>'billRegisterNo', '');
  v_bill_date := COALESCE(p_data->>'billDate', NULL);
  v_month_of := COALESCE(p_data->>'monthOf', NULL);
  v_bill_code := COALESCE(p_data->>'billCode', NULL);
  v_status := COALESCE(p_data->>'status', 'draft');
  v_gross := COALESCE((p_data->>'grossTotal')::numeric, 0);
  v_deductions := COALESCE((p_data->>'deductionsTotal')::numeric, 0);
  v_net := COALESCE((p_data->>'netTotal')::numeric, 0);

  SELECT created_at INTO v_existing_created
  FROM public.gtr30_bills
  WHERE id = v_id AND office_id = p_office_id;

  INSERT INTO public.gtr30_bills (
    id, office_id, bill_register_no, bill_date, month_of, bill_code, status,
    gross_total, deductions_total, net_total, data, created_at, updated_at
  )
  VALUES (
    v_id, p_office_id, v_bill_register_no, v_bill_date, v_month_of, v_bill_code, v_status,
    v_gross, v_deductions, v_net, p_data, COALESCE(v_existing_created, v_now), v_now
  )
  ON CONFLICT (id) DO UPDATE SET
    bill_register_no = EXCLUDED.bill_register_no,
    bill_date = EXCLUDED.bill_date,
    month_of = EXCLUDED.month_of,
    bill_code = EXCLUDED.bill_code,
    status = EXCLUDED.status,
    gross_total = EXCLUDED.gross_total,
    deductions_total = EXCLUDED.deductions_total,
    net_total = EXCLUDED.net_total,
    data = EXCLUDED.data,
    updated_at = EXCLUDED.updated_at;

  SELECT json_build_object(
    'id', id,
    'billRegisterNo', bill_register_no,
    'billDate', bill_date,
    'monthOf', month_of,
    'billCode', bill_code,
    'status', status,
    'grossTotal', gross_total,
    'deductionsTotal', deductions_total,
    'netTotal', net_total,
    'createdDate', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedDate', to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'data', data
  ) INTO v_result
  FROM public.gtr30_bills
  WHERE id = v_id AND office_id = p_office_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.4 Delete one bill
CREATE OR REPLACE FUNCTION public.delete_gtr30_bill(
  p_office_id BIGINT,
  p_bill_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  DELETE FROM public.gtr30_bills
  WHERE office_id = p_office_id AND id = p_bill_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN json_build_object('deleted', v_deleted_count > 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
