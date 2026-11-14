-- 018_legacy_migration_marks.sql
-- The live account-icdp database was provisioned via SQL-editor scripts
-- (remediation.sql, bigint office_id schema) rather than the migration chain,
-- so the UUID-era migrations 002-005 and 007 must never run against it.
-- This records them as applied so `supabase db push` proceeds cleanly.
-- On fresh environments these rows already exist when this runs (no-op).

INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES
  ('002', '{}', '002_rls_policies'),
  ('003', '{}', '003_admin_functions'),
  ('004', '{}', '004_admin_overhaul'),
  ('005', '{}', '005_employees_add_hprn_no'),
  ('007', '{}', '007_employee_salaries_office_writes')
ON CONFLICT (version) DO NOTHING;