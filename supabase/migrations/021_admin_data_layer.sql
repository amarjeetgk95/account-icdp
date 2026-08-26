-- ============================================================================
-- 021_admin_data_layer.sql
-- ----------------------------------------------------------------------------
-- Admin data layer for the ICDP Tax System.
--
-- Adds an admin-only import-health overview (salary + paybill pipelines), a
-- per-office configuration/read RPC, a financial-year setter backed by
-- app_config, and a full CRUD surface for the shared payroll component master
-- (payroll_components + payroll_component_aliases). It also extends the two
-- existing consolidated aggregates (get_system_stats, admin_data_entry_report)
-- with paybill/salary import metrics — ADDITIVE ONLY: every pre-existing key is
-- preserved unchanged and the new keys are appended.
--
-- Conventions (mirror 013_admin_consolidation.sql):
--   * Every RPC is CREATE OR REPLACE FUNCTION ... RETURNS json
--   * SECURITY DEFINER with SET search_path = public
--   * Guarded by public.is_admin()
--   * Write operations audit through public.admin_log(...)
--   * GRANT EXECUTE ... TO authenticated per function
--
-- This migration is idempotent and safe to run repeatedly.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. IMPORT HEALTH — one row per office that has any import data
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_import_health()
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH salary_agg AS (
      SELECT office_id,
             COUNT(*)::int AS salary_imports,
             COALESCE(SUM(total_records), 0)::int AS salary_total_records,
             COALESCE(SUM(matched_count), 0)::int AS salary_matched_count,
             MAX(created_at) AS last_salary_activity
      FROM public.salary_imports
      GROUP BY office_id
    ), paybill_agg AS (
      SELECT office_id,
             COUNT(*)::int AS paybill_imports,
             COALESCE(SUM(total_records), 0)::int AS paybill_total_records,
             COALESCE(SUM(matched_count), 0)::int AS paybill_matched_count,
             MAX(created_at) AS last_paybill_activity
      FROM public.paybill_imports
      GROUP BY office_id
    ), earnings_agg AS (
      SELECT office_id,
             COUNT(*)::int AS earnings_rows,
             COUNT(*) FILTER (WHERE mapping_status <> 'MATCHED')::int AS earnings_mapping_issues,
             COUNT(*) FILTER (WHERE name_mismatch)::int AS earnings_name_mismatches,
             COUNT(*) FILTER (
               WHERE validation_status = 'error'
                  OR jsonb_array_length(COALESCE(errors, '[]'::jsonb)) > 0
             )::int AS earnings_validation_errors
      FROM public.paybill_employee_earnings
      GROUP BY office_id
    ), deduction_agg AS (
      SELECT office_id,
             COUNT(*)::int AS deduction_rows,
             COUNT(*) FILTER (WHERE mapping_status <> 'MATCHED')::int AS deduction_mapping_issues,
             COUNT(*) FILTER (WHERE name_mismatch)::int AS deduction_name_mismatches,
             COUNT(*) FILTER (
               WHERE validation_status = 'error'
                  OR jsonb_array_length(COALESCE(errors, '[]'::jsonb)) > 0
             )::int AS deduction_validation_errors
      FROM public.paybill_employee_deductions
      GROUP BY office_id
    )
    SELECT COALESCE(json_agg(
      json_build_object(
        'office_id', o.id,
        'office_name', o.name,
        'fy', (
          SELECT value::integer FROM public.app_config
          WHERE key = 'currentFY' AND office_id = o.id LIMIT 1
        ),
        'salary_imports', COALESCE(sa.salary_imports, 0),
        'salary_total_records', COALESCE(sa.salary_total_records, 0),
        'salary_matched_count', COALESCE(sa.salary_matched_count, 0),
        'paybill_imports', COALESCE(pb.paybill_imports, 0),
        'paybill_total_records', COALESCE(pb.paybill_total_records, 0),
        'paybill_matched_count', COALESCE(pb.paybill_matched_count, 0),
        'earnings_rows', COALESCE(ea.earnings_rows, 0),
        'deduction_rows', COALESCE(da.deduction_rows, 0),
        'mapping_issues', COALESCE(ea.earnings_mapping_issues, 0) + COALESCE(da.deduction_mapping_issues, 0),
        'name_mismatches', COALESCE(ea.earnings_name_mismatches, 0) + COALESCE(da.deduction_name_mismatches, 0),
        'validation_errors', COALESCE(ea.earnings_validation_errors, 0) + COALESCE(da.deduction_validation_errors, 0),
        'last_activity', GREATEST(sa.last_salary_activity, pb.last_paybill_activity)
      )
      ORDER BY o.name
    ), '[]'::json)
    FROM public.offices o
    LEFT JOIN salary_agg sa ON sa.office_id = o.id
    LEFT JOIN paybill_agg pb ON pb.office_id = o.id
    LEFT JOIN earnings_agg ea ON ea.office_id = o.id
    LEFT JOIN deduction_agg da ON da.office_id = o.id
    WHERE sa.office_id IS NOT NULL
       OR pb.office_id IS NOT NULL
       OR ea.office_id IS NOT NULL
       OR da.office_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_import_health() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. OFFICE CONFIG — per-office read of FY, financial years, users, employees
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_office_config(target_office_id bigint)
RETURNS json AS $$
DECLARE
  result json;
  v_exists boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.offices WHERE id = target_office_id) INTO v_exists;
  IF NOT v_exists THEN
    RETURN json_build_object('error', 'Office not found');
  END IF;

  SELECT json_build_object(
    'office_id', o.id,
    'office_name', o.name,
    'district', o.district,
    'current_fy', (
      SELECT value::integer FROM public.app_config
      WHERE key = 'currentFY' AND office_id = o.id LIMIT 1
    ),
    'financial_years', (
      SELECT COALESCE(json_agg(y ORDER BY y DESC), '[]'::json)
      FROM (
        SELECT s.financial_year AS y
        FROM public.employee_salaries s
        WHERE s.office_id = o.id
        UNION
        SELECT p.financial_year
        FROM public.paybill_imports p
        WHERE p.office_id = o.id
      ) yrs
    ),
    'users', (SELECT COUNT(*)::int FROM public.profiles pr WHERE pr.office_id = o.id),
    'employees', (SELECT COUNT(*)::int FROM public.employees e WHERE e.office_id = o.id)
  ) INTO result
  FROM public.offices o
  WHERE o.id = target_office_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_office_config(bigint) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. SET OFFICE FY — upsert currentFY into app_config for one office
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_office_fy(target_office_id bigint, fy integer)
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF fy < 2000 OR fy > 2100 THEN
    RAISE EXCEPTION 'Financial year must be between 2000 and 2100';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.offices WHERE id = target_office_id) THEN
    RAISE EXCEPTION 'Office not found';
  END IF;

  INSERT INTO public.app_config (office_id, key, value)
  SELECT o.id, 'currentFY', fy::text
  FROM public.offices o
  WHERE o.id = target_office_id
  ON CONFLICT (office_id, key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW();

  PERFORM public.admin_log(
    'set_office_fy',
    NULL,
    jsonb_build_object('office_id', target_office_id, 'fy', fy)
  );

  RETURN json_build_object('office_id', target_office_id, 'fy', fy);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_set_office_fy(bigint, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. COMPONENT LIST — all payroll_components with nested aliases (single query)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_component_list()
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', c.id,
        'component_code', c.component_code,
        'component_name', c.component_name,
        'short_name', c.short_name,
        'type', c.type,
        'kind', c.kind,
        'category', c.category,
        'sub_category', c.sub_category,
        'active', c.active,
        'display_order', c.display_order,
        'is_mandatory', c.is_mandatory,
        'is_total_field', c.is_total_field,
        'is_system_generated', c.is_system_generated,
        'validation_rule', c.validation_rule,
        'notes', c.notes,
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'aliases', COALESCE((
          SELECT json_agg(json_build_object(
            'id', a.id,
            'alias_text', a.alias_text,
            'alias_type', a.alias_type,
            'created_at', a.created_at
          ))
          FROM public.payroll_component_aliases a
          WHERE a.component_id = c.id
        ), '[]'::json)
      )
      ORDER BY c.display_order, c.component_name
    ), '[]'::json)
    FROM public.payroll_components c
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_component_list() TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. COMPONENT SAVE — upsert a component + replace its aliases
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_component_save(component jsonb)
RETURNS json AS $$
DECLARE
  v_id uuid;
  v_component_code text;
  v_component_name text;
  v_short_name text;
  v_type text;
  v_kind text;
  v_category text;
  v_sub_category text;
  v_active boolean;
  v_display_order integer;
  v_is_mandatory boolean;
  v_is_total_field boolean;
  v_is_system_generated boolean;
  v_validation_rule jsonb;
  v_notes text;
  v_alias jsonb;
  v_alias_text text;
  v_alias_type text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  v_component_name := nullif(trim(COALESCE(component->>'component_name', '')), '');
  IF v_component_name IS NULL THEN
    RAISE EXCEPTION 'Component name is required';
  END IF;

  v_type := COALESCE(component->>'type', '');
  IF v_type NOT IN ('EARNING', 'DEDUCTION') THEN
    RAISE EXCEPTION 'Component type must be EARNING or DEDUCTION';
  END IF;

  v_kind := COALESCE(component->>'kind', 'COMPONENT');
  IF v_kind NOT IN ('COMPONENT', 'TOTAL', 'NET_PAY') THEN
    RAISE EXCEPTION 'Component kind must be COMPONENT, TOTAL or NET_PAY';
  END IF;

  v_id := nullif(component->>'id', '');
  v_component_code := nullif(component->>'component_code', '');
  v_short_name := nullif(component->>'short_name', '');
  v_category := nullif(component->>'category', '');
  v_sub_category := nullif(component->>'sub_category', '');
  v_active := COALESCE((component->>'active')::boolean, false);
  v_display_order := COALESCE((component->>'display_order')::integer, 0);
  v_is_mandatory := COALESCE((component->>'is_mandatory')::boolean, false);
  v_is_total_field := COALESCE((component->>'is_total_field')::boolean, false);
  v_is_system_generated := COALESCE((component->>'is_system_generated')::boolean, false);
  v_validation_rule := component->'validation_rule';
  v_notes := nullif(component->>'notes', '');

  IF v_id IS NOT NULL THEN
    UPDATE public.payroll_components
    SET component_code = v_component_code,
        component_name = v_component_name,
        short_name = v_short_name,
        type = v_type,
        kind = v_kind,
        category = v_category,
        sub_category = v_sub_category,
        active = v_active,
        display_order = v_display_order,
        is_mandatory = v_is_mandatory,
        is_total_field = v_is_total_field,
        is_system_generated = v_is_system_generated,
        validation_rule = v_validation_rule,
        notes = v_notes,
        updated_at = NOW()
    WHERE id = v_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Component not found';
    END IF;
  ELSE
    INSERT INTO public.payroll_components (
      component_code, component_name, short_name, type, kind, category, sub_category,
      active, display_order, is_mandatory, is_total_field, is_system_generated,
      validation_rule, notes
    )
    VALUES (
      v_component_code, v_component_name, v_short_name, v_type, v_kind, v_category, v_sub_category,
      v_active, v_display_order, v_is_mandatory, v_is_total_field, v_is_system_generated,
      v_validation_rule, v_notes
    )
    RETURNING id INTO v_id;
  END IF;

  DELETE FROM public.payroll_component_aliases WHERE component_id = v_id;

  IF COALESCE(jsonb_typeof(component->'aliases'), 'null') = 'array' THEN
    FOR v_alias IN SELECT * FROM jsonb_array_elements(component->'aliases') LOOP
      v_alias_text := nullif(trim(COALESCE(v_alias->>'alias_text', '')), '');
      IF v_alias_text IS NOT NULL THEN
        v_alias_type := COALESCE(v_alias->>'alias_type', 'HEADER');
        IF v_alias_type NOT IN ('HEADER', 'CODE') THEN
          v_alias_type := 'HEADER';
        END IF;
        INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type)
        VALUES (v_id, v_alias_text, v_alias_type);
      END IF;
    END LOOP;
  END IF;

  PERFORM public.admin_log(
    'component_save',
    NULL,
    jsonb_build_object('component_id', v_id, 'component_code', v_component_code, 'component_name', v_component_name)
  );

  RETURN (
    SELECT json_build_object(
      'id', c.id,
      'component_code', c.component_code,
      'component_name', c.component_name,
      'short_name', c.short_name,
      'type', c.type,
      'kind', c.kind,
      'category', c.category,
      'sub_category', c.sub_category,
      'active', c.active,
      'display_order', c.display_order,
      'is_mandatory', c.is_mandatory,
      'is_total_field', c.is_total_field,
      'is_system_generated', c.is_system_generated,
      'validation_rule', c.validation_rule,
      'notes', c.notes,
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'aliases', COALESCE((
        SELECT json_agg(json_build_object(
          'id', a.id,
          'alias_text', a.alias_text,
          'alias_type', a.alias_type,
          'created_at', a.created_at
        ))
        FROM public.payroll_component_aliases a
        WHERE a.component_id = c.id
      ), '[]'::json)
    )
    FROM public.payroll_components c
    WHERE c.id = v_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_component_save(jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. COMPONENT SET ACTIVE — enable/disable a component
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_component_set_active(component_id uuid, active boolean)
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  -- NOTE: use positional params ($1/$2); the bare names would resolve to the
  -- table columns (PL/pgSQL gives column names precedence over variables).
  UPDATE public.payroll_components
  SET active = COALESCE($2, false), updated_at = NOW()
  WHERE id = $1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Component not found';
  END IF;

  PERFORM public.admin_log(
    'component_set_active',
    NULL,
    jsonb_build_object('component_id', $1, 'active', COALESCE($2, false))
  );

  RETURN json_build_object('id', $1, 'active', COALESCE($2, false));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_component_set_active(uuid, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. COMPONENT DELETE — guarded against historical references
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_component_delete(component_id uuid)
RETURNS json AS $$
DECLARE
  v_referenced boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  -- NOTE: use positional param $1; the bare name would resolve to the table
  -- column (PL/pgSQL gives column names precedence over variables).
  SELECT EXISTS(
    SELECT 1 FROM public.paybill_employee_components
    WHERE component_id = $1
    LIMIT 1
  ) INTO v_referenced;

  IF v_referenced THEN
    RETURN json_build_object(
      'deleted', false,
      'reason', 'This component is referenced by historical payroll data. Deactivate it instead of deleting.'
    );
  END IF;

  DELETE FROM public.payroll_component_aliases WHERE component_id = $1;
  DELETE FROM public.payroll_components WHERE id = $1;

  PERFORM public.admin_log(
    'component_delete',
    NULL,
    jsonb_build_object('component_id', $1)
  );

  RETURN json_build_object('deleted', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_component_delete(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. EXTENDED AGGREGATES (ADDITIVE ONLY — existing keys preserved)
-- ---------------------------------------------------------------------------
-- 8.1 System stats + salary/paybill import counts + paybill unmatched rows
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT json_build_object(
      'users', (SELECT COUNT(*) FROM public.profiles),
      'admins', (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin'),
      'suspended', (SELECT COUNT(*) FROM public.profiles WHERE suspended),
      'offices', (SELECT COUNT(*) FROM public.offices),
      'fy', (SELECT COALESCE(
        (SELECT value::integer FROM public.app_config WHERE key = 'currentFY' LIMIT 1),
        CASE WHEN EXTRACT(MONTH FROM NOW()) >= 3 THEN EXTRACT(YEAR FROM NOW())::integer
             ELSE EXTRACT(YEAR FROM NOW())::integer - 1 END)),
      'employees', (SELECT COUNT(*) FROM public.employees),
      'salaries', (SELECT COUNT(*) FROM public.employee_salaries),
      'parties', (SELECT COUNT(*) FROM public.parties),
      'transactions', (SELECT COUNT(*) FROM public.party_transactions),
      'officeName', (SELECT office_name FROM public.office_details WHERE office_id = public.current_office_id() LIMIT 1),
      'salary_imports', (SELECT COUNT(*)::int FROM public.salary_imports),
      'paybill_imports', (SELECT COUNT(*)::int FROM public.paybill_imports),
      'paybill_unmatched', (
        SELECT COUNT(*)::int
        FROM (
          SELECT 1 FROM public.paybill_employee_earnings WHERE mapping_status <> 'MATCHED'
          UNION ALL
          SELECT 1 FROM public.paybill_employee_deductions WHERE mapping_status <> 'MATCHED'
        ) unmatched
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_system_stats() TO authenticated;

-- 8.2 Data entry report + paybill import metrics per office row
CREATE OR REPLACE FUNCTION public.admin_data_entry_report()
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH salary_agg AS (
      SELECT office_id,
             COUNT(*) AS salary_records,
             COALESCE(SUM(gross), 0) AS total_gross,
             COALESCE(SUM(da), 0) AS total_da,
             COALESCE(SUM(tax), 0) AS total_tax,
             MAX(updated_at) AS last_salary_activity
      FROM public.employee_salaries
      GROUP BY office_id
    ), transaction_agg AS (
      SELECT office_id,
             COUNT(*) AS transactions,
             COALESCE(SUM(amount), 0) AS total_amount,
             COALESCE(SUM(total_gst), 0) AS total_gst,
             COALESCE(SUM(income_tax), 0) AS total_income_tax,
             MAX(updated_at) AS last_transaction_activity
      FROM public.party_transactions
      GROUP BY office_id
    ), office_emp AS (
      SELECT office_id, COUNT(*) AS c FROM public.employees GROUP BY office_id
    ), office_party AS (
      SELECT office_id, COUNT(*) AS c FROM public.parties GROUP BY office_id
    ), paybill_agg AS (
      SELECT office_id,
             COUNT(*)::int AS paybill_imports,
             COALESCE(SUM(total_records), 0)::int AS paybill_total_records,
             COALESCE(SUM(matched_count), 0)::int AS paybill_matched_count
      FROM public.paybill_imports
      GROUP BY office_id
    ), issues_agg AS (
      SELECT office_id,
             COUNT(*) FILTER (WHERE mapping_status <> 'MATCHED')::int AS mapping_issues
      FROM (
        SELECT office_id, mapping_status FROM public.paybill_employee_earnings
        UNION ALL
        SELECT office_id, mapping_status FROM public.paybill_employee_deductions
      ) all_rows
      GROUP BY office_id
    )
    SELECT COALESCE(json_agg(
      json_build_object(
        'office_id', o.id,
        'office_name', o.name,
        'user_email', (SELECT u.email FROM public.profiles p
                       JOIN auth.users u ON u.id = p.id
                       WHERE p.office_id = o.id ORDER BY p.created_at LIMIT 1),
        'current_fy', (SELECT value FROM public.app_config WHERE key = 'currentFY' AND office_id = o.id LIMIT 1),
        'employees', COALESCE(oe.c, 0),
        'salary_records', COALESCE(sa.salary_records, 0),
        'total_gross', COALESCE(sa.total_gross, 0),
        'total_da', COALESCE(sa.total_da, 0),
        'total_tax', COALESCE(sa.total_tax, 0),
        'vendors', COALESCE(op.c, 0),
        'transactions', COALESCE(ta.transactions, 0),
        'total_amount', COALESCE(ta.total_amount, 0),
        'total_gst', COALESCE(ta.total_gst, 0),
        'total_income_tax', COALESCE(ta.total_income_tax, 0),
        'paybill_imports', COALESCE(pb.paybill_imports, 0),
        'paybill_total_records', COALESCE(pb.paybill_total_records, 0),
        'paybill_matched_count', COALESCE(pb.paybill_matched_count, 0),
        'mapping_issues', COALESCE(ia.mapping_issues, 0),
        'last_activity', GREATEST(
          COALESCE(sa.last_salary_activity, '1970-01-01'::timestamptz),
          COALESCE(ta.last_transaction_activity, '1970-01-01'::timestamptz)
        )
      )
      ORDER BY o.name
    ), '[]'::json)
    FROM public.offices o
    LEFT JOIN salary_agg sa ON sa.office_id = o.id
    LEFT JOIN transaction_agg ta ON ta.office_id = o.id
    LEFT JOIN office_emp oe ON oe.office_id = o.id
    LEFT JOIN office_party op ON op.office_id = o.id
    LEFT JOIN paybill_agg pb ON pb.office_id = o.id
    LEFT JOIN issues_agg ia ON ia.office_id = o.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_data_entry_report() TO authenticated;

COMMIT;
