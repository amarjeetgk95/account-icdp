-- ============================================================================
-- 067_establishment_post_catalog.sql
-- Master Post Catalogue, Pay Scale & Cadre Class Management for ICDP Surat
-- ============================================================================

BEGIN;

-- 1. Ensure app_config table exists with unique key constraint
CREATE TABLE IF NOT EXISTS public.app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Open RLS for authenticated office users
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_authenticated_all_app_config" ON public.app_config;
CREATE POLICY "allow_authenticated_all_app_config" ON public.app_config
    FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

GRANT ALL ON TABLE public.app_config TO authenticated;

COMMIT;
