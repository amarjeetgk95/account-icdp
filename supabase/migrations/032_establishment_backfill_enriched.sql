-- 032_establishment_backfill_enriched.sql
-- Re-import friendly backfills: map ALL available source fields into the
-- establishment register, including grade pay, pay level / cell, PPA,
-- cadre class, quarter address, GIS group and deduction defaults.
--
-- Both functions now also REFRESH matching existing rows (previously they
-- only inserted new ones), so re-running an import fills in missing data.

CREATE OR REPLACE FUNCTION public.establishment_split_level_cell(p_level_cell TEXT)
RETURNS TABLE (pay_level TEXT, pay_cell TEXT)
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    (regexp_match(COALESCE(p_level_cell, ''), 'LEVEL[-\s]*(\d+)'))[1],
    (regexp_match(COALESCE(p_level_cell, ''), 'CELL[-\s]*(\d+)'))[1];
$$;

-- ---------------------------------------------------------------------
-- GTR-30 employee master -> establishment register
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.backfill_establishment_from_gtr30(
  p_office_id BIGINT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _est_gtr30_latest ON COMMIT DROP AS
    SELECT DISTINCT ON (COALESCE(NULLIF(m.hrpn_no, ''), lower(m.name)))
      m.hrpn_no, m.name, m.designation, m.designation_gujarati,
      m.cadre_class, m.pay_scale, m.grade_pay, m.pay_level_cell, m.ppa_no,
      m.quarter_address, m.insurance_group,
      m.current_pay, m.current_pay_date, m.month_key,
      m.rent_of_building, m.professional_tax,
      m.gis1981_insurance, m.gis1981_savings, m.nps_pension, m.society_deduction,
      m.hra_percent, m.transport_allowance, m.medical_allowance, m.cla_allowance
    FROM public.gtr30_employee_master m
    WHERE m.office_id = p_office_id
      AND COALESCE(NULLIF(m.hrpn_no, ''), lower(m.name)) IS NOT NULL
    ORDER BY COALESCE(NULLIF(m.hrpn_no, ''), lower(m.name)), m.month_key DESC;

  -- Insert employees not yet in the register
  INSERT INTO public.establishment_employees (
    id, office_id, hrpn_no, name, designation, designation_gu, cadre_class,
    pan, pay_scale, grade_pay, pay_level, pay_cell, ppa_no,
    quarters_address, gis_group, allowances, deductions, active, updated_at
  )
  SELECT
    gen_random_uuid(),
    p_office_id,
    NULLIF(latest.hrpn_no, ''),
    COALESCE(latest.name, ''),
    latest.designation,
    latest.designation_gujarati,
    latest.cadre_class,
    NULL,
    latest.pay_scale,
    latest.grade_pay,
    (public.establishment_split_level_cell(latest.pay_level_cell)).pay_level,
    (public.establishment_split_level_cell(latest.pay_level_cell)).pay_cell,
    latest.ppa_no,
    latest.quarter_address,
    latest.insurance_group,
    jsonb_build_object(
      'hraPercent', COALESCE(latest.hra_percent, 0),
      'transportAllowance', COALESCE(latest.transport_allowance, 0),
      'medicalAllowance', COALESCE(latest.medical_allowance, 0),
      'claAllowance', COALESCE(latest.cla_allowance, 0)
    ),
    jsonb_build_object(
      'rentOfBuilding', COALESCE(latest.rent_of_building, 0),
      'professionalTax', COALESCE(latest.professional_tax, 0),
      'gisInsurance', COALESCE(latest.gis1981_insurance, 0),
      'gisSavings', COALESCE(latest.gis1981_savings, 0),
      'societyDeduction', COALESCE(latest.society_deduction, 0)
    ),
    TRUE,
    NOW()
  FROM _est_gtr30_latest latest
  WHERE NOT EXISTS (
    SELECT 1 FROM public.establishment_employees e
    WHERE e.office_id = p_office_id
      AND COALESCE(NULLIF(e.hrpn_no, ''), lower(e.name)) = COALESCE(NULLIF(latest.hrpn_no, ''), lower(latest.name))
  );
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Refresh fields on rows that already exist (fills gaps on re-import)
  UPDATE public.establishment_employees e
  SET
    designation = COALESCE(NULLIF(e.designation, ''), latest.designation),
    designation_gu = COALESCE(NULLIF(e.designation_gu, ''), latest.designation_gujarati),
    cadre_class = COALESCE(NULLIF(e.cadre_class, ''), latest.cadre_class),
    pay_scale = COALESCE(NULLIF(e.pay_scale, ''), latest.pay_scale),
    grade_pay = COALESCE(NULLIF(e.grade_pay, ''), latest.grade_pay),
    pay_level = COALESCE(NULLIF(e.pay_level, ''), (public.establishment_split_level_cell(latest.pay_level_cell)).pay_level),
    pay_cell = COALESCE(NULLIF(e.pay_cell, ''), (public.establishment_split_level_cell(latest.pay_level_cell)).pay_cell),
    ppa_no = COALESCE(NULLIF(e.ppa_no, ''), latest.ppa_no),
    quarters_address = COALESCE(NULLIF(e.quarters_address, ''), latest.quarter_address),
    gis_group = COALESCE(NULLIF(e.gis_group, ''), latest.insurance_group),
    updated_at = NOW()
  FROM _est_gtr30_latest latest
  WHERE e.office_id = p_office_id
    AND COALESCE(NULLIF(e.hrpn_no, ''), lower(e.name)) = COALESCE(NULLIF(latest.hrpn_no, ''), lower(latest.name));
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  DROP TABLE IF EXISTS _est_gtr30_latest;

  -- Seed a pay entry (current pay + date) for employees that don't have one yet
  WITH seed AS (
    SELECT DISTINCT ON (e.id)
      e.id AS employee_id,
      m.current_pay,
      m.current_pay_date,
      m.pay_scale,
      m.month_key
    FROM public.gtr30_employee_master m
    JOIN public.establishment_employees e
      ON e.office_id = p_office_id
     AND COALESCE(NULLIF(e.hrpn_no, ''), lower(e.name)) = COALESCE(NULLIF(m.hrpn_no, ''), lower(m.name))
    WHERE m.office_id = p_office_id
    ORDER BY e.id, m.month_key DESC
  )
  INSERT INTO public.establishment_pay_entries (
    employee_id, effective_date, basic_pay, pay_scale
  )
  SELECT
    s.employee_id,
    COALESCE(s.current_pay_date, CURRENT_DATE),
    COALESCE(s.current_pay, 0),
    s.pay_scale
  FROM seed s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.establishment_pay_entries pe
    WHERE pe.employee_id = s.employee_id
  );

  SELECT COALESCE(json_agg(emp), '[]'::json) INTO v_result
  FROM (
    SELECT e.id, e.name, e.hrpn_no AS "hrpnNo", e.designation
    FROM public.establishment_employees e
    WHERE e.office_id = p_office_id
    ORDER BY e.name
  ) emp;

  RETURN json_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'total', COALESCE(json_array_length(v_result), 0),
    'employees', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------
-- TDS Payroll roster -> establishment register
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.backfill_establishment_from_payroll(
  p_office_id BIGINT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _est_payroll_src ON COMMIT DROP AS
    SELECT e.*
    FROM public.employees e
    WHERE e.office_id::text = p_office_id::text;

  INSERT INTO public.establishment_employees (
    id, office_id, hrpn_no, name, designation, pay_scale, pan,
    join_date, transfer_date, active, updated_at
  )
  SELECT
    gen_random_uuid(),
    p_office_id,
    NULLIF(s.hprn_no, ''),
    COALESCE(s.name, ''),
    s.designation,
    s.pay_scale,
    NULLIF(s.pan, ''),
    s.join_date,
    s.transfer_date,
    TRUE,
    NOW()
  FROM _est_payroll_src s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.establishment_employees est
    WHERE est.office_id = p_office_id
      AND (
        (COALESCE(NULLIF(s.hprn_no, ''), '') <> '' AND est.hrpn_no = s.hprn_no)
        OR (COALESCE(NULLIF(s.pan, ''), '') <> '' AND est.pan = s.pan)
        OR ((s.hprn_no IS NULL OR s.hprn_no = '') AND lower(est.name) = lower(s.name))
      )
  );
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  UPDATE public.establishment_employees est
  SET
    designation = COALESCE(NULLIF(est.designation, ''), s.designation),
    pay_scale = COALESCE(NULLIF(est.pay_scale, ''), s.pay_scale),
    join_date = COALESCE(est.join_date, s.join_date),
    transfer_date = COALESCE(est.transfer_date, s.transfer_date),
    active = CASE WHEN s.transfer_date IS NULL THEN est.active ELSE FALSE END,
    updated_at = NOW()
  FROM _est_payroll_src s
  WHERE est.office_id = p_office_id
    AND (
      (COALESCE(NULLIF(s.hprn_no, ''), '') <> '' AND est.hrpn_no = s.hprn_no)
      OR (COALESCE(NULLIF(s.pan, ''), '') <> '' AND est.pan = s.pan)
      OR ((s.hprn_no IS NULL OR s.hprn_no = '') AND lower(est.name) = lower(s.name))
    );
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  DROP TABLE IF EXISTS _est_payroll_src;

  SELECT COALESCE(json_agg(emp), '[]'::json) INTO v_result
  FROM (
    SELECT est.id, est.name, est.hrpn_no AS "hrpnNo", est.pan
    FROM public.establishment_employees est
    WHERE est.office_id = p_office_id
    ORDER BY est.name
  ) emp;

  RETURN json_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'total', COALESCE(json_array_length(v_result), 0),
    'employees', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
