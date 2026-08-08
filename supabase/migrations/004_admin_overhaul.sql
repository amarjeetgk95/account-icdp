-- ============================================================================
-- ICDP Tax System - Admin Module Overhaul
-- Adds: audit log, user invite flow, monthly entry-completion grid,
--       office financial years RPC. Mirrors the LIVE (remediation.sql) schema:
--       bigint office_id, no profiles.email, app_config key 'currentFY'.
-- Idempotent. Run in Supabase Dashboard -> SQL Editor.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. AUDIT LOG TABLE
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
CREATE POLICY "audit_admin_select" ON public.admin_audit_log
  FOR SELECT USING (public.is_admin());

GRANT SELECT, INSERT ON TABLE public.admin_audit_log TO authenticated;

-- Helper used inside SECURITY DEFINER admin functions
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
-- 2. RECREATED EXISTING RPCs WITH AUDIT LOGGING
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_set_role(uuid, text, bigint);
DROP FUNCTION IF EXISTS public.admin_set_role(uuid, text, uuid);
CREATE OR REPLACE FUNCTION public.admin_set_role(user_id uuid, new_role text, new_office_id uuid)
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;
  IF new_role NOT IN ('admin', 'office') THEN
    RETURN json_build_object('error', 'Invalid role');
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

DROP FUNCTION IF EXISTS public.admin_delete_user(uuid);
DROP FUNCTION IF EXISTS public.admin_deleteUser(uuid);
DROP FUNCTION IF EXISTS public."admin_deleteUser"(uuid);
CREATE OR REPLACE FUNCTION public.admin_delete_user(user_id uuid)
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;
  IF user_id = auth.uid() THEN
    RETURN json_build_object('error', 'Cannot delete yourself');
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

CREATE OR REPLACE FUNCTION public."admin_deleteUser"(user_id uuid)
RETURNS json AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;
  IF user_id = auth.uid() THEN
    RETURN json_build_object('error', 'Cannot delete yourself');
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

DROP FUNCTION IF EXISTS public.admin_create_office(text, text);
CREATE OR REPLACE FUNCTION public.admin_create_office(office_name text, office_district text)
RETURNS json AS $$
DECLARE
  new_office_id uuid;
  current_fy integer;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;

  current_fy := CASE
    WHEN EXTRACT(MONTH FROM NOW()) >= 3 THEN EXTRACT(YEAR FROM NOW())
    ELSE EXTRACT(YEAR FROM NOW()) - 1
  END;

  INSERT INTO public.offices (name, district, current_fy)
  VALUES (office_name, office_district, current_fy)
  RETURNING id INTO new_office_id;

  INSERT INTO public.office_details (office_id, office_name)
  VALUES (new_office_id, office_name);

  PERFORM public.admin_log(
    'office.created',
    NULL,
    jsonb_build_object('office', office_name)
  );

  RETURN json_build_object('id', new_office_id, 'name', office_name, 'district', office_district, 'current_fy', current_fy, 'users', 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, bigint);
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, uuid);
CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email text, user_password text, user_role text, user_office_id uuid
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
  INSERT INTO public.profiles (id, role, office_id) VALUES (new_id, user_role, user_office_id);

  PERFORM public.admin_log(
    'user.created',
    user_email,
    jsonb_build_object('role', user_role, 'office_id', user_office_id)
  );

  RETURN json_build_object('message', 'User created successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 3. NEW: INVITE USER (no password; user verifies email / sets password via
--    the forgot-password flow). Requires Supabase SMTP to send the email.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_invite_user(text, text, bigint);
CREATE OR REPLACE FUNCTION public.admin_invite_user(
  user_email text, user_role text, user_office_id uuid
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
  INSERT INTO public.profiles (id, role, office_id) VALUES (new_id, user_role, user_office_id);

  PERFORM public.admin_log(
    'user.invited',
    user_email,
    jsonb_build_object('role', user_role, 'office_id', user_office_id)
  );

  RETURN json_build_object('message', 'Invitation created successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 4. NEW: MONTHLY ENTRY COMPLETION GRID
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_entry_completion();
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
             CASE WHEN EXTRACT(MONTH FROM NOW()) >= 3 THEN EXTRACT(YEAR FROM NOW())::integer
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
        SELECT COALESCE(json_agg(DISTINCT s.month
          ORDER BY array_position(
            ARRAY['April','May','June','July','August','September',
                  'October','November','December','January','February','March'],
            s.month)), '[]'::json)
        FROM public.employee_salaries s
        WHERE s.office_id = of.id AND s.financial_year = of.fy
      )
    )
    ORDER BY of.name
  ), '[]'::json) INTO result
  FROM office_fy of;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 5. NEW: OFFICE FINANCIAL YEARS (salary + transaction data, newest first)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_office_financial_years(bigint);
CREATE OR REPLACE FUNCTION public.admin_office_financial_years(target_office_id uuid)
RETURNS json AS $$
DECLARE result json; fallback integer;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN '[]'::json;
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
-- 6. NEW: AUDIT LOG LISTING
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_audit_list(integer);
CREATE OR REPLACE FUNCTION public.admin_audit_list(limit_count integer DEFAULT 100)
RETURNS json AS $$
DECLARE result json;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN '[]'::json;
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

COMMIT;
