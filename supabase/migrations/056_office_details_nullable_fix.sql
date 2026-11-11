-- ============================================================================
-- 056_office_details_nullable_fix.sql
-- Fix: "null value in column address violates not-null constraint" on save.
-- 001_initial_schema created office_details columns as NULLABLE, but the
-- live DB drifted to NOT NULL while the app sends NULL for empty inputs
-- (and Zod allows empty strings for all fields). Align DB with the app:
-- all office_details text fields are optional single-office settings.
-- Code fix (office.repository.ts) now sends '' instead of NULL, so this
-- migration is the safety net for any NULL-tolerant client.
-- ============================================================================

BEGIN;

ALTER TABLE public.office_details ALTER COLUMN office_name DROP NOT NULL;
ALTER TABLE public.office_details ALTER COLUMN subtitle DROP NOT NULL;
ALTER TABLE public.office_details ALTER COLUMN address DROP NOT NULL;
ALTER TABLE public.office_details ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.office_details ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.office_details ALTER COLUMN gst DROP NOT NULL;
ALTER TABLE public.office_details ALTER COLUMN tan DROP NOT NULL;

COMMIT;
