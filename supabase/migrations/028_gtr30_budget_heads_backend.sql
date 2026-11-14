-- 028_gtr30_budget_heads_backend.sql
-- GTR-30 Budget Heads backend: a per-office master list of budget heads that
-- bill codes select from. Each bill code references one head; selecting a head
-- copies its classification (head chargeable, demand no., major/minor/sub
-- head, ...) onto the bill code.
--
-- Mirrors the gtr30_bill_code_mappings storage convention in 023: the UI is
-- local-first and syncs the whole list wholesale via debounced RPC calls.
-- The classification payload itself is stored as JSONB so new fields can be
-- added without further migrations.
--
-- Backend functions (RPC):
--   get_gtr30_budget_heads(p_office_id)                 -> JSON (flat camelCase objects)
--   upsert_gtr30_budget_heads(p_office_id, p_heads)     -> JSON (wholesale replace)

CREATE TABLE IF NOT EXISTS public.gtr30_budget_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gtr30_budget_heads_office
  ON public.gtr30_budget_heads(office_id);

-- ---------------------------------------------------------------------------
-- Row-Level Security (same convention as 023)
-- ---------------------------------------------------------------------------
ALTER TABLE public.gtr30_budget_heads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view gtr30 budget heads in their office" ON public.gtr30_budget_heads;
DROP POLICY IF EXISTS "Users can manage gtr30 budget heads in their office" ON public.gtr30_budget_heads;
DROP POLICY IF EXISTS "Admins can manage all gtr30 budget heads" ON public.gtr30_budget_heads;

CREATE POLICY "Users can view gtr30 budget heads in their office"
  ON public.gtr30_budget_heads FOR SELECT
  USING (public.can_access_office(office_id));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gtr30_budget_heads'
      AND policyname = 'Users can manage gtr30 budget heads in their office'
  ) THEN
    CREATE POLICY "Users can manage gtr30 budget heads in their office"
      ON public.gtr30_budget_heads FOR ALL
      USING (public.can_access_office(office_id))
      WITH CHECK (public.can_access_office(office_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gtr30_budget_heads'
      AND policyname = 'Admins can manage all gtr30 budget heads'
  ) THEN
    CREATE POLICY "Admins can manage all gtr30 budget heads"
      ON public.gtr30_budget_heads FOR ALL
      USING (public.is_admin());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gtr30_budget_heads TO authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Get all budget heads for an office as flat camelCase objects:
-- { id, name, headChargeable, demandNo, majorHead, ... }
CREATE OR REPLACE FUNCTION public.get_gtr30_budget_heads(
  p_office_id BIGINT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  SELECT COALESCE(
    json_agg(
      (jsonb_build_object('id', id::text, 'name', name) || payload)
      ORDER BY name
    ),
    '[]'::json
  ) INTO v_result
  FROM public.gtr30_budget_heads
  WHERE office_id = p_office_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Wholesale replace the office's budget heads.
CREATE OR REPLACE FUNCTION public.upsert_gtr30_budget_heads(
  p_office_id BIGINT,
  p_heads JSONB
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  IF p_heads IS NULL OR p_heads = 'null'::jsonb THEN
    p_heads := '[]'::jsonb;
  END IF;

  DELETE FROM public.gtr30_budget_heads
  WHERE office_id = p_office_id;

  INSERT INTO public.gtr30_budget_heads (id, office_id, name, payload, updated_at)
  SELECT
    COALESCE((r->>'id')::uuid, gen_random_uuid()),
    p_office_id,
    COALESCE(r->>'name', ''),
    COALESCE(r - 'id' - 'name', '{}'::jsonb),
    NOW()
  FROM jsonb_array_elements(p_heads) AS r;

  RETURN public.get_gtr30_budget_heads(p_office_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
