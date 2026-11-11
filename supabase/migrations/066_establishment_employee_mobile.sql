-- ============================================================================
-- 066_establishment_employee_mobile.sql
-- Canonical employee contact details, history indexes, and safeguards for
-- the Position-Governed Establishment Register.
-- ============================================================================

BEGIN;

-- 1. Add canonical contact and bilingual name columns
ALTER TABLE public.establishment_employees
    ADD COLUMN IF NOT EXISTS name_gu TEXT,
    ADD COLUMN IF NOT EXISTS mobile_no TEXT;

-- 2. Backfill mobile_no if quarters_address was previously used to store phone numbers
UPDATE public.establishment_employees
SET mobile_no = btrim(quarters_address)
WHERE mobile_no IS NULL
  AND quarters_address ~ '^[0-9+ -]{10,15}$';

-- 3. Composite indexes for high-speed posting history queries
CREATE INDEX IF NOT EXISTS idx_pos_hist_employee_dates 
    ON public.position_history(employee_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_pos_hist_position_dates 
    ON public.position_history(position_id, start_date DESC);

-- 4. Foreign key safety: prevent deleting an employee while actively assigned to a post
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'positions_current_employee_id_fkey'
          AND table_name = 'positions'
    ) THEN
        ALTER TABLE public.positions DROP CONSTRAINT positions_current_employee_id_fkey;
    END IF;
    ALTER TABLE public.positions
        ADD CONSTRAINT positions_current_employee_id_fkey
        FOREIGN KEY (current_employee_id)
        REFERENCES public.establishment_employees(id)
        ON DELETE RESTRICT;
END $$;

-- 5. Safely drop obsolete legacy aggregate table (superseded by positions)
DROP TABLE IF EXISTS public.establishment_posts CASCADE;

COMMIT;

