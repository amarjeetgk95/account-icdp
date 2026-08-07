-- ICDP Tax System - Admin Functions
-- Created: 2026-08-07

-- Drop existing functions before recreating (handles return type changes)
DROP FUNCTION IF EXISTS public.admin_list_users();
DROP FUNCTION IF EXISTS public.admin_set_role(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.admin_delete_user(UUID);
DROP FUNCTION IF EXISTS public.admin_list_offices();
DROP FUNCTION IF EXISTS public.admin_create_office(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_system_stats();
DROP FUNCTION IF EXISTS public.admin_office_stats();
DROP FUNCTION IF EXISTS public.admin_data_entry_report();

-- Admin: List all users with their roles and offices
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'email', p.email,
      'role', p.role,
      'office_id', p.office_id,
      'office_name', o.name,
      'created_at', p.created_at,
      'last_sign_in_at', u.last_sign_in_at
    )
  ) INTO result
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  LEFT JOIN public.offices o ON p.office_id = o.id
  ORDER BY p.created_at DESC;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Set user role
CREATE OR REPLACE FUNCTION public.admin_set_role(
  user_id UUID,
  new_role TEXT,
  new_office_id UUID
)
RETURNS JSON AS $$
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

  RETURN json_build_object('message', 'Role updated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Delete user
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  user_id UUID
)
RETURNS JSON AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;

  IF user_id = auth.uid() THEN
    RETURN json_build_object('error', 'Cannot delete yourself');
  END IF;

  DELETE FROM public.profiles WHERE id = user_id;

  RETURN json_build_object('message', 'User deleted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: List offices
CREATE OR REPLACE FUNCTION public.admin_list_offices()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN '[]'::json;
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', o.id,
      'name', o.name,
      'district', o.district,
      'current_fy', o.current_fy,
      'users', (
        SELECT COUNT(*) FROM public.profiles p WHERE p.office_id = o.id
      )
    )
  ) INTO result
  FROM public.offices o
  ORDER BY o.name;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Create office
CREATE OR REPLACE FUNCTION public.admin_create_office(
  office_name TEXT,
  office_district TEXT
)
RETURNS JSON AS $$
DECLARE
  new_office_id UUID;
  current_fy INTEGER;
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

  RETURN json_build_object(
    'id', new_office_id,
    'name', office_name,
    'district', office_district,
    'current_fy', current_fy,
    'users', 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Get system stats
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS JSON AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;

  RETURN (
    SELECT json_build_object(
      'users', (SELECT COUNT(*) FROM public.profiles),
      'admins', (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin'),
      'offices', (SELECT COUNT(*) FROM public.offices),
      'fy', (
        SELECT COALESCE(
          (SELECT value::integer FROM public.app_config WHERE key = 'current_fy' LIMIT 1),
          CASE WHEN EXTRACT(MONTH FROM NOW()) >= 3 THEN EXTRACT(YEAR FROM NOW())
               ELSE EXTRACT(YEAR FROM NOW()) - 1 END
        )
      ),
      'employees', (SELECT COUNT(*) FROM public.employees),
      'salaries', (SELECT COUNT(*) FROM public.employee_salaries),
      'parties', (SELECT COUNT(*) FROM public.parties),
      'transactions', (SELECT COUNT(*) FROM public.party_transactions),
      'officeName', (SELECT office_name FROM public.office_details LIMIT 1)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Get office stats
CREATE OR REPLACE FUNCTION public.admin_office_stats()
RETURNS JSON AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN '[]'::json;
  END IF;

  RETURN (
    SELECT json_agg(
      json_build_object(
        'office_id', o.id,
        'office_name', o.name,
        'employees', (SELECT COUNT(*) FROM public.employees e WHERE e.office_id = o.id),
        'salaries', (SELECT COUNT(*) FROM public.employee_salaries s WHERE s.office_id = o.id),
        'parties', (SELECT COUNT(*) FROM public.parties p WHERE p.office_id = o.id),
        'transactions', (SELECT COUNT(*) FROM public.party_transactions t WHERE t.office_id = o.id),
        'users', (SELECT COUNT(*) FROM public.profiles p WHERE p.office_id = o.id)
      )
    )
    FROM public.offices o
    ORDER BY o.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Get data entry report
CREATE OR REPLACE FUNCTION public.admin_data_entry_report()
RETURNS JSON AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN '[]'::json;
  END IF;

  RETURN (
    SELECT json_agg(
      json_build_object(
        'office_id', o.id,
        'office_name', o.name,
        'user_email', p.email,
        'current_fy', o.current_fy,
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
          SELECT MAX(updated_at)
          FROM (
            SELECT updated_at FROM public.employee_salaries s WHERE s.office_id = o.id
            UNION ALL
            SELECT updated_at FROM public.party_transactions t WHERE t.office_id = o.id
          ) sub
        )
      )
    )
    FROM public.offices o
    LEFT JOIN public.profiles p ON p.office_id = o.id
    ORDER BY o.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
