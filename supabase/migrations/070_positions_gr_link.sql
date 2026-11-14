-- ============================================================================
-- 070_positions_gr_link.sql
-- Link each sanctioned position to a single Government Resolution (gr_repository)
-- so multiple posts sharing the same resolution order point to ONE GR row,
-- deduplicating resolution_note / resolution_pdf_url storage and revealing
-- how each post is sanctioned in the establishment register.
-- ============================================================================

BEGIN;

-- 1. Add gr_id FK to positions (nullable: not every post is GR-sanctioned)
ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS gr_id UUID
    REFERENCES public.gr_repository(id) ON DELETE SET NULL;

-- 2. Index for lookups by GR (e.g. "all posts sanctioned by GR X")
CREATE INDEX IF NOT EXISTS idx_positions_gr_id ON public.positions(gr_id);

-- 3. Backfill gr_id from existing resolution_pdf_url where possible:
--    match positions whose resolution_pdf_url equals a gr_repository public URL.
--    (Best-effort; rows without a match keep gr_id NULL.)
--
--    The legacy key column is named `r2_object_key` here, but migration 071
--    renames it to `storage_path`. If 071 has already been applied there is no
--    legacy key to match against, so the backfill is skipped (it was completed
--    before the column rename).
DO $$
DECLARE
  v_has_legacy_key BOOLEAN;
  gr_rec RECORD;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gr_repository'
      AND column_name = 'r2_object_key'
  ) INTO v_has_legacy_key;

  IF v_has_legacy_key THEN
    FOR gr_rec IN
      SELECT id, r2_object_key FROM public.gr_repository
    LOOP
      UPDATE public.positions p
      SET gr_id = gr_rec.id
      WHERE p.gr_id IS NULL
        AND p.resolution_pdf_url IS NOT NULL
        AND p.resolution_pdf_url ILIKE '%' || gr_rec.r2_object_key || '%';
    END LOOP;
  END IF;
END $$;

COMMIT;
