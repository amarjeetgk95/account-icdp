-- ============================================================================
-- 049_single_office_drop_admin_remnants.sql
-- Single-office mode: drop the retired multi-office admin control plane.
-- Frontend admin module (src/modules/admin, adminaudit) is deleted; these
-- RPCs/tables have zero callers. RLS is auth.uid() IS NOT NULL (044).
-- ============================================================================

BEGIN;

-- 1. Drop admin RPCs (all overloads)
DROP FUNCTION IF EXISTS public.admin_list_users() CASCADE;
DROP FUNCTION IF EXISTS public.admin_set_role(uuid, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_set_role(uuid, text, bigint) CASCADE;
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_list_offices() CASCADE;
DROP FUNCTION IF EXISTS public.admin_create_office(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_create_office(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_office(bigint, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, bigint) CASCADE;
DROP FUNCTION IF EXISTS public.admin_invite_user(text, text, text, bigint) CASCADE;
DROP FUNCTION IF EXISTS public.admin_set_user_status(uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.get_system_stats() CASCADE;
DROP FUNCTION IF EXISTS public.admin_office_stats() CASCADE;
DROP FUNCTION IF EXISTS public.admin_data_entry_report() CASCADE;
DROP FUNCTION IF EXISTS public.admin_entry_completion() CASCADE;
DROP FUNCTION IF EXISTS public.admin_office_financial_years(bigint) CASCADE;
DROP FUNCTION IF EXISTS public.admin_log(text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.admin_audit_list(integer) CASCADE;
DROP FUNCTION IF EXISTS public.admin_audit_list(integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.admin_import_health() CASCADE;
DROP FUNCTION IF EXISTS public.admin_office_config(bigint) CASCADE;
DROP FUNCTION IF EXISTS public.admin_set_office_fy(bigint, integer) CASCADE;
DROP FUNCTION IF EXISTS public.admin_component_list() CASCADE;
DROP FUNCTION IF EXISTS public.admin_component_save(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.admin_component_set_active(uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.admin_component_delete(uuid) CASCADE;

-- 2. Drop single-office shims (unused now that RLS uses auth.uid() directly)
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.can_access_office(bigint) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_office(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.current_office_id() CASCADE;

-- 3. Drop admin audit table (frontend adminaudit deleted)
DROP TABLE IF EXISTS public.admin_audit_log CASCADE;

COMMIT;
