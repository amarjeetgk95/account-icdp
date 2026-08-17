-- 023_gtr30_employee_master_backend.sql
-- GTR-30 Employee Master backend.
-- Every employee entry is governed by (office, month string + bill code string),
-- e.g. "July-2026" + "GTR30-SAL".
--
-- Tables:
--   1. gtr30_employee_master     - employee salary rows per office, month + bill code
--   2. gtr30_bill_code_mappings  - per-office bill code catalog (GTR30-SAL, GTR30-DA, ...)
--
-- Backend functions (RPC):
--   list_gtr30_employee_master(p_office_id)                      -> JSON (all month/bill groups)
--   get_gtr30_employee_master(p_office_id, p_month_key, p_bill_code) -> JSON (single group)
--   upsert_gtr30_employee_master(p_office_id, p_month_key, p_bill_code, p_employees) -> JSON
--   get_gtr30_bill_code_mappings(p_office_id)                    -> JSON
--   upsert_gtr30_bill_code_mappings(p_office_id, p_mappings)     -> JSON (wholesale replace)

-- =====================================================================
-- 1. GTR-30 Employee Master
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.gtr30_employee_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  bill_code TEXT NOT NULL,
  sr_no INTEGER NOT NULL DEFAULT 0,
  hrpn_no TEXT,
  name TEXT NOT NULL DEFAULT '',
  designation TEXT,
  pay_scale TEXT,
  current_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_pay_date DATE,
  hra_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
  medical_allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
  cla_allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gtr30_employee_master_office
  ON public.gtr30_employee_master(office_id);
CREATE INDEX IF NOT EXISTS idx_gtr30_employee_master_group
  ON public.gtr30_employee_master(office_id, month_key, bill_code);

-- =====================================================================
-- 2. GTR-30 Bill Code Mappings
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.gtr30_bill_code_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  bill_code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (office_id, bill_code)
);

CREATE INDEX IF NOT EXISTS idx_gtr30_bill_code_mappings_office
  ON public.gtr30_bill_code_mappings(office_id);

-- =====================================================================
-- 3. Row-Level Security
-- =====================================================================
ALTER TABLE public.gtr30_employee_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtr30_bill_code_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view gtr30 employee master in their office" ON public.gtr30_employee_master;
DROP POLICY IF EXISTS "Users can manage gtr30 employee master in their office" ON public.gtr30_employee_master;
DROP POLICY IF EXISTS "Admins can manage all gtr30 employee master" ON public.gtr30_employee_master;

CREATE POLICY "Users can view gtr30 employee master in their office"
  ON public.gtr30_employee_master FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage gtr30 employee master in their office"
  ON public.gtr30_employee_master FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all gtr30 employee master"
  ON public.gtr30_employee_master FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view gtr30 bill code mappings in their office" ON public.gtr30_bill_code_mappings;
DROP POLICY IF EXISTS "Users can manage gtr30 bill code mappings in their office" ON public.gtr30_bill_code_mappings;
DROP POLICY IF EXISTS "Admins can manage all gtr30 bill code mappings" ON public.gtr30_bill_code_mappings;

CREATE POLICY "Users can view gtr30 bill code mappings in their office"
  ON public.gtr30_bill_code_mappings FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage gtr30 bill code mappings in their office"
  ON public.gtr30_bill_code_mappings FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all gtr30 bill code mappings"
  ON public.gtr30_bill_code_mappings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- 4. Backend functions (RPC)
-- =====================================================================
DROP FUNCTION IF EXISTS public.list_gtr30_employee_master(BIGINT);
DROP FUNCTION IF EXISTS public.get_gtr30_employee_master(BIGINT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_gtr30_employee_master(BIGINT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.get_gtr30_bill_code_mappings(BIGINT);
DROP FUNCTION IF EXISTS public.upsert_gtr30_bill_code_mappings(BIGINT, JSONB);

-- 4.1 List all month/bill-code groups for an office
CREATE OR REPLACE FUNCTION public.list_gtr30_employee_master(
  p_office_id BIGINT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  SELECT COALESCE(json_agg(g), '[]'::json) INTO v_result
  FROM (
    SELECT
      month_key,
      bill_code,
      COALESCE(json_agg(json_build_object(
        'id', id,
        'srNo', sr_no,
        'hrpnNo', hrpn_no,
        'name', name,
        'designation', designation,
        'payScale', pay_scale,
        'currentPay', current_pay,
        'currentPayDate', to_char(current_pay_date, 'YYYY-MM-DD'),
        'hraPercent', hra_percent,
        'transportAllowance', transport_allowance,
        'medicalAllowance', medical_allowance,
        'claAllowance', cla_allowance
      ) ORDER BY sr_no), '[]'::json) AS employees
    FROM public.gtr30_employee_master
    WHERE office_id = p_office_id
    GROUP BY month_key, bill_code
    ORDER BY month_key, bill_code
  ) g;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.2 Get one month/bill-code group
CREATE OR REPLACE FUNCTION public.get_gtr30_employee_master(
  p_office_id BIGINT,
  p_month_key TEXT,
  p_bill_code TEXT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'id', id,
    'srNo', sr_no,
    'hrpnNo', hrpn_no,
    'name', name,
    'designation', designation,
    'payScale', pay_scale,
    'currentPay', current_pay,
    'currentPayDate', to_char(current_pay_date, 'YYYY-MM-DD'),
    'hraPercent', hra_percent,
    'transportAllowance', transport_allowance,
    'medicalAllowance', medical_allowance,
    'claAllowance', cla_allowance
  ) ORDER BY sr_no), '[]'::json) INTO v_result
  FROM public.gtr30_employee_master
  WHERE office_id = p_office_id
    AND lower(month_key) = lower(p_month_key)
    AND lower(bill_code) = lower(p_bill_code);

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.3 Upsert a whole month/bill-code group (rows missing from the payload are removed)
CREATE OR REPLACE FUNCTION public.upsert_gtr30_employee_master(
  p_office_id BIGINT,
  p_month_key TEXT,
  p_bill_code TEXT,
  p_employees JSONB
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  IF p_employees IS NULL OR p_employees = 'null'::jsonb THEN
    p_employees := '[]'::jsonb;
  END IF;

  -- Remove rows in this group whose ids are no longer present
  DELETE FROM public.gtr30_employee_master
  WHERE office_id = p_office_id
    AND lower(month_key) = lower(p_month_key)
    AND lower(bill_code) = lower(p_bill_code)
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_employees) e
      WHERE e->>'id' IS NOT NULL AND e->>'id' <> ''
        AND id::text = e->>'id'
    );

  -- Upsert each payload row
  INSERT INTO public.gtr30_employee_master (
    id, office_id, month_key, bill_code, sr_no, hrpn_no, name, designation,
    pay_scale, current_pay, current_pay_date, hra_percent,
    transport_allowance, medical_allowance, cla_allowance, updated_at
  )
  SELECT
    COALESCE(r.id::uuid, gen_random_uuid()),
    p_office_id,
    p_month_key,
    p_bill_code,
    COALESCE(r.sr_no, 0),
    r.hrpn_no,
    COALESCE(r.name, ''),
    r.designation,
    r.pay_scale,
    COALESCE(r.current_pay, 0),
    r.current_pay_date::date,
    COALESCE(r.hra_percent, 0),
    COALESCE(r.transport_allowance, 0),
    COALESCE(r.medical_allowance, 0),
    COALESCE(r.cla_allowance, 0),
    NOW()
  FROM jsonb_to_recordset(p_employees) AS r(
    id TEXT, sr_no INTEGER, hrpn_no TEXT, name TEXT, designation TEXT,
    pay_scale TEXT, current_pay NUMERIC, current_pay_date TEXT,
    hra_percent NUMERIC, transport_allowance NUMERIC,
    medical_allowance NUMERIC, cla_allowance NUMERIC
  )
  ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    hrpn_no = EXCLUDED.hrpn_no,
    name = EXCLUDED.name,
    designation = EXCLUDED.designation,
    pay_scale = EXCLUDED.pay_scale,
    current_pay = EXCLUDED.current_pay,
    current_pay_date = EXCLUDED.current_pay_date,
    hra_percent = EXCLUDED.hra_percent,
    transport_allowance = EXCLUDED.transport_allowance,
    medical_allowance = EXCLUDED.medical_allowance,
    cla_allowance = EXCLUDED.cla_allowance,
    updated_at = NOW();

  SELECT COALESCE(json_agg(json_build_object(
    'id', id,
    'srNo', sr_no,
    'hrpnNo', hrpn_no,
    'name', name,
    'designation', designation,
    'payScale', pay_scale,
    'currentPay', current_pay,
    'currentPayDate', to_char(current_pay_date, 'YYYY-MM-DD'),
    'hraPercent', hra_percent,
    'transportAllowance', transport_allowance,
    'medicalAllowance', medical_allowance,
    'claAllowance', cla_allowance
  ) ORDER BY sr_no), '[]'::json) INTO v_result
  FROM public.gtr30_employee_master
  WHERE office_id = p_office_id
    AND lower(month_key) = lower(p_month_key)
    AND lower(bill_code) = lower(p_bill_code);

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.4 Get bill code mappings for an office
CREATE OR REPLACE FUNCTION public.get_gtr30_bill_code_mappings(
  p_office_id BIGINT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'id', id,
    'billCode', bill_code,
    'description', description
  ) ORDER BY bill_code), '[]'::json) INTO v_result
  FROM public.gtr30_bill_code_mappings
  WHERE office_id = p_office_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.5 Wholesale replace bill code mappings for an office
CREATE OR REPLACE FUNCTION public.upsert_gtr30_bill_code_mappings(
  p_office_id BIGINT,
  p_mappings JSONB
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  IF p_mappings IS NULL OR p_mappings = 'null'::jsonb THEN
    p_mappings := '[]'::jsonb;
  END IF;

  DELETE FROM public.gtr30_bill_code_mappings
  WHERE office_id = p_office_id;

  INSERT INTO public.gtr30_bill_code_mappings (
    id, office_id, bill_code, description, updated_at
  )
  SELECT
    COALESCE(r.id::uuid, gen_random_uuid()),
    p_office_id,
    r.bill_code,
    COALESCE(r.description, ''),
    NOW()
  FROM jsonb_to_recordset(p_mappings) AS r(id TEXT, bill_code TEXT, description TEXT);

  SELECT COALESCE(json_agg(json_build_object(
    'id', id,
    'billCode', bill_code,
    'description', description
  ) ORDER BY bill_code), '[]'::json) INTO v_result
  FROM public.gtr30_bill_code_mappings
  WHERE office_id = p_office_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;