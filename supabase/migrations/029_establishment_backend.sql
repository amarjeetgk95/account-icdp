-- 029_establishment_backend.sql
-- Establishment module backend: canonical employee register (pay-focused).
--
-- One row per person per office, independent of any bill month.
-- GTR-30 / TDS payroll can later project from this register;
-- legacy masters remain untouched and can be backfilled via RPC.
--
-- Tables:
--   1. establishment_employees      - canonical employee register
--   2. establishment_pay_entries    - dated pay history per employee
--   3. establishment_posts          - sanctioned/filled posts per office
--
-- Backend functions (RPC):
--   list_establishment(p_office_id)                              -> JSON (employees + pay entries)
--   upsert_establishment_employees(p_office_id, p_employees)     -> JSON (wholesale replace)
--   list_establishment_posts(p_office_id)                        -> JSON
--   upsert_establishment_posts(p_office_id, p_posts)             -> JSON (wholesale replace)
--   backfill_establishment_from_gtr30(p_office_id)               -> JSON (one-time seed)

-- =====================================================================
-- 1. Establishment Employees
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.establishment_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  hrpn_no TEXT,
  name TEXT NOT NULL DEFAULT '',
  designation TEXT,
  designation_gu TEXT,
  cadre_class TEXT,
  pan TEXT,
  pay_scale TEXT,
  grade_pay TEXT,
  pay_level TEXT,
  pay_cell TEXT,
  ppa_no TEXT,
  join_date DATE,
  transfer_date DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  quarters_address TEXT,
  gis_group TEXT,
  allowances JSONB NOT NULL DEFAULT '{}'::jsonb,
  deductions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_establishment_employees_office
  ON public.establishment_employees(office_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_establishment_employees_office_hrpn
  ON public.establishment_employees(office_id, hrpn_no)
  WHERE hrpn_no IS NOT NULL AND hrpn_no <> '';

-- =====================================================================
-- 2. Establishment Pay Entries (dated pay history)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.establishment_pay_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.establishment_employees(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  basic_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
  pay_scale TEXT,
  level_cell TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_establishment_pay_entries_employee
  ON public.establishment_pay_entries(employee_id, effective_date);

-- =====================================================================
-- 3. Establishment Posts (મહેકમ માહિતી)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.establishment_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  sr_no INTEGER NOT NULL DEFAULT 0,
  designation TEXT NOT NULL DEFAULT '',
  cadre_class TEXT,
  sanctioned INTEGER NOT NULL DEFAULT 0,
  filled INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_establishment_posts_office
  ON public.establishment_posts(office_id);

-- =====================================================================
-- 4. Row-Level Security
-- =====================================================================
ALTER TABLE public.establishment_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_pay_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'establishment_employees' AND policyname = 'Users can manage establishment employees in their office'
  ) THEN
    CREATE POLICY "Users can manage establishment employees in their office"
      ON public.establishment_employees FOR ALL
      USING (public.can_access_office(office_id))
      WITH CHECK (public.can_access_office(office_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'establishment_employees' AND policyname = 'Admins can manage all establishment employees'
  ) THEN
    CREATE POLICY "Admins can manage all establishment employees"
      ON public.establishment_employees FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'establishment_pay_entries' AND policyname = 'Users can manage establishment pay entries in their office'
  ) THEN
    CREATE POLICY "Users can manage establishment pay entries in their office"
      ON public.establishment_pay_entries FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.establishment_employees e
        WHERE e.id = establishment_pay_entries.employee_id
          AND public.can_access_office(e.office_id)
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.establishment_employees e
        WHERE e.id = establishment_pay_entries.employee_id
          AND public.can_access_office(e.office_id)
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'establishment_posts' AND policyname = 'Users can manage establishment posts in their office'
  ) THEN
    CREATE POLICY "Users can manage establishment posts in their office"
      ON public.establishment_posts FOR ALL
      USING (public.can_access_office(office_id))
      WITH CHECK (public.can_access_office(office_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'establishment_posts' AND policyname = 'Admins can manage all establishment posts'
  ) THEN
    CREATE POLICY "Admins can manage all establishment posts"
      ON public.establishment_posts FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- =====================================================================
-- 5. Backend functions (RPC)
-- =====================================================================
DROP FUNCTION IF EXISTS public.list_establishment(BIGINT);
DROP FUNCTION IF EXISTS public.upsert_establishment_employees(BIGINT, JSONB);
DROP FUNCTION IF EXISTS public.list_establishment_posts(BIGINT);
DROP FUNCTION IF EXISTS public.upsert_establishment_posts(BIGINT, JSONB);
DROP FUNCTION IF EXISTS public.backfill_establishment_from_gtr30(BIGINT);

-- 5.1 List all employees (with pay entries) for an office
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
    WHERE e.office_id = p_office_id
    ORDER BY e.active DESC, e.name, e.hrpn_no NULLS LAST
  ) emp;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.2 Wholesale upsert of employees (rows missing from the payload are removed)
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

  -- Remove employees whose ids are no longer present
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
    "transferDate" TEXT, active BOOLEAN, "quartersAddress" TEXT, "gisGroup" TEXT,
    allowances JSONB, deductions JSONB, "payEntries" JSONB
  )
  LOOP
    INSERT INTO public.establishment_employees (
      id, office_id, hrpn_no, name, designation, designation_gu, cadre_class,
      pan, pay_scale, grade_pay, pay_level, pay_cell, ppa_no, join_date,
      transfer_date, active, quarters_address, gis_group, allowances, deductions, updated_at
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

    -- Replace pay entries for this employee
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

-- 5.3 List posts for an office
CREATE OR REPLACE FUNCTION public.list_establishment_posts(
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
    'id', p.id,
    'srNo', p.sr_no,
    'designation', p.designation,
    'cadreClass', p.cadre_class,
    'sanctioned', p.sanctioned,
    'filled', p.filled
  ) ORDER BY p.sr_no, p.designation), '[]'::json) INTO v_result
  FROM public.establishment_posts p
  WHERE p.office_id = p_office_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.4 Wholesale replace posts for an office
CREATE OR REPLACE FUNCTION public.upsert_establishment_posts(
  p_office_id BIGINT,
  p_posts JSONB
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  IF p_posts IS NULL OR p_posts = 'null'::jsonb THEN
    p_posts := '[]'::jsonb;
  END IF;

  DELETE FROM public.establishment_posts
  WHERE office_id = p_office_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_posts) e
      WHERE e->>'id' IS NOT NULL AND e->>'id' <> ''
        AND id::text = e->>'id'
    );

  INSERT INTO public.establishment_posts (
    id, office_id, sr_no, designation, cadre_class, sanctioned, filled, updated_at
  )
  SELECT
    COALESCE(r.id::uuid, gen_random_uuid()),
    p_office_id,
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
  FROM public.establishment_posts p
  WHERE p.office_id = p_office_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.5 Backfill from GTR-30 employee master (one-time seed per office)
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

  INSERT INTO public.establishment_employees (
    id, office_id, hrpn_no, name, designation, pay_scale, allowances, active, updated_at
  )
  SELECT
    gen_random_uuid(),
    p_office_id,
    NULLIF(latest.hrpn_no, ''),
    COALESCE(latest.name, ''),
    latest.designation,
    latest.pay_scale,
    jsonb_build_object(
      'hraPercent', COALESCE(latest.hra_percent, 0),
      'transportAllowance', COALESCE(latest.transport_allowance, 0),
      'medicalAllowance', COALESCE(latest.medical_allowance, 0),
      'claAllowance', COALESCE(latest.cla_allowance, 0)
    ),
    TRUE,
    NOW()
  FROM (
    SELECT DISTINCT ON (COALESCE(NULLIF(m.hrpn_no, ''), lower(m.name)))
      m.hrpn_no, m.name, m.designation, m.pay_scale,
      m.hra_percent, m.transport_allowance, m.medical_allowance, m.cla_allowance,
      m.month_key
    FROM public.gtr30_employee_master m
    WHERE m.office_id = p_office_id
      AND COALESCE(NULLIF(m.hrpn_no, ''), lower(m.name)) IS NOT NULL
    ORDER BY COALESCE(NULLIF(m.hrpn_no, ''), lower(m.name)), m.month_key DESC
  ) latest
  WHERE NOT EXISTS (
    SELECT 1 FROM public.establishment_employees e
    WHERE e.office_id = p_office_id
      AND COALESCE(NULLIF(e.hrpn_no, ''), lower(e.name)) = COALESCE(NULLIF(latest.hrpn_no, ''), lower(latest.name))
  );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Seed a pay entry (current pay + date) for employees that don't have one yet
  WITH seed AS (
    SELECT DISTINCT ON (COALESCE(NULLIF(m.hrpn_no, ''), lower(m.name)))
      e.id AS employee_id,
      m.current_pay,
      m.current_pay_date,
      m.month_key
    FROM public.gtr30_employee_master m
    JOIN public.establishment_employees e
      ON e.office_id = p_office_id
     AND COALESCE(NULLIF(e.hrpn_no, ''), lower(e.name)) = COALESCE(NULLIF(m.hrpn_no, ''), lower(m.name))
    WHERE m.office_id = p_office_id
    ORDER BY COALESCE(NULLIF(m.hrpn_no, ''), lower(m.name)), m.month_key DESC
  )
  INSERT INTO public.establishment_pay_entries (
    employee_id, effective_date, basic_pay, pay_scale
  )
  SELECT
    s.employee_id,
    COALESCE(s.current_pay_date, CURRENT_DATE),
    COALESCE(s.current_pay, 0),
    NULL
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
