-- ============================================================================
-- 068_positions_headquarter.sql
-- Headquarter / centre label for a sanctioned post. Kept on the position (not
-- the employee) so the same designation can be reported as one post type.
-- ============================================================================

BEGIN;

ALTER TABLE public.positions
    ADD COLUMN IF NOT EXISTS headquarter TEXT;

COMMENT ON COLUMN public.positions.headquarter IS
    'Gujarati headquarter/centre label for this sanctioned post (directory display only; reports group by designation).';

COMMIT;
