-- ============================================================================
-- 052_restrictive_audit_rls.sql
-- Restrictive RLS for append-only audit/log tables (single-office mode).
--
-- Replaces the open post-044 policies (FOR ALL USING/WITH CHECK
-- (auth.uid() IS NOT NULL)) on audit tables with tamper-evident policies:
-- SELECT + INSERT for authenticated users only, NO update/delete policy
-- (denied by default). App code only ever INSERTs + SELECTs audit rows,
-- so every current code path keeps working while audit history becomes
-- immutable from the client.
--
-- Tables covered (each guarded by IF EXISTS, re-runnable):
--   form16_audit_log, paybill_import_audits, gr_audit_logs (exist live),
--   admin_audit_log (harmless no-op if 049 already dropped it).
--
-- Does NOT touch operational tables' policies, does NOT touch GRANTs,
-- does NOT add any tenant/office column predicate, does NOT alter functions.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. form16_audit_log — append-only lifecycle events per certificate
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'form16_audit_log') THEN
    ALTER TABLE public.form16_audit_log ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "form16_audit_log_single_office_all" ON public.form16_audit_log;
    DROP POLICY IF EXISTS "allow_authenticated_all" ON public.form16_audit_log;
    DROP POLICY IF EXISTS "Users can view form16 audit in their office" ON public.form16_audit_log;
    DROP POLICY IF EXISTS "Users can manage form16 audit in their office" ON public.form16_audit_log;
    DROP POLICY IF EXISTS "Admins can manage all form16 audit" ON public.form16_audit_log;
    DROP POLICY IF EXISTS "Allow all for form16_audit_log" ON public.form16_audit_log;
    DROP POLICY IF EXISTS "Authenticated users access form16_audit_log" ON public.form16_audit_log;
    DROP POLICY IF EXISTS "form16_audit_log_select" ON public.form16_audit_log;
    DROP POLICY IF EXISTS "form16_audit_log_insert" ON public.form16_audit_log;

    CREATE POLICY "form16_audit_log_select" ON public.form16_audit_log
      FOR SELECT USING (auth.uid() IS NOT NULL);

    CREATE POLICY "form16_audit_log_insert" ON public.form16_audit_log
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

    -- No UPDATE / DELETE policy: denied by default (tamper-evident).
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. paybill_import_audits — immutable per-import events
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'paybill_import_audits') THEN
    ALTER TABLE public.paybill_import_audits ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "paybill_import_audits_single_office_all" ON public.paybill_import_audits;
    DROP POLICY IF EXISTS "allow_authenticated_all" ON public.paybill_import_audits;
    DROP POLICY IF EXISTS "Users can view import audits in their office" ON public.paybill_import_audits;
    DROP POLICY IF EXISTS "Users can manage import audits in their office" ON public.paybill_import_audits;
    DROP POLICY IF EXISTS "Admins can manage all import audits" ON public.paybill_import_audits;
    DROP POLICY IF EXISTS "Allow all for paybill_import_audits" ON public.paybill_import_audits;
    DROP POLICY IF EXISTS "Authenticated users access paybill_import_audits" ON public.paybill_import_audits;
    DROP POLICY IF EXISTS "paybill_import_audits_select" ON public.paybill_import_audits;
    DROP POLICY IF EXISTS "paybill_import_audits_insert" ON public.paybill_import_audits;

    CREATE POLICY "paybill_import_audits_select" ON public.paybill_import_audits
      FOR SELECT USING (auth.uid() IS NOT NULL);

    CREATE POLICY "paybill_import_audits_insert" ON public.paybill_import_audits
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

    -- No UPDATE / DELETE policy: denied by default (tamper-evident).
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. gr_audit_logs — GR record action log
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gr_audit_logs') THEN
    ALTER TABLE public.gr_audit_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "gr_audit_logs_single_office_all" ON public.gr_audit_logs;
    DROP POLICY IF EXISTS "allow_authenticated_all" ON public.gr_audit_logs;
    DROP POLICY IF EXISTS "gr_audit_select" ON public.gr_audit_logs;
    DROP POLICY IF EXISTS "gr_audit_insert" ON public.gr_audit_logs;
    DROP POLICY IF EXISTS "Allow all for gr_audit_logs" ON public.gr_audit_logs;
    DROP POLICY IF EXISTS "Authenticated users access gr_audit_logs" ON public.gr_audit_logs;
    DROP POLICY IF EXISTS "gr_audit_logs_select" ON public.gr_audit_logs;
    DROP POLICY IF EXISTS "gr_audit_logs_insert" ON public.gr_audit_logs;

    CREATE POLICY "gr_audit_logs_select" ON public.gr_audit_logs
      FOR SELECT USING (auth.uid() IS NOT NULL);

    CREATE POLICY "gr_audit_logs_insert" ON public.gr_audit_logs
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

    -- No UPDATE / DELETE policy: denied by default (tamper-evident).
    -- NOTE: public.gr_log_action() is SECURITY DEFINER, so server-side
    -- logging through that RPC is unaffected by RLS.
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. admin_audit_log — only if 049 has NOT been applied yet
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_audit_log') THEN
    ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "admin_audit_log_single_office_all" ON public.admin_audit_log;
    DROP POLICY IF EXISTS "allow_authenticated_all" ON public.admin_audit_log;
    DROP POLICY IF EXISTS "audit_admin_select" ON public.admin_audit_log;
    DROP POLICY IF EXISTS "Allow all for admin_audit_log" ON public.admin_audit_log;
    DROP POLICY IF EXISTS "Authenticated users access admin_audit_log" ON public.admin_audit_log;
    DROP POLICY IF EXISTS "admin_audit_log_select" ON public.admin_audit_log;
    DROP POLICY IF EXISTS "admin_audit_log_insert" ON public.admin_audit_log;

    CREATE POLICY "admin_audit_log_select" ON public.admin_audit_log
      FOR SELECT USING (auth.uid() IS NOT NULL);

    CREATE POLICY "admin_audit_log_insert" ON public.admin_audit_log
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

    -- No UPDATE / DELETE policy: denied by default (tamper-evident).
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION (run in Supabase Dashboard -> SQL Editor, as authenticated app
-- user where noted; paste each query uncommented):
--
-- Q1. Policy names per table (expect exactly one SELECT + one INSERT policy
--     per existing audit table, no FOR ALL policy):
--     SELECT tablename, policyname, cmd
--     FROM pg_policies
--     WHERE schemaname = 'public'
--       AND tablename IN ('form16_audit_log', 'paybill_import_audits',
--                         'gr_audit_logs', 'admin_audit_log')
--     ORDER BY tablename, cmd;
--
-- Q2. Confirm NO update/delete policies on audit tables (expect zero rows):
--     SELECT tablename, policyname, cmd
--     FROM pg_policies
--     WHERE schemaname = 'public'
--       AND tablename IN ('form16_audit_log', 'paybill_import_audits',
--                         'gr_audit_logs', 'admin_audit_log')
--       AND cmd IN ('UPDATE', 'DELETE');
--
-- Q3. Negative test (as an authenticated non-service-role user; MUST FAIL
--     with a row-level-security violation, proving tamper-evidence):
--     DELETE FROM public.gr_audit_logs WHERE id = 1;
--     -- substitute a real id from:
--     --   SELECT id FROM public.gr_audit_logs LIMIT 1;
--
-- ROLLBACK (restores the pre-052 open allow_authenticated_all-style policy
-- per table; paste uncommented if you must revert):
--
-- BEGIN;
-- DO $$
-- DECLARE
--   tbl TEXT;
-- BEGIN
--   FOREACH tbl IN ARRAY ARRAY['form16_audit_log', 'paybill_import_audits',
--                             'gr_audit_logs', 'admin_audit_log'] LOOP
--     IF EXISTS (SELECT 1 FROM information_schema.tables
--                WHERE table_schema = 'public' AND table_name = tbl) THEN
--       EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_select', tbl);
--       EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_insert', tbl);
--       EXECUTE format('DROP POLICY IF EXISTS "allow_authenticated_all" ON public.%I;', tbl);
--       EXECUTE format('CREATE POLICY "allow_authenticated_all" ON public.%I FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);', tbl);
--     END IF;
--   END LOOP;
-- END $$;
-- COMMIT;
-- ============================================================================
