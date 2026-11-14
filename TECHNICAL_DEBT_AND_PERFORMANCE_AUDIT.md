# ICDP Existing System — Technical Debt and Performance Audit

**Date of Audit:** October 9, 2026  
**Auditor:** Antigravity Discovery Audit Engine  
**Target Repository:** `E:\account-icdp\icdp-modern`  
**Classification:** Technical Debt, Reliability, Security, & Operational Assessment  

---

## 1. Executive Assessment & Risk Matrix

| Severity | Finding Count | Primary Categories | Critical Risk Summary |
|---|---|---|---|
| **P0 — Critical** | 5 | Security, Data Integrity, Transactionality | Universal RLS bypass on all 39 tables, non-transactional destructive deletions, dual-storage divergence, hardcoded fallback secrets. |
| **P1 — High** | 5 | Architecture, Performance, Bundling | 1.67 MB PDF.js chunk, redundant dual spreadsheet engines, JSONB database sprawl, monolithic 1,500 LOC views, circular module dependencies. |
| **P2 — Medium** | 5 | Maintainability, Correctness, Testing | Client-side tax computation drift, lack of DB-level constraints, single-office hardcoded shims, orphaned Python OCR script, hanging unit tests. |
| **P3 — Low** | 3 | Code Quality, Cleanliness | Duplicate currency utilities, inconsistent date formatting, dirty git workspace status. |

---

## 2. Priority 0 (P0) — Data Integrity, Security, & Critical Correctness Risks

### [P0-1] Universal Open Row-Level Security Policy on All Public Tables
- **Description:** Migration `044_master_single_office_unlock.sql` dynamically stripped all granular table policies and created a universal policy allowing any authenticated user to perform `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on all 39 tables.
- **Evidence & File References:**
  - [supabase/migrations/044_master_single_office_unlock.sql](file:///e:/account-icdp/icdp-modern/supabase/migrations/044_master_single_office_unlock.sql#L63-L67):
    ```sql
    EXECUTE format(
      'CREATE POLICY "allow_authenticated_all" ON public.%I FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);',
      r.table_name
    );
    EXECUTE format('GRANT ALL ON TABLE public.%I TO authenticated;', r.table_name);
    ```
  - [src/core/permissions/hooks.ts](file:///e:/account-icdp/icdp-modern/src/core/permissions/hooks.ts#L21-L24): `isAdmin: true as const, isOffice: true as const`.
- **Actual Impact / Risk:** Any user with a valid login token can use browser developer tools or PostgREST cURL calls to alter or truncate all salary data, paybills, tax transactions, or audit logs. There is zero authorization boundaries in the database.
- **Confidence:** **Confirmed (Direct Code & Migration Evidence)**.
- **Dependencies / Regressions:** Restoring strict RLS requires auditing which tables need public read vs office write vs admin restriction.
- **Recommendation:** **Refactor / Redesign in V2**. Implement strict role-based RLS policies at the PostgreSQL level.

---

### [P0-2] Non-Transactional Destructive Deletions in GTR-30 Master Backend
- **Description:** When the backend RPC `upsert_gtr30_employee_master` fails or is unavailable, the fallback repository code deletes all existing employees for that month and bill code, then iterates sequentially through an `await` insert loop.
- **Evidence & File References:**
  - [src/modules/gtr30/repositories/gtr30EmployeeMasterBackend.repository.ts](file:///e:/account-icdp/icdp-modern/src/modules/gtr30/repositories/gtr30EmployeeMasterBackend.repository.ts#L148-L180):
    ```typescript
    // Fallback 1. Delete existing for this monthKey + billCode
    await supabase.from('gtr30_employee_master').delete().ilike('month_key', monthKey).ilike('bill_code', billCode);
    // 2. Insert new list one by one
    for (const emp of employees) {
      await supabase.from('gtr30_employee_master').insert({ ... });
    }
    ```
- **Actual Impact / Risk:** If the network drops or the browser tab closes after row 5 of 50, the previous 50 employees are gone and only 5 exist in the database. Irreversible data loss with no rollback.
- **Confidence:** **Confirmed (Direct Code Evidence)**.
- **Dependencies / Regressions:** `gtr30EmployeeMasterBackend.repository.ts`.
- **Recommendation:** **Replace**. Enforce single atomic transactional RPCs or batch multi-row `insert()` payloads.

---

### [P0-3] Hardcoded Fallback Credentials in Frontend Source Code
- **Description:** The Supabase client initialization in [src/core/supabase/client.ts](file:///e:/account-icdp/icdp-modern/src/core/supabase/client.ts#L4-L8) provides hardcoded string fallbacks for `DEFAULT_SUPABASE_URL` and `DEFAULT_SUPABASE_ANON_KEY` when environment variables are omitted.
- **Evidence & File References:**
  - [src/core/supabase/client.ts](file:///e:/account-icdp/icdp-modern/src/core/supabase/client.ts#L4-L8):
    ```typescript
    const DEFAULT_SUPABASE_URL = 'https://terjvhdjfbyfvimwwdxl.supabase.co';
    const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_...';
    ```
- **Actual Impact / Risk:** Any repository leak, fork, or build exposes the live Supabase project instance. Combined with [P0-1], any actor obtaining the anon key can perform full CRUD across all tables.
- **Confidence:** **Confirmed (Direct Code Evidence)**.
- **Recommendation:** **Refactor**. Remove hardcoded fallback strings immediately; throw an explicit startup error if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing.

---

### [P0-4] Dual Storage Synchronization (LocalStorage vs PostgreSQL)
- **Description:** GTR-30 and Establishment modules implement an optimistic local-first caching layer where writes update browser `localStorage` first and asynchronously debounce background syncs to Supabase.
- **Evidence & File References:**
  - [src/modules/gtr30/services/gtr30EmployeeMaster.service.ts](file:///e:/account-icdp/icdp-modern/src/modules/gtr30/services/gtr30EmployeeMaster.service.ts#L12-L40): `SYNC_DEBOUNCE_MS = 600`, `SYNC_STORAGE_KEY = 'gtr30:syncPhases'`.
  - [src/modules/establishment/services/establishment.service.ts](file:///e:/account-icdp/icdp-modern/src/modules/establishment/services/establishment.service.ts#L23-L34): `syncEmployees()` silently falls back to local cache on error.
- **Actual Impact / Risk:** When multiple staff members open the app on different workstations, or if browser local storage is cleared, records silently diverge. There is no distributed locking or conflict resolution.
- **Confidence:** **Confirmed (Direct Code Evidence)**.
- **Recommendation:** **Replace**. Standardize on TanStack Query as the single source of truth backed directly by PostgreSQL transactions.

---

### [P0-5] Triplicated Employee Masters and Competing Salary Stores
- **Description:** Staff identity and monthly salary records are split across three unconnected schemas (`employees` + `employee_salaries`, `gtr30_employee_master`, and `establishment_employees` + `paybill_employee_earnings`).
- **Evidence & File References:**
  - [supabase/migrations/030_establishment_payroll_backfill.sql](file:///e:/account-icdp/icdp-modern/supabase/migrations/030_establishment_payroll_backfill.sql): Migration created to copy records from `employees` to `establishment_employees`.
  - [supabase/migrations/032_establishment_backfill_enriched.sql](file:///e:/account-icdp/icdp-modern/supabase/migrations/032_establishment_backfill_enriched.sql): Migration created to copy records from `gtr30_employee_master` to `establishment_employees`.
  - [src/modules/payroll/services/taxReconciliation.service.ts](file:///e:/account-icdp/icdp-modern/src/modules/payroll/services/taxReconciliation.service.ts): 492 lines of bridge code to reconcile discrepancies between paybill PDFs and manual salaries.
- **Actual Impact / Risk:** Updates made to an employee's designation or salary in Establishment are invisible in GTR-30 Pay Bills; updates in Pay Bills are invisible in Form 24Q Quarterly returns.
- **Confidence:** **Confirmed (Direct Code & Migration Evidence)**.
- **Recommendation:** **Replace in V2**. Design a single canonical relational employee master and salary transaction ledger.

---

## 3. Priority 1 (P1) — Architectural & Performance Bottlenecks

### [P1-1] 1.67 MB `pdfjs` Chunk & Main-Thread PDF Processing
- **Description:** In-browser PDF extraction using `unpdf` bundles Mozilla PDF.js into a single JavaScript chunk measuring **1,672 KB** (1.67 MB).
- **Evidence & File References:**
  - Build artifact: `dist/assets/pdfjs-BpwMGDug.js` (1,672,554 bytes).
  - [src/modules/paybill/services/pdfParser.service.ts](file:///e:/account-icdp/icdp-modern/src/modules/paybill/services/pdfParser.service.ts#L61): `const { extractText, getDocumentProxy } = await import('unpdf');`.
- **Actual Impact / Risk:** Significant memory footprint and initial parse latency. Extracting 40-page PDF salary bills locks the browser main thread during coordinate and text matching.
- **Confidence:** **Confirmed (Disk Measurement & Code Evidence)**.
- **Recommendation:** **Refactor**. Move heavy PDF parsing to a backend worker/Edge Function or offload extraction to Web Workers.

---

### [P1-2] Redundant Dual Spreadsheet Engines (`exceljs` + `xlsx`)
- **Description:** The codebase imports both `exceljs` (for styled exports) and `xlsx` SheetJS (for parsing), together adding over **800 KB** of bundle weight.
- **Evidence & File References:**
  - Build artifacts: `dist/assets/xlsx-D_0l8YDs.js` (429 KB), `dist/assets/index.es-*.js` (ExcelJS, 150 KB).
  - [src/modules/paybill/services/paybillExcel.service.ts](file:///e:/account-icdp/icdp-modern/src/modules/paybill/services/paybillExcel.service.ts#L1): `import type ExcelJS from 'exceljs'`.
  - [src/modules/payroll/services/salary.service.ts](file:///e:/account-icdp/icdp-modern/src/modules/payroll/services/salary.service.ts#L1): `import type { WorkBook } from 'xlsx'`.
- **Actual Impact / Risk:** Redundant dependency footprint, dual maintenance overhead, memory duplication.
- **Confidence:** **Confirmed (Direct Code & Disk Measurement)**.
- **Recommendation:** **Refactor**. Standardize on a single modern spreadsheet engine or backend generation.

---

### [P1-3] Broad Queries (`select('*')`) and JSONB Sprawl Anti-Pattern
- **Description:** Repositories consistently execute un-projected `.select('*')` on tables containing massive JSONB columns.
- **Evidence & File References:**
  - [src/modules/gtr30/repositories/billRegister.repository.ts](file:///e:/account-icdp/icdp-modern/src/modules/gtr30/repositories/billRegister.repository.ts#L86): `supabase.from('gtr30_bills').select('*')` loads complete 10-page JSON forms for every bill just to render a summary register.
  - [src/modules/gtr44/repositories/gtr44BillsBackend.repository.ts](file:///e:/account-icdp/icdp-modern/src/modules/gtr44/repositories/gtr44BillsBackend.repository.ts#L22): `supabase.from('gtr44_bills').select('*')`.
- **Actual Impact / Risk:** Network payloads balloon as more bills are created. Inability to index itemized sub-voucher costs.
- **Confidence:** **Confirmed (Direct Code Evidence)**.
- **Recommendation:** **Refactor**. Normalize line items into child relational tables and use strict column projections on list views.

---

### [P1-4] Monolithic 1,000+ LOC UI Views & Duplicated Form-16 Editors
- **Description:** Multiple core screens exceed 1,200 LOC and contain duplicate implementations of the same business functionality.
- **Evidence & File References:**
  - `Form16EditorPage.tsx` (**1,534 LOC**) vs. `Form16EditorModal.tsx` (**1,159 LOC**): 2,700 lines of nearly identical Form 16 Part A and Part B form logic.
  - `GTR30CreatePage.tsx` (**1,531 LOC**).
  - `PayBillLegacyDataEditor.tsx` (**1,406 LOC**).
  - `GTR30EmployeeMasterForm.tsx` (**1,225 LOC**).
- **Actual Impact / Risk:** Bugs fixed in `Form16EditorModal.tsx` remain unpatched in `Form16EditorPage.tsx`. High cognitive load and fragile maintenance.
- **Confidence:** **Confirmed (Line Count Measurement & Symbol Search)**.
- **Recommendation:** **Refactor**. Extract shared form sections into unified reusable atomic components.

---

### [P1-5] Circular and Tight Cross-Module Dependencies
- **Description:** Modules violate their independent vertical-slice contract by importing each other's private services and repositories.
- **Evidence & File References:**
  - [src/modules/payroll/repositories/taxReconciliation.repository.ts](file:///e:/account-icdp/icdp-modern/src/modules/payroll/repositories/taxReconciliation.repository.ts#L2) imports `paybillRepository` from `@/modules/paybill`.
  - [src/modules/paybill/hooks/useEmployeeDirectory.ts](file:///e:/account-icdp/icdp-modern/src/modules/paybill/hooks/useEmployeeDirectory.ts#L4) imports `employeeService` from `@/modules/payroll`.
  - [src/modules/settings/pages/SettingsPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/settings/pages/SettingsPage.tsx#L5-L6) imports views directly from `gtr30` and `gtr44`.
- **Actual Impact / Risk:** Changes to paybill data structures inadvertently break payroll reconciliation; feature flags cannot disable modules cleanly.
- **Confidence:** **Confirmed (Direct Code Evidence)**.
- **Recommendation:** **Refactor**. Decouple shared concerns into `@/core` or `@/shared/domain` services.

---

## 4. Priority 2 (P2) — Maintainability & Operational Improvements

### [P2-1] Client-Side Indian Income Tax Computation u/s 115BAC
- **Description:** Statutory tax computation (slabs, Section 16(ia) standard deduction, Section 87A rebate, cess, surcharge) runs entirely in client-side TypeScript.
- **Evidence & File References:**
  - [src/modules/paybill/services/form16Calculation.service.ts](file:///e:/account-icdp/icdp-modern/src/modules/paybill/services/form16Calculation.service.ts).
- **Actual Impact / Risk:** Any discrepancy between client calculation and statutory IT rules requires a frontend re-deployment. No server-side audit trail of how tax was calculated.
- **Confidence:** **Confirmed (Direct Code Evidence)**.
- **Recommendation:** **Refactor**. Implement tax calculation as a versioned backend function or pure shared domain engine with regression test suites.

---

### [P2-2] Missing Database Constraints on Financial Totals
- **Description:** Net totals, gross totals, and deduction sums in `gtr30_bills`, `gtr44_bills`, and `paybill_vouchers` are plain `NUMERIC` columns with no `CHECK` constraints verifying `net = gross - deductions`.
- **Evidence & File References:**
  - [supabase/migrations/024_gtr30_bills_backend.sql](file:///e:/account-icdp/icdp-modern/supabase/migrations/024_gtr30_bills_backend.sql).
  - [supabase/migrations/026_gtr44_backend.sql](file:///e:/account-icdp/icdp-modern/supabase/migrations/026_gtr44_backend.sql).
- **Actual Impact / Risk:** Erroneous or malicious payloads can store mathematically impossible financial records.
- **Confidence:** **Confirmed (Migration Schema Inspection)**.
- **Recommendation:** **Refactor**. Add PostgreSQL check constraints and generated columns for balance integrity.

---

### [P2-3] Hardcoded Single-Office Shim (`DEFAULT_OFFICE_ID = '1'`)
- **Description:** Multi-office removal was handled by introducing a shim in [src/shared/utilities/office.ts](file:///e:/account-icdp/icdp-modern/src/shared/utilities/office.ts#L7) returning `'1'`, while earlier database schemas expected UUIDs.
- **Evidence & File References:**
  - [src/shared/utilities/office.ts](file:///e:/account-icdp/icdp-modern/src/shared/utilities/office.ts#L7): `export const DEFAULT_OFFICE_ID = '1';`.
- **Actual Impact / Risk:** Mismatch between string integer `'1'` and database UUID columns; lingering dead code across older repositories.
- **Confidence:** **Confirmed (Direct Code Evidence)**.
- **Recommendation:** **Refactor**. Completely remove office scoping shims in V2.

---

### [P2-4] Standalone Orphaned Python OCR Server Script
- **Description:** [scripts/ocr_server.py](file:///e:/account-icdp/icdp-modern/scripts/ocr_server.py) is a standalone Flask server using PaddleOCR and Tesseract, but is not connected to any automated frontend pipeline.
- **Evidence & File References:**
  - [src/modules/paybill/components/OcrFallbackModal.tsx](file:///e:/account-icdp/icdp-modern/src/modules/paybill/components/OcrFallbackModal.tsx) only provides a manual copy-paste text box.
- **Actual Impact / Risk:** Unclear whether the OCR server is supported, deprecated, or an abandoned experimental tool.
- **Confidence:** **Confirmed (Codebase Search Evidence)**.
- **Recommendation:** **Investigate / Decide**. Either build an integrated OCR service or remove the Python script from the repository.

---

### [P2-5] Unit Test Suite Hanging on Cloud Storage & Assertion Failure — RESOLVED
- **Description:** Running `npm run test:run` previously hung on the legacy browser storage tests / `grRepository.service.test.ts` due to external network timeouts in the old remote-storage integration.
- **Resolution:** The R2/IndexedDB storage path was removed in favour of Supabase Storage (`grDocumentStorage.service.ts`). Storage calls are now fully mocked in Vitest, so the suite runs offline.
- **Evidence & File References:**
  - `grDocumentStorage.service.test.ts`: mocks `supabase.storage.from(...)` (upload, signed URL, remove).
  - `grRepository.service.test.ts`: spies on the storage service; no network calls.
- **Remaining:** the unrelated `gtr30EmployeeTransform.service.test.ts` assertion (`expected 35400 to be 40000`) is tracked separately.

---

## 5. Priority 3 (P3) — Low-Impact Cleanliness & Cosmetic Debt

### [P3-1] Duplicate Currency Formatting & Number-to-Words Utilities
- **Description:** Formatting numbers to Indian Rupees and converting numbers to words is implemented separately in multiple files.
- **Evidence & File References:**
  - [src/shared/utilities/gujaratiFormat.ts](file:///e:/account-icdp/icdp-modern/src/shared/utilities/gujaratiFormat.ts).
  - [src/modules/gtr44/utils/gtr44Utils.ts](file:///e:/account-icdp/icdp-modern/src/modules/gtr44/utils/gtr44Utils.ts#L10): `numberToWordsINR()`.
  - Local `formatInr()` in `PayBillLegacyDataEditor.tsx`.
- **Recommendation:** **Refactor**. Consolidate into `@/shared/utilities/currency.ts`.

---

### [P3-2] Inconsistent Date Formats Across Tables
- **Description:** The database mixes `DATE`, `TIMESTAMPTZ`, and plain string year/month columns across tables.
- **Evidence:** `join_date` is `DATE`, `voucher_date` is `DATE`, `transaction_date` is `DATE`, but `bill_date` in `gtr30_bills` is `TEXT` in some forms and `DATE` in schema.
- **Recommendation:** **Refactor**. Enforce standardized ISO-8601 timestamps and calendar date types.

---

### [P3-3] Uncommitted Files and Schema Drift in Working Directory
- **Description:** The local working tree contains 90+ uncommitted modified files and untracked migrations (`040` through `050`).
- **Evidence:** `git status` shows untracked migrations `040_gr_repository.sql` through `050_paybill_fix_jan_feb_financial_year.sql`.
- **Recommendation:** **Investigate**. Commit or branch the single-office migration changes before starting V2 work.
