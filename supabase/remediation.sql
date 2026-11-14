-- ============================================================================
-- ICDP Tax System - Live database remediation
-- Applies to: account-icdp (ref: terjvhdjfbyfvimwwdxl)
-- Target schema (live/legacy-imported): integer office_id, no profiles.email,
--   no offices.current_fy. Idempotent. Run in Supabase Dashboard -> SQL Editor.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. PRIVILEGES
--    The 'authenticated' role (logged-in users) could not read employees,
--    employee_salaries, parties or party_transactions -> PostgREST 404.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles, public.offices, public.office_details,
  public.employees, public.employee_salaries,
  public.parties, public.party_transactions, public.app_config
TO authenticated;

GRANT SELECT ON TABLE
  public.offices, public.office_details, public.app_config
TO anon;

-- Sequences used by serial id columns (INSERTs need USAGE)
DO $$
DECLARE s RECORD;
BEGIN
  FOR s IN
    SELECT c.relname AS seq
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'S'
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', s.seq);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. RLS HELPER FUNCTIONS (aligned to integer office_id)
--    The old UUID-typed can_access_office could never evaluate against the
--    integer office_id columns, so per-office RLS failed at plan time.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.can_access_office(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_office(bigint) CASCADE;
DROP FUNCTION IF EXISTS public.current_office_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.current_office_id()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT office_id FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT COALESCE(role = 'admin', false) FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.can_access_office(target_office_id bigint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT COALESCE(role = 'admin' OR office_id = target_office_id, false)
     FROM public.profiles WHERE id = auth.uid() $$;

-- ---------------------------------------------------------------------------
-- 3. RLS POLICIES (drop all existing, recreate deterministically)
-- ---------------------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles','offices','office_details','employees',
                        'employee_salaries','parties','party_transactions','app_config')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_details     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salaries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config         ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_own_view"  ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- offices
CREATE POLICY "offices_auth_view" ON public.offices FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "offices_admin_all" ON public.offices FOR ALL USING (public.is_admin());

-- office_details
CREATE POLICY "office_details_office_view"  ON public.office_details FOR SELECT USING (public.can_access_office(office_id));
CREATE POLICY "office_details_admin_all"    ON public.office_details FOR ALL USING (public.is_admin());

-- employees: drop existing, recreate with office manage policy
DROP POLICY IF EXISTS "employees_office_view" ON public.employees;
DROP POLICY IF EXISTS "employees_admin_all" ON public.employees;
DROP POLICY IF EXISTS "Users can view employees in their office" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage all employees" ON public.employees;

CREATE POLICY "employees_office_view" ON public.employees FOR SELECT USING (public.can_access_office(office_id));
CREATE POLICY "employees_office_manage" ON public.employees FOR ALL USING (public.can_access_office(office_id)) WITH CHECK (public.can_access_office(office_id));
CREATE POLICY "employees_admin_all"   ON public.employees FOR ALL USING (public.is_admin());

-- employee_salaries: ensure consistent office write policies
DROP POLICY IF EXISTS "salaries_office_view" ON public.employee_salaries;
DROP POLICY IF EXISTS "salaries_admin_all" ON public.employee_salaries;
DROP POLICY IF EXISTS "Users can view salaries in their office" ON public.employee_salaries;
DROP POLICY IF EXISTS "Admins can manage all salaries" ON public.employee_salaries;
DROP POLICY IF EXISTS "Users can manage salaries in their office" ON public.employee_salaries;

CREATE POLICY "salaries_office_view" ON public.employee_salaries FOR SELECT USING (public.can_access_office(office_id));
CREATE POLICY "salaries_office_manage" ON public.employee_salaries FOR ALL USING (public.can_access_office(office_id)) WITH CHECK (public.can_access_office(office_id));
CREATE POLICY "salaries_admin_all"   ON public.employee_salaries FOR ALL USING (public.is_admin());

-- parties
DROP POLICY IF EXISTS "parties_office_view" ON public.parties;
DROP POLICY IF EXISTS "parties_admin_all" ON public.parties;
DROP POLICY IF EXISTS "Users can view parties in their office" ON public.parties;
DROP POLICY IF EXISTS "Admins can manage all parties" ON public.parties;

CREATE POLICY "parties_office_view" ON public.parties FOR SELECT USING (public.can_access_office(office_id));
CREATE POLICY "parties_office_manage" ON public.parties FOR ALL USING (public.can_access_office(office_id)) WITH CHECK (public.can_access_office(office_id));
CREATE POLICY "parties_admin_all"   ON public.parties FOR ALL USING (public.is_admin());

-- party_transactions
DROP POLICY IF EXISTS "transactions_office_view" ON public.party_transactions;
DROP POLICY IF EXISTS "transactions_admin_all" ON public.party_transactions;
DROP POLICY IF EXISTS "Users can view transactions in their office" ON public.party_transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.party_transactions;

CREATE POLICY "transactions_office_view" ON public.party_transactions FOR SELECT USING (public.can_access_office(office_id));
CREATE POLICY "transactions_office_manage" ON public.party_transactions FOR ALL USING (public.can_access_office(office_id)) WITH CHECK (public.can_access_office(office_id));
CREATE POLICY "transactions_admin_all"   ON public.party_transactions FOR ALL USING (public.is_admin());

-- office_details
DROP POLICY IF EXISTS "office_details_office_view" ON public.office_details;
DROP POLICY IF EXISTS "office_details_admin_all" ON public.office_details;
DROP POLICY IF EXISTS "Users can view office details for accessible offices" ON public.office_details;
DROP POLICY IF EXISTS "Admins can manage all office details" ON public.office_details;

CREATE POLICY "office_details_office_view" ON public.office_details FOR SELECT USING (public.can_access_office(office_id));
CREATE POLICY "office_details_office_manage" ON public.office_details FOR ALL USING (public.can_access_office(office_id)) WITH CHECK (public.can_access_office(office_id));
CREATE POLICY "office_details_admin_all" ON public.office_details FOR ALL USING (public.is_admin());

-- app_config
DROP POLICY IF EXISTS "app_config_office_view" ON public.app_config;
DROP POLICY IF EXISTS "app_config_admin_all" ON public.app_config;
DROP POLICY IF EXISTS "Users can view config in their office" ON public.app_config;
DROP POLICY IF EXISTS "Admins can manage all config" ON public.app_config;

CREATE POLICY "app_config_office_view" ON public.app_config FOR SELECT USING (public.can_access_office(office_id));
CREATE POLICY "app_config_office_manage" ON public.app_config FOR ALL USING (public.can_access_office(office_id)) WITH CHECK (public.can_access_office(office_id));
CREATE POLICY "app_config_admin_all"   ON public.app_config FOR ALL USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. UNIQUE CONSTRAINTS relied on by upserts (add only if missing, skip on error)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'employee_salaries_employee_id_financial_year_month_key'
    ) THEN
      ALTER TABLE public.employee_salaries
        ADD CONSTRAINT employee_salaries_employee_id_financial_year_month_key
        UNIQUE (employee_id, financial_year, month);
    END IF;
  EXCEPTION WHEN others THEN RAISE NOTICE 'skip employee_salaries unique: %', SQLERRM;
  END;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_config_office_id_key_key') THEN
      ALTER TABLE public.app_config ADD CONSTRAINT app_config_office_id_key_key UNIQUE (office_id, key);
    END IF;
  EXCEPTION WHEN others THEN RAISE NOTICE 'skip app_config unique: %', SQLERRM;
  END;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'office_details_office_id_key') THEN
      ALTER TABLE public.office_details ADD CONSTRAINT office_details_office_id_key UNIQUE (office_id);
    END IF;
  EXCEPTION WHEN others THEN RAISE NOTICE 'skip office_details unique: %', SQLERRM;
  END;
END $$;

-- ---------------------------------------------------------------------------
-- 5. ADMIN RPC FUNCTIONS (recreated for the live schema)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_list_users();
DROP FUNCTION IF EXISTS public.admin_set_role(uuid, text, bigint);
DROP FUNCTION IF EXISTS public.admin_set_role(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid);
DROP FUNCTION IF EXISTS public.admin_deleteUser(uuid);
DROP FUNCTION IF EXISTS public."admin_deleteUser"(uuid);
DROP FUNCTION IF EXISTS public.admin_list_offices();
DROP FUNCTION IF EXISTS public.admin_create_office(text, text);
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, bigint);
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, uuid);
DROP FUNCTION IF EXISTS public.get_system_stats();
DROP FUNCTION IF EXISTS public.admin_office_stats();
DROP FUNCTION IF EXISTS public.admin_data_entry_report();

-- List users (email comes from auth.users; profiles has no email column)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS json AS $$
DECLARE result json;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN '[]'::json;
  END IF;
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'email', u.email,
      'role', p.role,
      'office_id', p.office_id,
      'office_name', o.name,
      'created_at', p.created_at,
      'last_sign_in_at', u.last_sign_in_at
    )
    ORDER BY p.created_at DESC
  ) INTO result
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.offices o ON o.id = p.office_id;
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Set user role / office
CREATE OR REPLACE FUNCTION public.admin_set_role(user_id uuid, new_role text, new_office_id bigint)
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;
  IF new_role NOT IN ('admin', 'office') THEN
    RETURN json_build_object('error', 'Invalid role');
  END IF;
  UPDATE public.profiles
  SET role = new_role, office_id = new_office_id
  WHERE id = user_id;
  RETURN json_build_object('message', 'Role updated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Delete user (snake_case, referenced by older code paths)
CREATE OR REPLACE FUNCTION public.admin_delete_user(user_id uuid)
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;
  IF user_id = auth.uid() THEN
    RETURN json_build_object('error', 'Cannot delete yourself');
  END IF;
  DELETE FROM public.profiles WHERE id = user_id;
  DELETE FROM auth.users WHERE id = user_id;
  RETURN json_build_object('message', 'User deleted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Delete user (camelCase, the name the frontend actually calls; quoted so
-- PostgREST resolves rpc('admin_deleteUser') case-sensitively)
CREATE OR REPLACE FUNCTION public."admin_deleteUser"(user_id uuid)
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;
  IF user_id = auth.uid() THEN
    RETURN json_build_object('error', 'Cannot delete yourself');
  END IF;
  DELETE FROM public.profiles WHERE id = user_id;
  DELETE FROM auth.users WHERE id = user_id;
  RETURN json_build_object('message', 'User deleted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- List offices (no current_fy column in the live schema)
CREATE OR REPLACE FUNCTION public.admin_list_offices()
RETURNS json AS $$
DECLARE result json;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN '[]'::json;
  END IF;
  SELECT json_agg(
    json_build_object(
      'id', o.id,
      'name', o.name,
      'district', o.district,
      'users', (SELECT COUNT(*) FROM public.profiles p WHERE p.office_id = o.id)
    )
    ORDER BY o.name
  ) INTO result
  FROM public.offices o;
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create office (offices has no current_fy column)
CREATE OR REPLACE FUNCTION public.admin_create_office(office_name text, office_district text)
RETURNS json AS $$
DECLARE new_office_id bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;
  INSERT INTO public.offices (name, district)
  VALUES (office_name, office_district)
  RETURNING id INTO new_office_id;
  INSERT INTO public.office_details (office_id, office_name)
  VALUES (new_office_id, office_name);
  RETURN json_build_object('id', new_office_id, 'name', office_name, 'district', office_district, 'users', 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create user (auth.users + profile). Frontend calls this RPC.
CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email text, user_password text, user_role text, user_office_id bigint
)
RETURNS json AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;
  IF user_role NOT IN ('admin', 'office') THEN
    RETURN json_build_object('error', 'Invalid role');
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
  -- GoTrue requires a companion auth.identities row for the user to be able to sign in.
  INSERT INTO auth.identities (
    id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), new_id, 'email', new_id::text,
    jsonb_build_object('sub', new_id::text, 'email', user_email),
    now(), now(), now()
  );
  INSERT INTO public.profiles (id, role, office_id) VALUES (new_id, user_role, user_office_id);
  RETURN json_build_object('message', 'User created successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- System stats (use live app_config key 'currentFY')
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;
  RETURN (
    SELECT json_build_object(
      'users', (SELECT COUNT(*) FROM public.profiles),
      'admins', (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin'),
      'offices', (SELECT COUNT(*) FROM public.offices),
      'fy', (SELECT COALESCE(
        (SELECT value::integer FROM public.app_config WHERE key = 'currentFY' LIMIT 1),
        CASE WHEN EXTRACT(MONTH FROM NOW()) >= 3 THEN EXTRACT(YEAR FROM NOW())
             ELSE EXTRACT(YEAR FROM NOW()) - 1 END)),
      'employees', (SELECT COUNT(*) FROM public.employees),
      'salaries', (SELECT COUNT(*) FROM public.employee_salaries),
      'parties', (SELECT COUNT(*) FROM public.parties),
      'transactions', (SELECT COUNT(*) FROM public.party_transactions),
      'officeName', (SELECT office_name FROM public.office_details WHERE office_id = public.current_office_id() LIMIT 1)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Office stats (per office aggregates)
CREATE OR REPLACE FUNCTION public.admin_office_stats()
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN '[]'::json;
  END IF;
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'office_id', o.id,
        'office_name', o.name,
        'employees', (SELECT COUNT(*) FROM public.employees e WHERE e.office_id = o.id),
        'salaries', (SELECT COUNT(*) FROM public.employee_salaries s WHERE s.office_id = o.id),
        'parties', (SELECT COUNT(*) FROM public.parties p WHERE p.office_id = o.id),
        'transactions', (SELECT COUNT(*) FROM public.party_transactions t WHERE t.office_id = o.id),
        'users', (SELECT COUNT(*) FROM public.profiles p WHERE p.office_id = o.id)
      )
      ORDER BY o.name
    ), '[]'::json)
    FROM public.offices o
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Data entry report (email from auth.users, FY from app_config)
CREATE OR REPLACE FUNCTION public.admin_data_entry_report()
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN '[]'::json;
  END IF;
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'office_id', o.id,
        'office_name', o.name,
        'user_email', (SELECT u.email FROM public.profiles p
                       JOIN auth.users u ON u.id = p.id
                       WHERE p.office_id = o.id LIMIT 1),
        'current_fy', (SELECT value FROM public.app_config WHERE key = 'currentFY' AND office_id = o.id LIMIT 1),
        'employees', (SELECT COUNT(*) FROM public.employees e WHERE e.office_id = o.id),
        'salary_records', (SELECT COUNT(*) FROM public.employee_salaries s WHERE s.office_id = o.id),
        'total_gross', (SELECT COALESCE(SUM(gross), 0) FROM public.employee_salaries s WHERE s.office_id = o.id),
        'total_da', (SELECT COALESCE(SUM(da), 0) FROM public.employee_salaries s WHERE s.office_id = o.id),
        'total_tax', (SELECT COALESCE(SUM(tax), 0) FROM public.employee_salaries s WHERE s.office_id = o.id),
        'vendors', (SELECT COUNT(*) FROM public.parties p WHERE p.office_id = o.id),
        'transactions', (SELECT COUNT(*) FROM public.party_transactions t WHERE t.office_id = o.id),
        'total_amount', (SELECT COALESCE(SUM(amount), 0) FROM public.party_transactions t WHERE t.office_id = o.id),
        'total_gst', (SELECT COALESCE(SUM(total_gst), 0) FROM public.party_transactions t WHERE t.office_id = o.id),
        'total_income_tax', (SELECT COALESCE(SUM(income_tax), 0) FROM public.party_transactions t WHERE t.office_id = o.id),
        'last_activity', (
          SELECT MAX(created_at)
          FROM (
            SELECT created_at FROM public.employee_salaries s WHERE s.office_id = o.id
            UNION ALL
            SELECT created_at FROM public.party_transactions t WHERE t.office_id = o.id
          ) sub
        )
      )
      ORDER BY o.name
    ), '[]'::json)
    FROM public.offices o
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Data entry completion (Monthly completion matrix)
CREATE OR REPLACE FUNCTION public.admin_entry_completion()
RETURNS json AS $$
DECLARE result json;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN '[]'::json;
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

-- Office financial years
CREATE OR REPLACE FUNCTION public.admin_office_financial_years(target_office_id uuid)
RETURNS json AS $$
DECLARE result json;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN '[]'::json;
  END IF;

  SELECT COALESCE(json_agg(fy ORDER BY fy DESC), '[]'::json) INTO result
  FROM (
    SELECT DISTINCT financial_year AS fy
    FROM public.employee_salaries
    WHERE office_id = target_office_id
    UNION
    SELECT DISTINCT financial_year AS fy
    FROM public.party_transactions
    WHERE office_id = target_office_id
  ) sub
  WHERE fy IS NOT NULL;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin Audit Logging & Trail
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

CREATE OR REPLACE FUNCTION public.admin_audit_list(limit_count integer DEFAULT 100)
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
    ORDER BY created_at DESC
    LIMIT GREATEST(1, limit_count)
  ) l;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Invite user (no password; user sets their own via forgot-password)
CREATE OR REPLACE FUNCTION public.admin_invite_user(
  user_email text, user_role text, user_office_id bigint
)
RETURNS json AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;
  IF user_role NOT IN ('admin', 'office') THEN
    RETURN json_build_object('error', 'Invalid role');
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
  -- GoTrue requires a companion auth.identities row for the user to be able to sign in.
  INSERT INTO auth.identities (
    id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), new_id, 'email', new_id::text,
    jsonb_build_object('sub', new_id::text, 'email', user_email),
    now(), now(), now()
  );
  INSERT INTO public.profiles (id, role, office_id) VALUES (new_id, user_role, user_office_id);
  RETURN json_build_object('message', 'Invitation created successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
