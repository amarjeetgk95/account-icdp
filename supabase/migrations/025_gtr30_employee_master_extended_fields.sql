-- 025_gtr30_employee_master_extended_fields.sql
-- Add extended schedule fields to gtr30_employee_master table and update RPC functions.

ALTER TABLE public.gtr30_employee_master
  ADD COLUMN IF NOT EXISTS designation_gujarati TEXT,
  ADD COLUMN IF NOT EXISTS cadre_class TEXT,
  ADD COLUMN IF NOT EXISTS grade_pay TEXT,
  ADD COLUMN IF NOT EXISTS pay_level_cell TEXT,
  ADD COLUMN IF NOT EXISTS ppa_no TEXT,
  ADD COLUMN IF NOT EXISTS quarter_address TEXT,
  ADD COLUMN IF NOT EXISTS insurance_group TEXT,
  ADD COLUMN IF NOT EXISTS insurance_type TEXT,
  ADD COLUMN IF NOT EXISTS da NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rent_of_building NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS professional_tax NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gis1981_insurance NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gis1981_savings NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nps_pension NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS society_deduction NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remarks TEXT;

-- 1. List all month/bill-code groups for an office with all fields
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
        'gis1981Insurance', gis1981_insurance,
        'gis1981Savings', gis1981_savings,
        'npsPension', nps_pension,
        'societyDeduction', society_deduction,
        'remarks', remarks
      ) ORDER BY sr_no), '[]'::json) AS employees
    FROM public.gtr30_employee_master
    WHERE office_id = p_office_id
    GROUP BY month_key, bill_code
    ORDER BY month_key, bill_code
  ) g;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Get one month/bill-code group with all fields
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
    'gis1981Insurance', gis1981_insurance,
    'gis1981Savings', gis1981_savings,
    'npsPension', nps_pension,
    'societyDeduction', society_deduction,
    'remarks', remarks
  ) ORDER BY sr_no), '[]'::json) INTO v_result
  FROM public.gtr30_employee_master
  WHERE office_id = p_office_id
    AND lower(month_key) = lower(p_month_key)
    AND lower(bill_code) = lower(p_bill_code);

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Upsert a whole month/bill-code group with all fields
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
    id, office_id, month_key, bill_code, sr_no, hrpn_no, name,
    designation, designation_gujarati, cadre_class, pay_scale, grade_pay,
    pay_level_cell, ppa_no, current_pay, current_pay_date, quarter_address,
    insurance_group, insurance_type, hra_percent, da, transport_allowance,
    medical_allowance, cla_allowance, rent_of_building, professional_tax,
    gis1981_insurance, gis1981_savings, nps_pension, society_deduction,
    remarks, updated_at
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
    r.designation_gujarati,
    r.cadre_class,
    r.pay_scale,
    r.grade_pay,
    r.pay_level_cell,
    r.ppa_no,
    COALESCE(r.current_pay, 0),
    r.current_pay_date::date,
    r.quarter_address,
    r.insurance_group,
    r.insurance_type,
    COALESCE(r.hra_percent, 0),
    COALESCE(r.da, 0),
    COALESCE(r.transport_allowance, 0),
    COALESCE(r.medical_allowance, 0),
    COALESCE(r.cla_allowance, 0),
    COALESCE(r.rent_of_building, 0),
    COALESCE(r.professional_tax, 0),
    COALESCE(r.gis1981_insurance, 0),
    COALESCE(r.gis1981_savings, 0),
    COALESCE(r.nps_pension, 0),
    COALESCE(r.society_deduction, 0),
    r.remarks,
    NOW()
  FROM jsonb_to_recordset(p_employees) AS r(
    id TEXT, sr_no INTEGER, hrpn_no TEXT, name TEXT,
    designation TEXT, designation_gujarati TEXT, cadre_class TEXT,
    pay_scale TEXT, grade_pay TEXT, pay_level_cell TEXT, ppa_no TEXT,
    current_pay NUMERIC, current_pay_date TEXT, quarter_address TEXT,
    insurance_group TEXT, insurance_type TEXT, hra_percent NUMERIC,
    da NUMERIC, transport_allowance NUMERIC, medical_allowance NUMERIC,
    cla_allowance NUMERIC, rent_of_building NUMERIC, professional_tax NUMERIC,
    gis1981_insurance NUMERIC, gis1981_savings NUMERIC, nps_pension NUMERIC,
    society_deduction NUMERIC, remarks TEXT
  )
  ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    hrpn_no = EXCLUDED.hrpn_no,
    name = EXCLUDED.name,
    designation = EXCLUDED.designation,
    designation_gujarati = EXCLUDED.designation_gujarati,
    cadre_class = EXCLUDED.cadre_class,
    pay_scale = EXCLUDED.pay_scale,
    grade_pay = EXCLUDED.grade_pay,
    pay_level_cell = EXCLUDED.pay_level_cell,
    ppa_no = EXCLUDED.ppa_no,
    current_pay = EXCLUDED.current_pay,
    current_pay_date = EXCLUDED.current_pay_date,
    quarter_address = EXCLUDED.quarter_address,
    insurance_group = EXCLUDED.insurance_group,
    insurance_type = EXCLUDED.insurance_type,
    hra_percent = EXCLUDED.hra_percent,
    da = EXCLUDED.da,
    transport_allowance = EXCLUDED.transport_allowance,
    medical_allowance = EXCLUDED.medical_allowance,
    cla_allowance = EXCLUDED.cla_allowance,
    rent_of_building = EXCLUDED.rent_of_building,
    professional_tax = EXCLUDED.professional_tax,
    gis1981_insurance = EXCLUDED.gis1981_insurance,
    gis1981_savings = EXCLUDED.gis1981_savings,
    nps_pension = EXCLUDED.nps_pension,
    society_deduction = EXCLUDED.society_deduction,
    remarks = EXCLUDED.remarks,
    updated_at = NOW();

  SELECT COALESCE(json_agg(json_build_object(
    'id', id,
    'srNo', sr_no,
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
    'gis1981Insurance', gis1981_insurance,
    'gis1981Savings', gis1981_savings,
    'npsPension', nps_pension,
    'societyDeduction', society_deduction,
    'remarks', remarks
  ) ORDER BY sr_no), '[]'::json) INTO v_result
  FROM public.gtr30_employee_master
  WHERE office_id = p_office_id
    AND lower(month_key) = lower(p_month_key)
    AND lower(bill_code) = lower(p_bill_code);

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
