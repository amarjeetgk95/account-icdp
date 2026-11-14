-- ============================================================================
-- 041_fix_user_cascade_deletions.sql
-- Fix foreign key constraints on auth.users and public.profiles so deleting users
-- in Supabase Auth Dashboard never fails with database errors or constraint violations.
-- ============================================================================

BEGIN;

-- 1. salary_imports (uploaded_by)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.salary_imports'::regclass
      AND confrelid = 'public.profiles'::regclass
  ) LOOP
    EXECUTE 'ALTER TABLE public.salary_imports DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE public.salary_imports
  ADD CONSTRAINT fk_salary_imports_uploaded_by
  FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- 2. paybill_vouchers (posted_by)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.paybill_vouchers'::regclass
      AND confrelid = 'public.profiles'::regclass
  ) LOOP
    EXECUTE 'ALTER TABLE public.paybill_vouchers DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE public.paybill_vouchers
  ADD CONSTRAINT fk_paybill_vouchers_posted_by
  FOREIGN KEY (posted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- 3. form16_certificates (issued_by & created_by)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.form16_certificates'::regclass
      AND confrelid = 'public.profiles'::regclass
  ) LOOP
    EXECUTE 'ALTER TABLE public.form16_certificates DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE public.form16_certificates
  ADD CONSTRAINT fk_form16_certificates_issued_by
  FOREIGN KEY (issued_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.form16_certificates
  ADD CONSTRAINT fk_form16_certificates_created_by
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- 4. form16_audit_trail (actor_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form16_audit_trail') THEN
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.form16_audit_trail'::regclass
          AND confrelid = 'public.profiles'::regclass
      ) LOOP
        EXECUTE 'ALTER TABLE public.form16_audit_trail DROP CONSTRAINT ' || quote_ident(r.conname);
      END LOOP;
    END;

    ALTER TABLE public.form16_audit_trail
      ADD CONSTRAINT fk_form16_audit_actor_id
      FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;


-- 5. gr_document_relations (created_by)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gr_document_relations') THEN
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.gr_document_relations'::regclass
          AND confrelid = 'auth.users'::regclass
      ) LOOP
        EXECUTE 'ALTER TABLE public.gr_document_relations DROP CONSTRAINT ' || quote_ident(r.conname);
      END LOOP;
    END;

    ALTER TABLE public.gr_document_relations
      ADD CONSTRAINT fk_gr_relations_created_by
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;


-- 6. gr_repository (owner_user_id & created_by)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gr_repository') THEN
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.gr_repository'::regclass
          AND confrelid = 'public.profiles'::regclass
      ) LOOP
        EXECUTE 'ALTER TABLE public.gr_repository DROP CONSTRAINT ' || quote_ident(r.conname);
      END LOOP;
    END;

    ALTER TABLE public.gr_repository
      ADD CONSTRAINT fk_gr_repository_owner
      FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

    ALTER TABLE public.gr_repository
      ADD CONSTRAINT fk_gr_repository_created_by
      FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;


-- 7. gr_repository_access (user_id & created_by)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gr_repository_access') THEN
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.gr_repository_access'::regclass
          AND confrelid = 'public.profiles'::regclass
      ) LOOP
        EXECUTE 'ALTER TABLE public.gr_repository_access DROP CONSTRAINT ' || quote_ident(r.conname);
      END LOOP;
    END;

    ALTER TABLE public.gr_repository_access
      ADD CONSTRAINT fk_gr_access_user
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    ALTER TABLE public.gr_repository_access
      ADD CONSTRAINT fk_gr_access_created_by
      FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
