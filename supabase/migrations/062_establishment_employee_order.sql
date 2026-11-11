-- 062_establishment_employee_order.sql
-- Employee-specific sequence for the Establishment Directory (/establishment).
-- Reports (Paybill monthly matrix, etc.) must reflect this order instead of A-Z.
--
-- Pattern mirrors positions.display_order (060) and gtr30_employee_master.sr_no:
--   NULL = legacy row never arranged -> sorts after every arranged row, name breaks tie.

BEGIN;

ALTER TABLE public.establishment_employees
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Backfill 1..N in current alphabetical order so existing installs keep a
-- stable sequence instead of all-NULL.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name, hrpn_no NULLS LAST, id) AS rn
  FROM public.establishment_employees
  WHERE display_order IS NULL
)
UPDATE public.establishment_employees e
SET display_order = ordered.rn,
    updated_at = NOW()
FROM ordered
WHERE e.id = ordered.id;

CREATE INDEX IF NOT EXISTS idx_establishment_employees_display_order
  ON public.establishment_employees(display_order);

COMMIT;
