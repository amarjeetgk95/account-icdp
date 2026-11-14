-- 069_gtr30_gtr44_list_performance.sql
-- Standalone list-screen performance for GTR-30 and GTR-44.
-- Adds ordering indexes and lightweight GTR-30 summary columns so the bill
-- register queries do not need to download the full JSONB document.

-- =====================================================================
-- GTR-30
-- =====================================================================

-- The register lists bills with ORDER BY created_at DESC and no office
-- predicate (single-office mode), so the legacy (office_id, ...) indexes
-- cannot serve the sort.
CREATE INDEX IF NOT EXISTS idx_gtr30_bills_created_at
  ON public.gtr30_bills (created_at DESC);

-- Summary columns derived from the JSONB snapshot.
ALTER TABLE public.gtr30_bills
  ADD COLUMN IF NOT EXISTS office_name text
    GENERATED ALWAYS AS (data->>'officeName') STORED,
  ADD COLUMN IF NOT EXISTS employee_count integer
    GENERATED ALWAYS AS (
      CASE
        WHEN jsonb_typeof(data->'employees') = 'array'
          THEN jsonb_array_length(data->'employees')
        ELSE 0
      END
    ) STORED;

-- Employee names are used by the register search box. string_agg is an
-- aggregate, so this column is trigger-maintained instead of generated.
ALTER TABLE public.gtr30_bills
  ADD COLUMN IF NOT EXISTS employee_names text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.gtr30_bills_refresh_employee_names()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT COALESCE(string_agg(e->>'name', ' '), '')
    INTO NEW.employee_names
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(NEW.data->'employees') = 'array'
        THEN NEW.data->'employees'
      ELSE '[]'::jsonb
    END
  ) AS e;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gtr30_bills_employee_names ON public.gtr30_bills;
CREATE TRIGGER trg_gtr30_bills_employee_names
  BEFORE INSERT OR UPDATE OF data ON public.gtr30_bills
  FOR EACH ROW EXECUTE FUNCTION public.gtr30_bills_refresh_employee_names();

-- Backfill existing bills.
UPDATE public.gtr30_bills
SET employee_names = COALESCE((
  SELECT string_agg(e->>'name', ' ')
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(data->'employees') = 'array'
        THEN data->'employees'
      ELSE '[]'::jsonb
    END
  ) AS e
), '');

-- =====================================================================
-- GTR-44
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_gtr44_bills_created_at
  ON public.gtr44_bills (created_at DESC);
