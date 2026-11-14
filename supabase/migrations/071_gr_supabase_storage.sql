-- ============================================================================
-- 071_gr_supabase_storage.sql
-- Store GR PDFs in a private Supabase Storage bucket.
--
-- Object layout:  gr/{gr_repository.id}/{unique}-{file-name}.pdf
--
-- The one-off copy of legacy Cloudflare R2 objects into this bucket was
-- completed before R2 was decommissioned. A fresh environment only needs
-- this migration: there is no external object storage to import from.
-- ============================================================================

BEGIN;

-- 1. Vendor-neutral storage key column --------------------------------------
--    Existing values are kept as-is. The copy script rewrites them to the new
--    `gr/{id}/...` layout.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gr_repository'
      AND column_name = 'r2_object_key'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gr_repository'
      AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE public.gr_repository RENAME COLUMN r2_object_key TO storage_path;
  END IF;
END $$;

-- 2. Private bucket ----------------------------------------------------------
--    50 MB per file, PDFs only. Mirrors MAX_PDF_SIZE_BYTES in the app.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gr-documents',
  'gr-documents',
  false,
  52428800,
  ARRAY['application/pdf', 'application/x-pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Per-GR access helper ----------------------------------------------------
--    SECURITY DEFINER so storage RLS can evaluate the GR visibility rules
--    without recursively depending on storage policies.
--
--    NOTE: do NOT use public.is_admin() here. In single-office mode that
--    helper is defined as `auth.uid() IS NOT NULL`, i.e. true for every
--    authenticated user, which would expose private/restricted GR PDFs to
--    everyone. Access intentionally mirrors GRRepositoryService.canUserReadGR():
--    public GRs are readable by every authenticated user; everything else
--    (internal/private/restricted) only by the owner, creator or an assignee.
CREATE OR REPLACE FUNCTION public.can_access_gr_document(p_object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gr_repository g
    WHERE g.id::text = split_part(p_object_name, '/', 2)
      AND (
        g.visibility = 'public'
        OR g.owner_user_id = auth.uid()
        OR g.created_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.gr_repository_access a
          WHERE a.gr_id = g.id
            AND a.user_id = auth.uid()
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_gr_document(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_gr_document(TEXT) TO authenticated;

-- 4. Storage RLS -------------------------------------------------------------
--    Reads are per-GR (visibility aware). Writes only require an authenticated
--    office user plus the `gr/` prefix, because a GR row is inserted *after*
--    its PDF is uploaded, and orphaned uploads must remain deletable.

DROP POLICY IF EXISTS "gr_documents_select" ON storage.objects;
CREATE POLICY "gr_documents_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'gr-documents'
    AND (storage.foldername(name))[1] = 'gr'
    AND public.can_access_gr_document(name)
  );

DROP POLICY IF EXISTS "gr_documents_insert" ON storage.objects;
CREATE POLICY "gr_documents_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gr-documents'
    AND (storage.foldername(name))[1] = 'gr'
  );

DROP POLICY IF EXISTS "gr_documents_update" ON storage.objects;
CREATE POLICY "gr_documents_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'gr-documents'
    AND (storage.foldername(name))[1] = 'gr'
  )
  WITH CHECK (
    bucket_id = 'gr-documents'
    AND (storage.foldername(name))[1] = 'gr'
  );

DROP POLICY IF EXISTS "gr_documents_delete" ON storage.objects;
CREATE POLICY "gr_documents_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'gr-documents'
    AND (storage.foldername(name))[1] = 'gr'
  );

COMMIT;
