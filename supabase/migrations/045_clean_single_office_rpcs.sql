-- ============================================================================
-- 045_clean_single_office_rpcs.sql
-- Modernize all RPC functions for pure single-office architecture
-- Eliminates references to "p.office_id" and "office_id" across all functions.
-- ============================================================================

BEGIN;

-- 1. Helper functions
CREATE OR REPLACE FUNCTION public.can_access_office(target_office_id bigint DEFAULT NULL)
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_access_office(target_office_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Establishment RPCs
CREATE OR REPLACE FUNCTION public.list_establishment(
  p_office_id BIGINT DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(emp), '[]'::json) INTO v_result
  FROM (
    SELECT
      e.id,
      e.hrpn_no AS "hrpnNo",
      e.name,
      e.designation,
      e.designation_gu AS "designationGu",
      e.cadre_class AS "cadreClass",
      e.pan,
      e.pay_scale AS "payScale",
      e.grade_pay AS "gradePay",
      e.pay_level AS "payLevel",
      e.pay_cell AS "payCell",
      e.ppa_no AS "ppaNo",
      to_char(e.join_date, 'YYYY-MM-DD') AS "joinDate",
      to_char(e.transfer_date, 'YYYY-MM-DD') AS "transferDate",
      e.active,
      e.quarters_address AS "quartersAddress",
      e.gis_group AS "gisGroup",
      e.allowances,
      e.deductions,
      COALESCE((
        SELECT json_agg(pe ORDER BY pe.effective_date, pe.created_at)
        FROM (
          SELECT
            pe.id,
            to_char(pe.effective_date, 'YYYY-MM-DD') AS "effectiveDate",
            pe.basic_pay AS "basicPay",
            pe.pay_scale AS "payScale",
            pe.level_cell AS "levelCell",
            pe.notes
          FROM public.establishment_pay_entries pe
          WHERE pe.employee_id = e.id
        ) pe
      ), '[]'::json) AS "payEntries"
    FROM public.establishment_employees e
    ORDER BY e.active DESC, e.name, e.hrpn_no NULLS LAST
  ) emp;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.upsert_establishment_employees(
  p_office_id BIGINT DEFAULT 1,
  p_employees JSONB DEFAULT '[]'::jsonb
)
RETURNS JSON AS $$
DECLARE
  r RECORD;
  v_employee_id UUID;
BEGIN
  IF p_employees IS NULL OR p_employees = 'null'::jsonb THEN
    p_employees := '[]'::jsonb;
  END IF;

  DELETE FROM public.establishment_employees
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_employees) e
    WHERE e->>'id' IS NOT NULL AND e->>'id' <> ''
      AND id::text = e->>'id'
  );

  FOR r IN SELECT * FROM jsonb_to_recordset(p_employees) AS x(
    id TEXT, "hrpnNo" TEXT, name TEXT, designation TEXT, "designationGu" TEXT,
    "cadreClass" TEXT, pan TEXT, "payScale" TEXT, "gradePay" TEXT,
    "payLevel" TEXT, "payCell" TEXT, "ppaNo" TEXT, "joinDate" TEXT,
    "transferDate" TEXT, active BOOLEAN, "quartersAddress" TEXT, "gisGroup" TEXT,
    allowances JSONB, deductions JSONB, "payEntries" JSONB
  )
  LOOP
    INSERT INTO public.establishment_employees (
      id, hrpn_no, name, designation, designation_gu, cadre_class,
      pan, pay_scale, grade_pay, pay_level, pay_cell, ppa_no, join_date,
      transfer_date, active, quarters_address, gis_group, allowances, deductions, updated_at
    )
    VALUES (
      COALESCE(r.id::uuid, gen_random_uuid()),
      NULLIF(r."hrpnNo", ''),
      COALESCE(r.name, ''),
      r.designation,
      r."designationGu",
      r."cadreClass",
      NULLIF(r.pan, ''),
      r."payScale",
      r."gradePay",
      r."payLevel",
      r."payCell",
      r."ppaNo",
      NULLIF(r."joinDate", '')::date,
      NULLIF(r."transferDate", '')::date,
      COALESCE(r.active, TRUE),
      r."quartersAddress",
      r."gisGroup",
      COALESCE(r.allowances, '{}'::jsonb),
      COALESCE(r.deductions, '{}'::jsonb),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      hrpn_no = EXCLUDED.hrpn_no,
      name = EXCLUDED.name,
      designation = EXCLUDED.designation,
      designation_gu = EXCLUDED.designation_gu,
      cadre_class = EXCLUDED.cadre_class,
      pan = EXCLUDED.pan,
      pay_scale = EXCLUDED.pay_scale,
      grade_pay = EXCLUDED.grade_pay,
      pay_level = EXCLUDED.pay_level,
      pay_cell = EXCLUDED.pay_cell,
      ppa_no = EXCLUDED.ppa_no,
      join_date = EXCLUDED.join_date,
      transfer_date = EXCLUDED.transfer_date,
      active = EXCLUDED.active,
      quarters_address = EXCLUDED.quarters_address,
      gis_group = EXCLUDED.gis_group,
      allowances = EXCLUDED.allowances,
      deductions = EXCLUDED.deductions,
      updated_at = NOW()
    RETURNING id INTO v_employee_id;

    IF v_employee_id IS NOT NULL THEN
      DELETE FROM public.establishment_pay_entries
      WHERE employee_id = v_employee_id
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(r."payEntries", '[]'::jsonb)) e
          WHERE e->>'id' IS NOT NULL AND e->>'id' <> ''
            AND id::text = e->>'id'
        );

      INSERT INTO public.establishment_pay_entries (
        id, employee_id, effective_date, basic_pay, pay_scale, level_cell, notes, updated_at
      )
      SELECT
        COALESCE(pe.id::uuid, gen_random_uuid()),
        v_employee_id,
        COALESCE(NULLIF(pe."effectiveDate", '')::date, CURRENT_DATE),
        COALESCE(pe."basicPay", 0),
        pe."payScale",
        pe."levelCell",
        pe.notes,
        NOW()
      FROM jsonb_to_recordset(COALESCE(r."payEntries", '[]'::jsonb)) AS pe(
        id TEXT, "effectiveDate" TEXT, "basicPay" NUMERIC,
        "payScale" TEXT, "levelCell" TEXT, notes TEXT
      )
      ON CONFLICT (id) DO UPDATE SET
        effective_date = EXCLUDED.effective_date,
        basic_pay = EXCLUDED.basic_pay,
        pay_scale = EXCLUDED.pay_scale,
        level_cell = EXCLUDED.level_cell,
        notes = EXCLUDED.notes,
        updated_at = NOW();
    END IF;
  END LOOP;

  RETURN public.list_establishment(p_office_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.list_establishment_posts(
  p_office_id BIGINT DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(json_build_object(
    'id', p.id,
    'srNo', p.sr_no,
    'designation', p.designation,
    'cadreClass', p.cadre_class,
    'sanctioned', p.sanctioned,
    'filled', p.filled
  ) ORDER BY p.sr_no, p.designation), '[]'::json) INTO v_result
  FROM public.establishment_posts p;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.upsert_establishment_posts(
  p_office_id BIGINT DEFAULT 1,
  p_posts JSONB DEFAULT '[]'::jsonb
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF p_posts IS NULL OR p_posts = 'null'::jsonb THEN
    p_posts := '[]'::jsonb;
  END IF;

  DELETE FROM public.establishment_posts
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_posts) e
    WHERE e->>'id' IS NOT NULL AND e->>'id' <> ''
      AND id::text = e->>'id'
  );

  INSERT INTO public.establishment_posts (
    id, sr_no, designation, cadre_class, sanctioned, filled, updated_at
  )
  SELECT
    COALESCE(r.id::uuid, gen_random_uuid()),
    COALESCE(r.sr_no, 0),
    COALESCE(r.designation, ''),
    r.cadre_class,
    COALESCE(r.sanctioned, 0),
    COALESCE(r.filled, 0),
    NOW()
  FROM jsonb_to_recordset(p_posts) AS r(
    id TEXT, sr_no INTEGER, designation TEXT, cadre_class TEXT,
    sanctioned INTEGER, filled INTEGER
  )
  ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    designation = EXCLUDED.designation,
    cadre_class = EXCLUDED.cadre_class,
    sanctioned = EXCLUDED.sanctioned,
    filled = EXCLUDED.filled,
    updated_at = NOW();

  SELECT COALESCE(json_agg(json_build_object(
    'id', p.id,
    'srNo', p.sr_no,
    'designation', p.designation,
    'cadreClass', p.cadre_class,
    'sanctioned', p.sanctioned,
    'filled', p.filled
  ) ORDER BY p.sr_no, p.designation), '[]'::json) INTO v_result
  FROM public.establishment_posts p;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. GTR-30 Budget Heads RPCs
CREATE OR REPLACE FUNCTION public.get_gtr30_budget_heads(
  p_office_id BIGINT DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(
    json_agg(
      (jsonb_build_object('id', id::text, 'name', name) || payload)
      ORDER BY name
    ),
    '[]'::json
  ) INTO v_result
  FROM public.gtr30_budget_heads;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.upsert_gtr30_budget_heads(
  p_office_id BIGINT DEFAULT 1,
  p_heads JSONB DEFAULT '[]'::jsonb
)
RETURNS JSON AS $$
BEGIN
  IF p_heads IS NULL OR p_heads = 'null'::jsonb THEN
    p_heads := '[]'::jsonb;
  END IF;

  DELETE FROM public.gtr30_budget_heads;

  INSERT INTO public.gtr30_budget_heads (id, name, payload, updated_at)
  SELECT
    COALESCE((r->>'id')::uuid, gen_random_uuid()),
    COALESCE(r->>'name', ''),
    COALESCE(r - 'id' - 'name', '{}'::jsonb),
    NOW()
  FROM jsonb_array_elements(p_heads) AS r;

  RETURN public.get_gtr30_budget_heads(p_office_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. GTR-30 Employee Master RPCs
CREATE OR REPLACE FUNCTION public.list_gtr30_employee_master(
  p_office_id BIGINT DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'monthKey', g.month_key,
        'billCode', g.bill_code,
        'employees', g.employees
      )
      ORDER BY g.month_key, g.bill_code
    ),
    '[]'::json
  ) INTO v_result
  FROM (
    SELECT
      month_key,
      bill_code,
      json_agg(
        json_build_object(
          'id', id::text,
          'srNo', sr_no,
          'billCode', bill_code,
          'hrpnNo', hrpn_no,
          'name', name,
          'designation', designation,
          'designationGujarati', designation_gujarati,
          'cadreClass', cadre_class,
          'payScale', pay_scale,
          'gradePay', grade_pay,
          'payLevelCell', pay_level_cell,
          'ppaNo', ppa_no,
          'currentPay', current_pay,
          'currentPayDate', to_char(current_pay_date, 'YYYY-MM-DD'),
          'quarterAddress', quarter_address,
          'insuranceGroup', insurance_group,
          'insuranceType', insurance_type,
          'hraPercent', hra_percent,
          'da', da,
          'transportAllowance', transport_allowance,
          'medicalAllowance', medical_allowance,
          'claAllowance', cla_allowance,
          'rentOfBuilding', rent_of_building,
          'professionalTax', professional_tax,
          'gis1981Insurance', gis_1981_insurance,
          'gis1981Savings', gis_1981_savings,
          'npsPension', nps_pension,
          'societyDeduction', society_deduction,
          'remarks', remarks,
          'payEntries', pay_entries
        )
        ORDER BY sr_no, name
      ) AS employees
    FROM public.gtr30_employee_master
    GROUP BY month_key, bill_code
  ) g;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_gtr30_employee_master(
  p_office_id BIGINT DEFAULT 1,
  p_month_key TEXT DEFAULT '',
  p_bill_code TEXT DEFAULT ''
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', id::text,
        'srNo', sr_no,
        'billCode', bill_code,
        'hrpnNo', hrpn_no,
        'name', name,
        'designation', designation,
        'designationGujarati', designation_gujarati,
        'cadreClass', cadre_class,
        'payScale', pay_scale,
        'gradePay', grade_pay,
        'payLevelCell', pay_level_cell,
        'ppaNo', ppa_no,
        'currentPay', current_pay,
        'currentPayDate', to_char(current_pay_date, 'YYYY-MM-DD'),
        'quarterAddress', quarter_address,
        'insuranceGroup', insurance_group,
        'insuranceType', insurance_type,
        'hraPercent', hra_percent,
        'da', da,
        'transportAllowance', transport_allowance,
        'medicalAllowance', medical_allowance,
        'claAllowance', cla_allowance,
        'rentOfBuilding', rent_of_building,
        'professionalTax', professional_tax,
        'gis1981Insurance', gis_1981_insurance,
        'gis1981Savings', gis_1981_savings,
        'npsPension', nps_pension,
        'societyDeduction', society_deduction,
        'remarks', remarks,
        'payEntries', pay_entries
      )
      ORDER BY sr_no, name
    ),
    '[]'::json
  ) INTO v_result
  FROM public.gtr30_employee_master
  WHERE month_key = p_month_key
    AND bill_code = p_bill_code;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.upsert_gtr30_employee_master(
  p_office_id BIGINT DEFAULT 1,
  p_month_key TEXT DEFAULT '',
  p_bill_code TEXT DEFAULT '',
  p_employees JSONB DEFAULT '[]'::jsonb
)
RETURNS JSON AS $$
BEGIN
  IF p_employees IS NULL OR p_employees = 'null'::jsonb THEN
    p_employees := '[]'::jsonb;
  END IF;

  DELETE FROM public.gtr30_employee_master
  WHERE month_key = p_month_key
    AND bill_code = p_bill_code;

  INSERT INTO public.gtr30_employee_master (
    id, month_key, bill_code, sr_no, hrpn_no, name, designation,
    designation_gujarati, cadre_class, pay_scale, grade_pay, pay_level_cell,
    ppa_no, current_pay, current_pay_date, quarter_address, insurance_group,
    insurance_type, hra_percent, da, transport_allowance, medical_allowance,
    cla_allowance, rent_of_building, professional_tax, gis_1981_insurance,
    gis_1981_savings, nps_pension, society_deduction, remarks, pay_entries,
    updated_at
  )
  SELECT
    COALESCE((r->>'id')::uuid, gen_random_uuid()),
    p_month_key,
    p_bill_code,
    COALESCE((r->>'srNo')::integer, 0),
    NULLIF(r->>'hrpnNo', ''),
    COALESCE(r->>'name', ''),
    r->>'designation',
    r->>'designationGujarati',
    r->>'cadreClass',
    r->>'payScale',
    r->>'gradePay',
    r->>'payLevelCell',
    r->>'ppaNo',
    COALESCE((r->>'currentPay')::numeric, 0),
    NULLIF(r->>'currentPayDate', '')::date,
    r->>'quarterAddress',
    r->>'insuranceGroup',
    r->>'insuranceType',
    COALESCE((r->>'hraPercent')::numeric, 0),
    (r->>'da')::numeric,
    COALESCE((r->>'transportAllowance')::numeric, 0),
    COALESCE((r->>'medicalAllowance')::numeric, 0),
    COALESCE((r->>'claAllowance')::numeric, 0),
    (r->>'rentOfBuilding')::numeric,
    (r->>'professionalTax')::numeric,
    (r->>'gis1981Insurance')::numeric,
    (r->>'gis1981Savings')::numeric,
    (r->>'npsPension')::numeric,
    (r->>'societyDeduction')::numeric,
    r->>'remarks',
    COALESCE(r->'payEntries', '[]'::jsonb),
    NOW()
  FROM jsonb_array_elements(p_employees) AS r;

  RETURN public.get_gtr30_employee_master(p_office_id, p_month_key, p_bill_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. GTR-30 Bill Code Mappings RPCs
CREATE OR REPLACE FUNCTION public.get_gtr30_bill_code_mappings(
  p_office_id BIGINT DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(
    json_agg(
      (jsonb_build_object('id', id::text, 'billCode', bill_code, 'description', description) || payload)
      ORDER BY bill_code
    ),
    '[]'::json
  ) INTO v_result
  FROM public.gtr30_bill_code_mappings;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.upsert_gtr30_bill_code_mappings(
  p_office_id BIGINT DEFAULT 1,
  p_mappings JSONB DEFAULT '[]'::jsonb
)
RETURNS JSON AS $$
BEGIN
  IF p_mappings IS NULL OR p_mappings = 'null'::jsonb THEN
    p_mappings := '[]'::jsonb;
  END IF;

  DELETE FROM public.gtr30_bill_code_mappings;

  INSERT INTO public.gtr30_bill_code_mappings (id, bill_code, description, payload, updated_at)
  SELECT
    COALESCE((r->>'id')::uuid, gen_random_uuid()),
    COALESCE(r->>'billCode', ''),
    COALESCE(r->>'description', ''),
    COALESCE(r - 'id' - 'billCode' - 'description', '{}'::jsonb),
    NOW()
  FROM jsonb_array_elements(p_mappings) AS r;

  RETURN public.get_gtr30_bill_code_mappings(p_office_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. GTR-30 Bills Register RPCs
CREATE OR REPLACE FUNCTION public.list_gtr30_bills(
  p_office_id BIGINT DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(b), '[]'::json) INTO v_result
  FROM (
    SELECT
      id::text,
      bill_register_no AS "billRegisterNo",
      to_char(bill_date, 'YYYY-MM-DD') AS "billDate",
      month_of AS "monthOf",
      bill_code AS "billCode",
      status,
      gross_total AS "grossTotal",
      deductions_total AS "deductionsTotal",
      net_total AS "netTotal",
      to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdDate",
      to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "updatedDate",
      data
    FROM public.gtr30_bills
    ORDER BY created_at DESC
  ) b;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_gtr30_bill(
  p_office_id BIGINT DEFAULT 1,
  p_bill_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', id::text,
    'billRegisterNo', bill_register_no,
    'billDate', to_char(bill_date, 'YYYY-MM-DD'),
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
  WHERE id = p_bill_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.upsert_gtr30_bill(
  p_office_id BIGINT DEFAULT 1,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON AS $$
DECLARE
  v_bill_id UUID;
BEGIN
  v_bill_id := COALESCE((p_data->>'id')::uuid, gen_random_uuid());

  INSERT INTO public.gtr30_bills (
    id, bill_register_no, bill_date, month_of, bill_code,
    status, gross_total, deductions_total, net_total, data, updated_at
  )
  VALUES (
    v_bill_id,
    COALESCE(p_data->>'billRegisterNo', ''),
    NULLIF(p_data->>'billDate', '')::date,
    p_data->>'monthOf',
    p_data->>'billCode',
    COALESCE(p_data->>'status', 'draft'),
    COALESCE((p_data->>'grossTotal')::numeric, 0),
    COALESCE((p_data->>'deductionsTotal')::numeric, 0),
    COALESCE((p_data->>'netTotal')::numeric, 0),
    p_data,
    NOW()
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
    updated_at = NOW();

  RETURN public.get_gtr30_bill(p_office_id, v_bill_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.delete_gtr30_bill(
  p_office_id BIGINT DEFAULT 1,
  p_bill_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  DELETE FROM public.gtr30_bills WHERE id = p_bill_id;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. GTR-44 Bills RPCs
CREATE OR REPLACE FUNCTION public.list_gtr44_bills(
  p_office_id BIGINT DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(b), '[]'::json) INTO v_result
  FROM (
    SELECT
      id::text,
      bill_no AS "billNo",
      fy,
      month,
      status,
      gross_amount AS "grossAmount",
      net_amount AS "netAmount",
      to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdDate",
      to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "updatedDate",
      created_by AS "createdBy",
      form_data AS "formData"
    FROM public.gtr44_bills
    ORDER BY created_at DESC
  ) b;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_gtr44_bill(
  p_office_id BIGINT DEFAULT 1,
  p_bill_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', id::text,
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
  WHERE id = p_bill_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.upsert_gtr44_bill(
  p_office_id BIGINT DEFAULT 1,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON AS $$
DECLARE
  v_bill_id UUID;
BEGIN
  v_bill_id := COALESCE((p_data->>'id')::uuid, gen_random_uuid());

  INSERT INTO public.gtr44_bills (
    id, bill_no, fy, month, status, gross_amount, net_amount, form_data, updated_at
  )
  VALUES (
    v_bill_id,
    COALESCE(p_data->>'billNo', ''),
    (p_data->>'fy')::integer,
    p_data->>'month',
    COALESCE(p_data->>'status', 'draft'),
    COALESCE((p_data->>'grossAmount')::numeric, 0),
    COALESCE((p_data->>'netAmount')::numeric, 0),
    COALESCE(p_data->'formData', '{}'::jsonb),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    bill_no = EXCLUDED.bill_no,
    fy = EXCLUDED.fy,
    month = EXCLUDED.month,
    status = EXCLUDED.status,
    gross_amount = EXCLUDED.gross_amount,
    net_amount = EXCLUDED.net_amount,
    form_data = EXCLUDED.form_data,
    updated_at = NOW();

  RETURN public.get_gtr44_bill(p_office_id, v_bill_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.delete_gtr44_bill(
  p_office_id BIGINT DEFAULT 1,
  p_bill_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  DELETE FROM public.gtr44_bills WHERE id = p_bill_id;
  RETURN json_build_object('deleted', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
