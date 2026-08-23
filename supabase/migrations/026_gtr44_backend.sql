-- 026_gtr44_backend.sql
-- GTR-44 Detailed Contingent Bill backend.
-- Mirrors supabase/migrations/024_gtr30_bills_backend.sql pattern.
--
-- Table:
--   gtr44_bills - bill register per office (JSONB form_data + indexed scalars)
--
-- Settings:
--   Reuse paybill_settings with settings_key = 'gtr44_defaults' for gtr44_settings (+ budget_heads, expenditureItems, etc.)
--   No separate gtr44_settings table required; kept consistent with GTR-30 paybill_settings usage.
--
-- Backend functions (RPC):
--   list_gtr44_bills(p_office_id)                      -> JSON (array of bills)
--   get_gtr44_bill(p_office_id, p_bill_id)             -> JSON (single bill)
--   upsert_gtr44_bill(p_office_id, p_data)             -> JSON (bill or {error})
--   delete_gtr44_bill(p_office_id, p_bill_id)          -> JSON {deleted: true}

-- =====================================================================
-- 1. GTR-44 Bills
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.gtr44_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  bill_no TEXT NOT NULL DEFAULT '',
  fy INTEGER,
  month TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'passed', 'objected', 'ac_adjusted')),
  gross_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  form_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  UNIQUE (office_id, bill_no)
);

CREATE INDEX IF NOT EXISTS idx_gtr44_bills_office ON public.gtr44_bills(office_id);
CREATE INDEX IF NOT EXISTS idx_gtr44_bills_fy ON public.gtr44_bills(office_id, fy);
CREATE INDEX IF NOT EXISTS idx_gtr44_bills_bill_no ON public.gtr44_bills(office_id, bill_no);
CREATE INDEX IF NOT EXISTS idx_gtr44_bills_month ON public.gtr44_bills(office_id, month);
CREATE INDEX IF NOT EXISTS idx_gtr44_bills_status ON public.gtr44_bills(office_id, status);

-- =====================================================================
-- 2. Row-Level Security
-- =====================================================================
ALTER TABLE public.gtr44_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view gtr44 bills in their office" ON public.gtr44_bills;
DROP POLICY IF EXISTS "Users can manage gtr44 bills in their office" ON public.gtr44_bills;
DROP POLICY IF EXISTS "Admins can manage all gtr44 bills" ON public.gtr44_bills;

CREATE POLICY "Users can view gtr44 bills in their office"
  ON public.gtr44_bills FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage gtr44 bills in their office"
  ON public.gtr44_bills FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all gtr44 bills"
  ON public.gtr44_bills FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- 3. Backend functions (RPC)
-- =====================================================================
DROP FUNCTION IF EXISTS public.list_gtr44_bills(BIGINT);
DROP FUNCTION IF EXISTS public.get_gtr44_bill(BIGINT, UUID);
DROP FUNCTION IF EXISTS public.upsert_gtr44_bill(BIGINT, JSONB);
DROP FUNCTION IF EXISTS public.delete_gtr44_bill(BIGINT, UUID);
DROP FUNCTION IF EXISTS public.list_gtr44_bills(UUID);
DROP FUNCTION IF EXISTS public.get_gtr44_bill(UUID, UUID);
DROP FUNCTION IF EXISTS public.upsert_gtr44_bill(UUID, JSONB);
DROP FUNCTION IF EXISTS public.delete_gtr44_bill(UUID, UUID);

-- 3.1 List all bills for an office
CREATE OR REPLACE FUNCTION public.list_gtr44_bills(p_office_id BIGINT)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'id', id,
    'billNo', bill_no,
    'fy', fy,
    'month', month,
    'status', status,
    'grossAmount', gross_amount,
    'netAmount', net_amount,
    'createdDate', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedDate', to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'createdBy', created_by,
    'formData', form_data
  ) ORDER BY updated_at DESC), '[]'::json) INTO v_result
  FROM public.gtr44_bills
  WHERE office_id = p_office_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.2 Get one bill by id
CREATE OR REPLACE FUNCTION public.get_gtr44_bill(
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
    'billNo', bill_no,
    'fy', fy,
    'month', month,
    'status', status,
    'grossAmount', gross_amount,
    'netAmount', net_amount,
    'createdDate', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedDate', to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'createdBy', created_by,
    'formData', form_data
  ) INTO v_result
  FROM public.gtr44_bills
  WHERE office_id = p_office_id AND id = p_bill_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.3 Upsert a single bill (insert or update by data.id)
CREATE OR REPLACE FUNCTION public.upsert_gtr44_bill(
  p_office_id BIGINT,
  p_data JSONB
)
RETURNS JSON AS $$
DECLARE
  v_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_bill_no TEXT;
  v_fy INTEGER;
  v_month TEXT;
  v_status TEXT;
  v_gross NUMERIC(14, 2);
  v_net NUMERIC(14, 2);
  v_form_data JSONB;
  v_created_by UUID;
  v_existing_created TIMESTAMPTZ;
  v_result JSON;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  v_id := COALESCE((p_data->>'id')::uuid, gen_random_uuid());
  v_bill_no := COALESCE(p_data->>'billNo', p_data->'formData'->>'billRegisterNo', '');
  v_fy := COALESCE((p_data->>'fy')::int, (p_data->'formData'->>'budgetGrantYearFrom')::int, NULL);
  v_month := COALESCE(p_data->>'month', p_data->'formData'->>'monthOf', NULL);
  v_status := COALESCE(p_data->>'status', 'draft');
  v_gross := COALESCE((p_data->>'grossAmount')::numeric, (p_data->>'gross_amount')::numeric, 0);
  v_net := COALESCE((p_data->>'netAmount')::numeric, (p_data->>'net_amount')::numeric, 0);
  v_form_data := COALESCE(p_data->'formData', p_data);
  v_created_by := COALESCE((p_data->>'createdBy')::uuid, auth.uid());

  -- Fallback: derive gross/net from form_data parties if not supplied explicitly
  IF v_gross = 0 AND v_form_data IS NOT NULL THEN
    BEGIN
      v_gross := COALESCE((SELECT SUM((e->>'amount')::numeric) FROM jsonb_array_elements(COALESCE(v_form_data->'partyEntries','[]'::jsonb)) e), 0);
    EXCEPTION WHEN OTHERS THEN
      v_gross := 0;
    END;
  END IF;

  SELECT created_at INTO v_existing_created
  FROM public.gtr44_bills
  WHERE id = v_id AND office_id = p_office_id;

  INSERT INTO public.gtr44_bills (
    id, office_id, bill_no, fy, month, status,
    gross_amount, net_amount, form_data, created_at, updated_at, created_by
  )
  VALUES (
    v_id, p_office_id, v_bill_no, v_fy, v_month, v_status,
    v_gross, v_net, COALESCE(v_form_data, p_data), COALESCE(v_existing_created, v_now), v_now, v_created_by
  )
  ON CONFLICT (id) DO UPDATE SET
    bill_no = EXCLUDED.bill_no,
    fy = EXCLUDED.fy,
    month = EXCLUDED.month,
    status = EXCLUDED.status,
    gross_amount = EXCLUDED.gross_amount,
    net_amount = EXCLUDED.net_amount,
    form_data = EXCLUDED.form_data,
    updated_at = EXCLUDED.updated_at;

  SELECT json_build_object(
    'id', id,
    'billNo', bill_no,
    'fy', fy,
    'month', month,
    'status', status,
    'grossAmount', gross_amount,
    'netAmount', net_amount,
    'createdDate', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedDate', to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'createdBy', created_by,
    'formData', form_data
  ) INTO v_result
  FROM public.gtr44_bills
  WHERE id = v_id AND office_id = p_office_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.4 Delete one bill
CREATE OR REPLACE FUNCTION public.delete_gtr44_bill(
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

  DELETE FROM public.gtr44_bills
  WHERE office_id = p_office_id AND id = p_bill_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN json_build_object('deleted', v_deleted_count > 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
