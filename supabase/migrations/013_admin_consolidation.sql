-- ============================================================================
-- ICDP Tax System — Admin Module Consolidation
-- ----------------------------------------------------------------------------
-- Single source of truth for ALL admin RPCs. Matches the LIVE schema shape:
--   * bigint office_id
--   * email sourced from auth.users (profiles has no email column)
--   * app_config key 'currentFY' (offices has no current_fy column)
-- Supersedes the admin function definitions previously split across
-- 003_admin_functions.sql, 004_admin_overhaul.sql and remediation.sql §5.
--
-- This migration is idempotent and safe to run repeatedly.
--   Fresh environments : `supabase db push` (or run in SQL Editor)
--   Existing live DB   : run in Supabase Dashboard -> SQL Editor
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. PROFILES — non-destructive user suspension
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 2. RLS HELPERS — suspended accounts are denied data access at the policy level
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.can_access_office(bigint);
DROP FUNCTION IF EXISTS public.can_access_office(uuid);
DROP FUNCTION IF EXISTS public.current_office_id();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT COALESCE(role = 'admin', false) AND COALESCE(suspended = false, true)
     FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.current_office_id()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT office_id FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.can_access_office(target_office_id bigint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT COALESCE(
       (role = 'admin' AND suspended = false) OR (office_id = target_office_id AND suspended = false),
       false)
     FROM public.profiles WHERE id = auth.uid() $$;

-- ---------------------------------------------------------------------------
-- 3. AUDIT LOG TABLE + HELPER
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID,
  admin_email TEXT,
  action TEXT NOT NULL,
  target_email TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_admin_select" ON public.admin_audit_log;
CREATE POLICY "audit_admin_select" ON public.admin_audit_log FOR SELECT USING (public.is_admin());
GRANT SELECT, INSERT ON TABLE public.admin_audit_log TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_log(
  action TEXT,
  target_email TEXT DEFAULT NULL,
  details JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_email, details)
  SELECT auth.uid(),
         (SELECT email FROM auth.users WHERE id = auth.uid()),
         action, target_email, details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 4. ADMIN RPCs — one canonical definition per function
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_list_users();
DROP FUNCTION IF EXISTS public.admin_set_role(uuid, text, bigint);
DROP FUNCTION IF EXISTS public.admin_set_role(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid);
DROP FUNCTION IF EXISTS public."admin_deleteUser"(uuid);
DROP FUNCTION IF EXISTS public.admin_list_offices();
DROP FUNCTION IF EXISTS public.admin_create_office(text, text);
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, bigint);
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, uuid);
DROP FUNCTION IF EXISTS public.admin_invite_user(text, text, bigint);
DROP FUNCTION IF EXISTS public.admin_invite_user(text, text, uuid);
DROP FUNCTION IF EXISTS public.get_system_stats();
DROP FUNCTION IF EXISTS public.admin_office_stats();
DROP FUNCTION IF EXISTS public.admin_data_entry_report();
DROP FUNCTION IF EXISTS public.admin_entry_completion();
DROP FUNCTION IF EXISTS public.admin_office_financial_years(bigint);
DROP FUNCTION IF EXISTS public.admin_office_financial_years(uuid);
DROP FUNCTION IF EXISTS public.admin_audit_list(integer);
DROP FUNCTION IF EXISTS public.admin_audit_list(integer, integer);
DROP FUNCTION IF EXISTS public.admin_set_user_status(uuid, boolean);
DROP FUNCTION IF EXISTS public.admin_update_office(bigint, text, text);

-- 4.1 List users (email + suspension status from auth.users / profiles)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS json AS $$
DECLARE result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object(
      'id', p.id,
      'email', u.email,
      'role', p.role,
      'office_id', p.office_id,
      'office_name', o.name,
      'suspended', p.suspended,
      'created_at', p.created_at,
      'last_sign_in_at', u.last_sign_in_at
    )
    ORDER BY p.created_at DESC
  ), '[]'::json) INTO result
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.offices o ON o.id = p.office_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.2 Set user role / office
CREATE OR REPLACE FUNCTION public.admin_set_role(user_id uuid, new_role text, new_office_id bigint)
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF new_role NOT IN ('admin', 'office') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  IF user_id = auth.uid() AND new_role = 'office' THEN
    RAISE EXCEPTION 'Admins cannot demote themselves';
  END IF;

  UPDATE public.profiles
  SET role = new_role, office_id = new_office_id, updated_at = NOW()
  WHERE id = user_id;

  PERFORM public.admin_log(
    'user.role_changed',
    (SELECT email FROM auth.users WHERE id = user_id),
    jsonb_build_object('role', new_role, 'office_id', new_office_id)
  );

  RETURN json_build_object('message', 'Role updated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.3 Delete user
CREATE OR REPLACE FUNCTION public.admin_delete_user(user_id uuid)
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;

  PERFORM public.admin_log(
    'user.deleted',
    (SELECT email FROM auth.users WHERE id = user_id)
  );

  DELETE FROM public.profiles WHERE id = user_id;
  DELETE FROM auth.users WHERE id = user_id;

  RETURN json_build_object('message', 'User deleted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.4 List offices (users + suspended users counts)
CREATE OR REPLACE FUNCTION public.admin_list_offices()
RETURNS json AS $$
DECLARE result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object(
      'id', o.id,
      'name', o.name,
      'district', o.district,
      'current_fy', (
        SELECT value::integer FROM public.app_config
        WHERE key = 'currentFY' AND office_id = o.id LIMIT 1
      ),
      'users', (SELECT COUNT(*) FROM public.profiles p WHERE p.office_id = o.id),
      'suspended_users', (SELECT COUNT(*) FROM public.profiles p WHERE p.office_id = o.id AND p.suspended)
    )
    ORDER BY o.name
  ), '[]'::json) INTO result
  FROM public.offices o;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.5 Create office
CREATE OR REPLACE FUNCTION public.admin_create_office(office_name text, office_district text)
RETURNS json AS $$
DECLARE new_office_id bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF office_name IS NULL OR length(trim(office_name)) < 2 THEN
    RAISE EXCEPTION 'Office name must be at least 2 characters';
  END IF;

  INSERT INTO public.offices (name, district)
  VALUES (trim(office_name), office_district)
  RETURNING id INTO new_office_id;

  INSERT INTO public.office_details (office_id, office_name)
  VALUES (new_office_id, trim(office_name));

  PERFORM public.admin_log(
    'office.created',
    NULL,
    jsonb_build_object('office', trim(office_name), 'office_id', new_office_id)
  );

  RETURN json_build_object('id', new_office_id, 'name', trim(office_name), 'district', office_district, 'users', 0, 'suspended_users', 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.6 Update office (rename / district)
CREATE OR REPLACE FUNCTION public.admin_update_office(office_id bigint, office_name text, office_district text)
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF office_name IS NULL OR length(trim(office_name)) < 2 THEN
    RAISE EXCEPTION 'Office name must be at least 2 characters';
  END IF;

  UPDATE public.offices
  SET name = trim(office_name), district = office_district, updated_at = NOW()
  WHERE id = office_id;

  UPDATE public.office_details
  SET office_name = trim(office_name), updated_at = NOW()
  WHERE office_id = office_id;

  PERFORM public.admin_log(
    'office.updated',
    NULL,
    jsonb_build_object('office_id', office_id, 'office_name', trim(office_name), 'district', office_district)
  );

  RETURN json_build_object('message', 'Office updated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.7 Create user (with password)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email text, user_password text, user_role text, user_office_id bigint
)
RETURNS json AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF user_role NOT IN ('admin', 'office') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  new_id := gen_random_uuid();
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, email_change_token_current, reauthentication_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    user_email, extensions.crypt(user_password, extensions.gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('email_verified', true), now(), now(),
    '', '', '', '', '', ''
  );
  INSERT INTO public.profiles (id, role, office_id, suspended)
  VALUES (new_id, user_role, user_office_id, false);

  PERFORM public.admin_log(
    'user.created',
    user_email,
    jsonb_build_object('role', user_role, 'office_id', user_office_id)
  );

  RETURN json_build_object('message', 'User created successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.8 Invite user (no password; user sets their own via forgot-password)
CREATE OR REPLACE FUNCTION public.admin_invite_user(
  user_email text, user_role text, user_office_id bigint
)
RETURNS json AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF user_role NOT IN ('admin', 'office') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  new_id := gen_random_uuid();
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, email_change_token_current, reauthentication_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    user_email, '', NULL,
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('email_verified', false), now(), now(),
    '', '', '', '', '', ''
  );
  INSERT INTO public.profiles (id, role, office_id, suspended)
  VALUES (new_id, user_role, user_office_id, false);

  PERFORM public.admin_log(
    'user.invited',
    user_email,
    jsonb_build_object('role', user_role, 'office_id', user_office_id)
  );

  RETURN json_build_object('message', 'Invitation created successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.9 Set user status (suspend / activate). Non-destructive account lock.
CREATE OR REPLACE FUNCTION public.admin_set_user_status(user_id uuid, p_suspended boolean)
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot suspend your own account';
  END IF;

  UPDATE public.profiles
  SET suspended = COALESCE(p_suspended, false), updated_at = NOW()
  WHERE id = user_id;

  PERFORM public.admin_log(
    CASE WHEN p_suspended THEN 'user.suspended' ELSE 'user.activated' END,
    (SELECT email FROM auth.users WHERE id = user_id)
  );

  RETURN json_build_object('message', CASE WHEN p_suspended THEN 'User suspended' ELSE 'User activated' END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 5. SYSTEM WIDE AGGREGATES (single-pass, GROUP BY CTEs)
-- ---------------------------------------------------------------------------

-- 5.1 System stats
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
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
      'officeName', (SELECT office_name FROM public.office_details WHERE office_id = public.current_office_id() LIMIT 1)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.2 Office stats (single-pass grouped aggregates, no per-row subqueries)
CREATE OR REPLACE FUNCTION public.admin_office_stats()
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN (
    WITH employees AS (
      SELECT office_id, COUNT(*) AS c FROM public.employees GROUP BY office_id
    ), salaries AS (
      SELECT office_id, COUNT(*) AS c FROM public.employee_salaries GROUP BY office_id
    ), parties AS (
      SELECT office_id, COUNT(*) AS c FROM public.parties GROUP BY office_id
    ), transactions AS (
      SELECT office_id, COUNT(*) AS c FROM public.party_transactions GROUP BY office_id
    ), users AS (
      SELECT office_id, COUNT(*) AS c FROM public.profiles WHERE office_id IS NOT NULL GROUP BY office_id
    )
    SELECT COALESCE(json_agg(
      json_build_object(
        'office_id', o.id,
        'office_name', o.name,
        'employees', COALESCE(emp.c, 0),
        'salaries', COALESCE(sal.c, 0),
        'parties', COALESCE(par.c, 0),
        'transactions', COALESCE(trn.c, 0),
        'users', COALESCE(usr.c, 0)
      )
      ORDER BY o.name
    ), '[]'::json)
    FROM public.offices o
    LEFT JOIN employees emp ON emp.office_id = o.id
    LEFT JOIN salaries sal ON sal.office_id = o.id
    LEFT JOIN parties par ON par.office_id = o.id
    LEFT JOIN transactions trn ON trn.office_id = o.id
    LEFT JOIN users usr ON usr.office_id = o.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.3 Data entry report (single-pass grouped aggregates)
CREATE OR REPLACE FUNCTION public.admin_data_entry_report()
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
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
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.4 Entry completion matrix
CREATE OR REPLACE FUNCTION public.admin_entry_completion()
RETURNS json AS $$
DECLARE result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  WITH office_fy AS (
    SELECT o.id, o.name,
           COALESCE(
             (SELECT value::integer FROM public.app_config
              WHERE key = 'currentFY' AND office_id = o.id LIMIT 1),
             CASE WHEN EXTRACT(MONTH FROM NOW()) >= 4 THEN EXTRACT(YEAR FROM NOW())::integer
                  ELSE EXTRACT(YEAR FROM NOW())::integer - 1 END
           ) AS fy
    FROM public.offices o
  )
  SELECT COALESCE(json_agg(
    json_build_object(
      'office_id', of.id,
      'office_name', of.name,
      'fy', of.fy,
      'months', (
        SELECT COALESCE(json_agg(m.month), '[]'::json)
        FROM (
          SELECT DISTINCT s.month,
                 array_position(
                   ARRAY['April','May','June','July','August','September',
                         'October','November','December','January','February','March']::text[],
                   s.month) AS pos
          FROM public.employee_salaries s
          WHERE s.office_id = of.id AND s.financial_year = of.fy
          ORDER BY pos
        ) m
      )
    )
    ORDER BY of.name
  ), '[]'::json) INTO result
  FROM office_fy of;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.5 Office financial years (salary + transactions)
CREATE OR REPLACE FUNCTION public.admin_office_financial_years(target_office_id bigint)
RETURNS json AS $$
DECLARE result json; fallback integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT COALESCE(json_agg(y ORDER BY y DESC), '[]'::json) INTO result
  FROM (
    SELECT s.financial_year AS y
    FROM public.employee_salaries s
    WHERE s.office_id = target_office_id
    UNION
    SELECT CASE WHEN EXTRACT(MONTH FROM t.transaction_date) >= 3
                THEN EXTRACT(YEAR FROM t.transaction_date)::integer
                ELSE EXTRACT(YEAR FROM t.transaction_date)::integer - 1 END
    FROM public.party_transactions t
    WHERE t.office_id = target_office_id
  ) yrs;

  IF result = '[]'::json THEN
    fallback := CASE WHEN EXTRACT(MONTH FROM NOW()) >= 3
                     THEN EXTRACT(YEAR FROM NOW())::integer
                     ELSE EXTRACT(YEAR FROM NOW())::integer - 1 END;
    result := json_build_array(fallback);
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 6. AUDIT LISTING (server-side pagination)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_audit_list(
  limit_count integer DEFAULT 100,
  offset_count integer DEFAULT 0
)
RETURNS json AS $$
DECLARE result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object(
      'id', l.id,
      'admin_email', l.admin_email,
      'action', l.action,
      'target_email', l.target_email,
      'details', l.details,
      'created_at', l.created_at
    )
  ), '[]'::json) INTO result
  FROM (
    SELECT * FROM public.admin_audit_log
    ORDER BY created_at DESC, id DESC
    LIMIT GREATEST(1, limit_count) OFFSET GREATEST(0, offset_count)
  ) l;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 7. GRANTS
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_offices() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_office(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_office(bigint, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_invite_user(text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_office_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_data_entry_report() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_entry_completion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_office_financial_years(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_audit_list(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_log(text, text, jsonb) TO authenticated;

COMMIT;

