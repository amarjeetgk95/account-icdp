-- 033_fix_establishment_payentries_orderby.sql
-- Fix "column pe.effective_date does not exist" in list_establishment.
-- The inner subquery aliases effective_date as "effectiveDate" (quoted camelCase)
-- and does not select created_at. The outer json_agg ORDER BY referenced the
-- underlying snake_case names, which are not visible on the derived row type.
-- Use the quoted aliases and select created_at explicitly.

CREATE OR REPLACE FUNCTION public.list_establishment(
  p_office_id BIGINT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

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
      e.headquarter,
      e.active,
      e.quarters_address AS "quartersAddress",
      e.gis_group AS "gisGroup",
      e.allowances,
      e.deductions,
      COALESCE((
        SELECT json_agg(pe ORDER BY pe."effectiveDate", pe."createdAt")
        FROM (
          SELECT
            pe.id,
            to_char(pe.effective_date, 'YYYY-MM-DD') AS "effectiveDate",
            pe.basic_pay AS "basicPay",
            pe.pay_scale AS "payScale",
            pe.level_cell AS "levelCell",
            pe.notes,
            pe.created_at AS "createdAt"
          FROM public.establishment_pay_entries pe
          WHERE pe.employee_id = e.id
        ) pe
      ), '[]'::json) AS "payEntries"
    FROM public.establishment_employees e
    WHERE e.office_id = p_office_id
    ORDER BY e.active DESC, e.name, e.hrpn_no NULLS LAST
  ) emp;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- upsert return value delegates to list_establishment, so no separate fix needed,
-- but re-create it to ensure its plan is refreshed after the column fix.
CREATE OR REPLACE FUNCTION public.upsert_establishment_employees(
  p_office_id BIGINT,
  p_employees JSONB
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  r RECORD;
  v_employee_id UUID;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  IF p_employees IS NULL OR p_employees = 'null'::jsonb THEN
    p_employees := '[]'::jsonb;
  END IF;

  DELETE FROM public.establishment_employees
  WHERE office_id = p_office_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_employees) e
      WHERE e->>'id' IS NOT NULL AND e->>'id' <> ''
        AND id::text = e->>'id'
    );

  FOR r IN SELECT * FROM jsonb_to_recordset(p_employees) AS x(
    id TEXT, "hrpnNo" TEXT, name TEXT, designation TEXT, "designationGu" TEXT,
    "cadreClass" TEXT, pan TEXT, "payScale" TEXT, "gradePay" TEXT,
    "payLevel" TEXT, "payCell" TEXT, "ppaNo" TEXT, "joinDate" TEXT,
    "transferDate" TEXT, headquarter TEXT, active BOOLEAN,
    "quartersAddress" TEXT, "gisGroup" TEXT,
    allowances JSONB, deductions JSONB, "payEntries" JSONB
  )
  LOOP
    INSERT INTO public.establishment_employees (
      id, office_id, hrpn_no, name, designation, designation_gu, cadre_class,
      pan, pay_scale, grade_pay, pay_level, pay_cell, ppa_no, join_date,
      transfer_date, headquarter, active, quarters_address, gis_group,
      allowances, deductions, updated_at
    )
    VALUES (
      COALESCE(r.id::uuid, gen_random_uuid()),
      p_office_id,
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
      NULLIF(r.headquarter, ''),
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
      headquarter = EXCLUDED.headquarter,
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
