-- ============================================================================
-- 044_master_single_office_unlock.sql
-- Master Single-Office Unlock Script
--
-- Fixes:
-- 1. Updates can_access_office and is_admin functions to always return TRUE
--    for any authenticated office user.
-- 2. Drops all restrictive legacy policies and opens full access to all
--    tables for authenticated users.
-- 3. Unlocks all RPC functions (GTR-30, GTR-44, Paybill, Establishment, Form 16).
-- ============================================================================

BEGIN;

-- 1. Redefine helper functions to grant full access in single-office mode
CREATE OR REPLACE FUNCTION public.can_access_office(target_office_id bigint)
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_access_office(target_office_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Reset and open RLS policies on all public tables dynamically
DO $$
DECLARE
  r RECORD;
  pol RECORD;
BEGIN
  FOR r IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
  ) LOOP
    BEGIN
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.table_name);

      -- Drop all existing policies on this table
      FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = r.table_name
      ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, r.table_name);
      END LOOP;

      -- Create clean, universal single-office policy
      EXECUTE format(
        'CREATE POLICY "allow_authenticated_all" ON public.%I FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);',
        r.table_name
      );

      -- Grant permissions to authenticated role
      EXECUTE format('GRANT ALL ON TABLE public.%I TO authenticated;', r.table_name);
    EXCEPTION WHEN OTHERS THEN
      -- Safely continue if table is system/locked
    END;
  END LOOP;
END $$;

-- 3. Grant sequence usages
DO $$
DECLARE
  seq RECORD;
BEGIN
  FOR seq IN (
    SELECT sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public'
  ) LOOP
    BEGIN
      EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated;', seq.sequence_name);
    EXCEPTION WHEN OTHERS THEN
    END;
  END LOOP;
END $$;

COMMIT;
