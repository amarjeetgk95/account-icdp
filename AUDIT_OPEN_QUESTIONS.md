# ICDP Existing System — Audit Open Questions & Discovery Gaps

**Date of Audit:** October 9, 2026  
**Auditor:** Antigravity Discovery Audit Engine  
**Target Repository:** `E:\account-icdp\icdp-modern`  
**Classification:** Unresolved Technical and Domain Uncertainties  

---

## 1. Overview of Audit Limitations

In accordance with the mandatory safety rules, this discovery audit operated strictly in a **read-only** mode. No source code was modified, no database writes or migrations were executed, no secrets were printed, and no live production PII was exported.

While static code analysis, bundle measurements, and repository migration reviews achieved comprehensive coverage of the application's structure, several runtime and domain questions cannot be resolved without explicit administrative access and domain stakeholder input.

---

## 2. Inventory of Unresolved Questions & Required Evidence

### 2.1 Live Production Database vs. Repository Schema Drift
- **The Uncertainty:**
  The repository contains 11 uncommitted/untracked migration files: `040_gr_repository.sql` through `050_paybill_fix_jan_feb_financial_year.sql`. Migration `043` drops `office_id` columns, migration `044` flattens RLS to `auth.uid() IS NOT NULL`, and migration `049` drops administrative RPCs. It is unknown whether these migrations have been applied to the live production Supabase PostgreSQL database, or if production is currently running on an earlier schema (e.g. migration `039`).
- **Potential Risk:**
  Designing an ICDP V2 migration based on `050` when production is actually at `039` (or vice versa) could result in migration failure or data corruption.
- **Evidence Needed to Resolve:**
  Read-only query execution against the production database's migration tracking table:
  ```sql
  SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 20;
  ```
  Or checking column existence:
  ```sql
  SELECT table_name, column_name 
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND column_name = 'office_id';
  ```

---

### 2.2 Canonical Source of Truth for Historical Employee Records
- **The Uncertainty:**
  Employee records currently exist across three separate tables:
  1. `employees`: Historical roster used for 24Q TDS.
  2. `gtr30_employee_master`: Grouped by month and bill code, containing 7th pay commission details and allowances.
  3. `establishment_employees`: Intended canonical register containing designations in Gujarati and cadre classes.
  It is unverified which of these tables contains the most accurate, up-to-date staff roster for current operations.
- **Potential Risk:**
  Migrating the wrong table to V2 could discard historical PANs, Gujarati designations, or pay levels.
- **Evidence Needed to Resolve:**
  Comparative aggregate count and field nullability query across the three tables (without viewing PII):
  ```sql
  SELECT 'employees' AS tbl, count(*), count(hprn_no), count(pan) FROM public.employees
  UNION ALL
  SELECT 'gtr30_employee_master', count(DISTINCT coalesce(hrpn_no, name)), count(hrpn_no), count(pan_no) FROM public.gtr30_employee_master
  UNION ALL
  SELECT 'establishment_employees', count(*), count(hrpn_no), count(pan) FROM public.establishment_employees;
  ```

---

### 2.3 GR PDF Remote Storage Deployment Status — RESOLVED & R2 DECOMMISSIONED
- **Resolution (migration `071_gr_supabase_storage.sql`):**
  GR PDFs now live in the **private** Supabase Storage bucket `gr-documents`; the browser-side R2/IndexedDB dual storage was removed. Files are served through short-lived signed URLs, and object paths follow `gr/{gr_repository.id}/{unique}-{file}.pdf`.
- **Migration completed:** all legacy R2 objects were copied into Supabase Storage, verified in the GR Repository, and the R2 bucket (`icdp-gr-repository`) was emptied. R2 credentials and tooling have been removed from the application and repository.
- **Remaining action (infrastructure only):** delete the now-empty `icdp-gr-repository` bucket and revoke its R2 API token in the Cloudflare dashboard.

---

### 2.4 Status of the Python OCR Server (`scripts/ocr_server.py`)
- **The Uncertainty:**
  `scripts/ocr_server.py` is present in the repository, but the frontend only exposes a manual text paste modal (`OcrFallbackModal.tsx`). The larger `pdf-tools` module that previously interfaced with OCR was deleted in commit `a859050` (August 25, 2026). It is unknown whether operators still run `ocr_server.py` locally or if the script is dead code.
- **Potential Risk:**
  Wasting engineering effort porting or maintaining Python OCR dependencies in V2 if the tool is obsolete.
- **Evidence Needed to Resolve:**
  Confirmation from the ICDP Surat operational staff: Do operators currently run `python scripts/ocr_server.py` on their desktop workstations?

---

### 2.5 Applicability of the Old Income Tax Regime (Pre-115BAC)
- **The Uncertainty:**
  The current Form-16 calculation engine ([src/modules/paybill/services/form16Calculation.service.ts](file:///e:/account-icdp/icdp-modern/src/modules/paybill/services/form16Calculation.service.ts)) is built strictly around the New Tax Regime under Section 115BAC. It has minimal support for Old Tax Regime calculations (Chapter VI-A deductions u/s 80C, 80D, 80G, HRA exemptions u/s 10(13A), or standard deduction rules for the old regime).
- **Potential Risk:**
  If any government employees at ICDP Surat have opted for the Old Tax Regime, their Form-16 certificates cannot be accurately computed by the current application.
- **Evidence Needed to Resolve:**
  Confirmation from the DDO / Tax Accountant: Has ICDP Surat transitioned 100% of its staff to the New Tax Regime (Section 115BAC), or must V2 support dual-regime tax computation?

---

### 2.6 Multi-Office Architecture Requirements for ICDP V2
- **The Uncertainty:**
  The project originally contained a full multi-office architecture with `offices`, `office_id` columns, and an `admin` module. It was converted to a "single-office" model specifically for Surat. It is unknown whether ICDP V2 is intended solely for the Surat office or if it will eventually be rolled out to other ICDP regional offices across Gujarat (e.g. Vadodara, Mehsana, Ahmedabad, Rajkot).
- **Potential Risk:**
  Designing V2 as single-tenant would require a massive database refactor if multi-office deployment is requested later; conversely, over-engineering multi-tenancy adds unnecessary operational overhead if Surat is the sole beneficiary.
- **Evidence Needed to Resolve:**
  Product roadmap confirmation from project leadership regarding multi-office scope.

---

### 2.7 Historical Data Retention and Migration Scope
- **The Uncertainty:**
  The application handles historical financial years spanning FY 2021-22 to FY 2026-27. It is unresolved whether an ICDP V2 rebuild must perform a complete data migration of all legacy paybill PDFs, salary records, and issued Form-16 certificates, or if V2 will start from a clean slate for the upcoming financial year with V1 archived as read-only.
- **Potential Risk:**
  Full data migration from V1 to V2 will require writing custom data cleansing scripts to reconcile discrepancies between `employees`, `gtr30_employee_master`, and `paybill_employee_earnings`.
- **Evidence Needed to Resolve:**
  Stakeholder decision on data migration strategy (Cold Cutover vs Historical ETL Migration).
