-- 034_establishment_budget_head.sql
-- Transfer Budget Head Tag section from TDS Payroll to Establishment:
-- add budget_head_id to the establishment register and wire it through
-- list / upsert / backfill so the payroll classification moves with the employee.

ALTER TABLE public.establishment_employees
  ADD COLUMN IF NOT EXISTS budget_head_id BIGINT REFERENCES public.budget_heads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_establishment_employees_budget_head
  ON public.establishment_employees(budget_head_id);

-- Re-create list_establishment to include the new column
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
      CASE WHEN e.budget_head_id IS NULL THEN '' ELSE e.budget_head_id::text END AS "budgetHeadId",
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

-- Re-create upsert to persist budget_head_id
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
    "transferDate" TEXT, headquarter TEXT, "budgetHeadId" TEXT, active BOOLEAN,
    "quartersAddress" TEXT, "gisGroup" TEXT,
    allowances JSONB, deductions JSONB, "payEntries" JSONB
  )
  LOOP
    INSERT INTO public.establishment_employees (
      id, office_id, hrpn_no, name, designation, designation_gu, cadre_class,
      pan, pay_scale, grade_pay, pay_level, pay_cell, ppa_no, join_date,
      transfer_date, headquarter, budget_head_id, active, quarters_address, gis_group,
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
      CASE WHEN r."budgetHeadId" IS NULL OR r."budgetHeadId" = '' THEN NULL ELSE r."budgetHeadId"::bigint END,
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
      budget_head_id = EXCLUDED.budget_head_id,
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

-- Enrich payroll backfill to copy the budget head assignment
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
    SELECT e.* FROM public.employees e WHERE e.office_id::text = p_office_id::text;

  INSERT INTO public.establishment_employees (
    id, office_id, hrpn_no, name, designation, pay_scale, pan,
    join_date, transfer_date, budget_head_id, active, updated_at
  )
  SELECT
    gen_random_uuid(), p_office_id,
    NULLIF(s.hprn_no, ''), COALESCE(s.name, ''), s.designation, s.pay_scale,
    NULLIF(s.pan, ''), s.join_date, s.transfer_date, s.budget_head_id, TRUE, NOW()
  FROM _est_payroll_src s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.establishment_employees est
    WHERE est.office_id = p_office_id AND (
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
    budget_head_id = COALESCE(est.budget_head_id, s.budget_head_id),
    active = CASE WHEN s.transfer_date IS NULL THEN est.active ELSE FALSE END,
    updated_at = NOW()
  FROM _est_payroll_src s
  WHERE est.office_id = p_office_id AND (
    (COALESCE(NULLIF(s.hprn_no, ''), '') <> '' AND est.hrpn_no = s.hprn_no)
    OR (COALESCE(NULLIF(s.pan, ''), '') <> '' AND est.pan = s.pan)
    OR ((s.hprn_no IS NULL OR s.hprn_no = '') AND lower(est.name) = lower(s.name))
  );
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  DROP TABLE IF EXISTS _est_payroll_src;

  SELECT COALESCE(json_agg(emp), '[]'::json) INTO v_result FROM (
    SELECT est.id, est.name, est.hrpn_no AS "hrpnNo", est.pan
    FROM public.establishment_employees est WHERE est.office_id = p_office_id ORDER BY est.name
  ) emp;

  RETURN json_build_object('inserted', v_inserted, 'updated', v_updated, 'total', COALESCE(json_array_length(v_result), 0), 'employees', v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Make GTR-30 backfill also preserve the column (it does not overwrite existing assignment)
-- No schema change needed there; it already uses COALESCE for existing rows only on the
-- fields it manages. Budget head remains as-is for GTR-30 imports.
