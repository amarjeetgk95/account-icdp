# ICDP Existing System — Complete Module and Business Logic Inventory

**Date of Audit:** October 9, 2026  
**Auditor:** Antigravity Discovery Audit Engine  
**Target Repository:** `E:\account-icdp\icdp-modern`  
**Classification:** Functional Decomposition & Business Rules Audit  

---

## 1. Module Inventory Matrix

| Module ID | Business Title | Navigation Group | Active Routes | Entry Component | Backend Repositories | Primary Tables | Architectural Status |
|---|---|---|---|---|---|---|---|
| `auth` | Authentication | Hidden (`main`) | `/login`, `/forgot-password`, `/update-password` | `LoginPage.tsx` | Supabase GoTrue | `profiles`, `auth.users` | **Active / Stable** |
| `dashboard` | Dashboard Overview | `overview` | `/dashboard` | `DashboardPage.tsx` | `dashboard.repository.ts` | `employees`, `employee_salaries`, `parties`, `party_transactions`, `gtr30_bills`, `gtr44_bills` | **Active / Composite** |
| `gtr44` | GTR-44 DC Bills | `bills` | `/gtr44/create`, `/gtr44/list`, `/gtr44/view/:id`, `/gtr44/edit/:id` | `GTR44ListPage.tsx` | `gtr44BillsBackend.repository.ts` | `gtr44_bills`, `app_config` | **Active / Functional** |
| `gtr30` | GTR-30 Pay Bills | `bills` | `/gtr30/create`, `/gtr30/list`, `/gtr30/view/:id`, `/gtr30/edit/:id`, `/gtr30/employee-management` | `GTR30LaunchPage.tsx` | `billRegister.repository.ts`, `gtr30EmployeeMasterBackend.repository.ts`, `gtr30BudgetHeadsBackend.repository.ts` | `gtr30_bills`, `gtr30_employee_master`, `gtr30_budget_heads`, `gtr30_bill_code_mappings` | **Active / Heavy Dual Storage** |
| `payroll` | Salary TDS (24Q) | `tds` | `/payroll/entry`, `/payroll/report`, `/payroll/reconciliation`, `/payroll/budget`, `/payroll/lookup`, `/payroll/employees` | `PayrollPage.tsx` | `payroll.repository.ts`, `salary.repository.ts`, `employee.repository.ts`, `taxReconciliation.repository.ts` | `employees`, `employee_salaries`, `salary_imports`, `employee_salary`, `budget_heads` | **Active / Legacy Overlap** |
| `parties` | Vendor TDS (26Q) | `tds` | `/parties/overview`, `/parties/gst`, `/parties/it` | `PartiesPage.tsx` | `party.repository.ts` | `parties`, `party_transactions`, `office_details` | **Active / Functional** |
| `reports` | TDS Reports & Returns | `tds` | `/reports/24q`, `/reports/26q`, `/reports/gst` | `ReportsPage.tsx` | `report.repository.ts` | `employees`, `employee_salaries`, `parties`, `party_transactions` | **Active / Client-Side Reports** |
| `it-employee` (`paybill`) | Employee IT & Ledger | `it-employee` | `/paybill/matrix`, `/paybill/employee`, `/paybill/form16`, `/paybill/form16/:hrpn`, `/paybill/history`, `/paybill/components`, `/paybill/legacy-edit` | `PayBillImportPage.tsx` | `paybill.repository.ts`, `form16.repository.ts` | `paybill_imports`, `paybill_employee_earnings`, `paybill_employee_deductions`, `payroll_components`, `form16_certificates` | **Active / Core Financial Engine** |
| `establishment` | Establishment Register | `establishment` | `/establishment`, `/establishment/posts`, `/establishment/employees/new`, `/establishment/employees/edit/:id` | `EstablishmentDirectoryPage.tsx` | `establishmentBackend.repository.ts`, `establishmentLocal.repository.ts` | `establishment_employees`, `establishment_posts`, `establishment_pay_entries` | **Active / Dual Storage** |
| `gr_repository` | GR Repository | `tools` | `/gr-repository`, `/gr-repository/*` | `GRListPage.tsx` | `grRepository.service.ts`, `grDocumentStorage.service.ts` | `gr_repository`, `gr_departments`, `gr_categories`, `gr_subcategories`, `gr_audit_logs`, Supabase Storage (`gr-documents`) | **Active / Functional** |
| `settings` | Master Settings | `system` | `/settings/office`, `/settings/gtr30`, `/settings/gtr44`, `/settings/tax-rules`, `/settings/form16` | `SettingsPage.tsx` | `office.repository.ts` | `office_details`, `offices`, `app_config`, `paybill_settings` | **Active / Composite Hub** |

---

## 2. Detailed Module Breakdown

### 2.1 Module: `auth` (Authentication)
- **Business Purpose:** Operator identity, authentication, session maintenance, and password management.
- **Routes:**
  - `/login` -> [LoginPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/auth/pages/LoginPage.tsx)
  - `/forgot-password` -> [ForgotPasswordPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/auth/pages/ForgotPasswordPage.tsx)
  - `/update-password` -> [UpdatePasswordPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/auth/pages/UpdatePasswordPage.tsx)
- **Key Components:** `LoginForm.tsx`, `ForgotPasswordForm.tsx`, `UpdatePasswordForm.tsx`, `AuthHelpDialog.tsx`.
- **Data Dependencies:** Supabase Auth (`supabase.auth.*`), `profiles` table.
- **Business Logic & Validation:**
  - Email format validation (`auth.schema.ts`).
  - Password minimum length 6 characters.
  - On sign-in, loads `profiles.role` via `loadProfileIntoStores()` in [src/core/auth/store.ts](file:///e:/account-icdp/icdp-modern/src/core/auth/store.ts#L21).
- **Status:** **Active / Fully Verified**.

---

### 2.2 Module: `dashboard` (Executive Overview)
- **Business Purpose:** Central mission control displaying key financial performance indicators, filing deadlines, statutory calendar reminders, and action queues.
- **Routes:**
  - `/dashboard` -> [DashboardPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/dashboard/pages/DashboardPage.tsx)
- **Key Components:**
  - `IcdpKpiGrid.tsx`: 4 high-level stat cards (Payroll status, Treasury bills, Vendor TDS, Form 16 issuance).
  - `IcdpAlertStrip.tsx`: Priority alerts (upcoming statutory filing deadlines, missing payroll data).
  - `IcdpActionQueue.tsx`: Actionable task queue (pending bill approvals, unmapped paybill rows).
  - `MonthlySalaryChart.tsx`: 12-month gross salary bar chart with trend lines.
  - `QuarterReadinessChart.tsx`: Form 24Q quarterly filing readiness gauge.
  - `TreasuryDonutChart.tsx`: Budget head expenditure breakdown.
  - `VendorTdsChart.tsx`: 26Q vendor IT and GST deductions.
- **Data Dependencies:** Queries `employees`, `employee_salaries`, `parties`, `party_transactions`, `gtr30BillRegisterRepository.listSummary()`, and `gtr44BillsBackendRepository.listSummary()`.
- **Business Logic & Calculations:**
  - In [src/modules/dashboard/repositories/dashboard.repository.ts](file:///e:/account-icdp/icdp-modern/src/modules/dashboard/repositories/dashboard.repository.ts#L86):
    * Next TDS Deposit Deadline: 7th of next month (or April 30 for March work).
    * Quarterly Form 24Q/26Q deadlines: Q1 -> July 31; Q2 -> Oct 31; Q3 -> Jan 31; Q4 -> May 31.
    * Computes countdown of `daysUntilFiling`.
- **Status:** **Active / Fully Verified**.

---

### 2.3 Module: `gtr30` (GTR-30 Pay Bills)
- **Business Purpose:** Complete generation, editing, statutory certification, and registration of official Government Pay Bills under Gujarat Treasury Rule 30 (10-page statutory layout).
- **Routes:**
  - `/gtr30/create` -> [GTR30LaunchPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/gtr30/pages/GTR30LaunchPage.tsx)
  - `/gtr30/list` -> [GTR30ListPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/gtr30/pages/GTR30ListPage.tsx)
  - `/gtr30/edit/:id` -> [GTR30CreatePage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/gtr30/pages/GTR30CreatePage.tsx)
  - `/gtr30/view/:id` -> [GTR30ViewPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/gtr30/pages/GTR30ViewPage.tsx)
  - `/gtr30/employee-management` -> [GTR30EmployeeManagementPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/gtr30/pages/GTR30EmployeeManagementPage.tsx)
  - `/gtr30/employee-management/new` -> [GTR30EmployeeFormPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/gtr30/pages/GTR30EmployeeFormPage.tsx)
  - `/gtr30/employee-management/edit/:employeeId` -> [GTR30EmployeeFormPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/gtr30/pages/GTR30EmployeeFormPage.tsx)
- **Key Components:**
  - `GTR30CreatePage.tsx` (1,531 LOC): Multi-step wizard orchestrating the 10-page pay bill.
  - `GTR30Document.tsx` (796 LOC): Printable 10-page composite statutory document.
  - `GTR30SingleForm.tsx` (1,217 LOC): Page 1 (Outer Face) detailing major head, DDO code, expenditure heads, and gross amount.
  - `GTR30DeductionsOuterBack.tsx` (972 LOC): Page 2 (Outer Back) detailing statutory deductions, treasury classifications, and net amount.
  - `GTR30Page3Inner1.tsx` & `GTR30Page4Inner2.tsx`: Pages 3–4 (Inner Roster) itemizing employee pay, grade pay, allowances, and individual deductions.
  - `GTR30Page5Certificate.tsx` & `GTR30Page10Pramanpatra.tsx`: Pages 5 and 10 containing DDO certificates, messenger authorizations, and Gujarati declarations.
  - `GTR30EmployeeMasterForm.tsx` (1,225 LOC): Staff editor for 7th pay commission matrix, allowances, and bill code assignment.
- **Data Dependencies:** `gtr30_bills`, `gtr30_employee_master`, `gtr30_budget_heads`, `gtr30_bill_code_mappings`, and browser `localStorage`.
- **Business Logic & Calculations:**
  - Detailed in [src/modules/gtr30/services/gtr30Calc.service.ts](file:///e:/account-icdp/icdp-modern/src/modules/gtr30/services/gtr30Calc.service.ts) and [src/modules/gtr30/utils/gtr30SalaryCalc.ts](file:///e:/account-icdp/icdp-modern/src/modules/gtr30/utils/gtr30SalaryCalc.ts).
- **Status:** **Active / Heavy Dual Storage**.

---

### 2.4 Module: `gtr44` (GTR-44 Detailed Contingent Bills)
- **Business Purpose:** Preparation, verification, sub-voucher listing, and printing of Detailed Contingent (DC) expenditure bills under Gujarat Treasury Rule 44 across 22 standardized contingent items.
- **Routes:**
  - `/gtr44/create` -> [GTR44CreatePage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/gtr44/pages/GTR44CreatePage.tsx)
  - `/gtr44/list` -> [GTR44ListPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/gtr44/pages/GTR44ListPage.tsx)
  - `/gtr44/edit/:id` -> [GTR44CreatePage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/gtr44/pages/GTR44CreatePage.tsx)
  - `/gtr44/view/:id` -> [GTR44ViewPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/gtr44/pages/GTR44ViewPage.tsx)
  - `/gtr44/settings` -> Redirects to `/settings/gtr44`
- **Key Components:**
  - `GTR44BillWizard.tsx` (751 LOC): Step-by-step form for office selection, expenditure line entry, sub-vouchers, and certifications.
  - `GTR44ExpenditureTable.tsx`: Grid for entering amounts across the 22 statutory contingent items.
  - `SubVoucherList.tsx`: Sub-voucher tracking table with payee names, voucher dates, and descriptions.
  - `GTR44Document.tsx` & `GTR44PrintableForm.tsx`: Statutory printable layout.
- **Data Dependencies:** `gtr44_bills` table, `app_config` table (EDP code mappings, office defaults).
- **Business Logic & Calculations:**
  - [src/modules/gtr44/services/gtr44Calc.service.ts](file:///e:/account-icdp/icdp-modern/src/modules/gtr44/services/gtr44Calc.service.ts):
    * Computes total contingent expenditure across 22 sub-items.
    * Adjusts previous advance drawn (`advanceDrawn`).
    * Computes net payable amount = `grossAmount - advanceDrawn`.
    * Formats number to Gujarati/Indian words via `numberToWordsINR()`.
- **Status:** **Active / Fully Functional**.

---

### 2.5 Module: `it-employee` (`paybill` / Employee IT & Ledger)
- **Business Purpose:** Core financial engine for ingesting Treasury Paybill PDFs, maintaining the 12-Month Employee Ledger, Allowance Matrices, Component Masters, and issuing Form-16 certificates.
- **Routes:**
  - `/paybill/matrix` -> [PayBillImportPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/paybill/pages/PayBillImportPage.tsx) (`tab='matrix'`)
  - `/paybill/employee` -> [PayBillImportPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/paybill/pages/PayBillImportPage.tsx) (`tab='employee'`)
  - `/paybill/history` -> [PayBillHistoryPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/paybill/pages/PayBillHistoryPage.tsx)
  - `/paybill/components` -> [PayrollComponentMasterPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/paybill/pages/PayrollComponentMasterPage.tsx)
  - `/paybill/form16` -> [Form16Page.tsx](file:///e:/account-icdp/icdp-modern/src/modules/paybill/pages/Form16Page.tsx)
  - `/paybill/form16/:hrpn` -> [Form16EditorPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/paybill/pages/Form16EditorPage.tsx)
  - `/paybill/legacy-edit` -> [PayBillLegacyDataEditor.tsx](file:///e:/account-icdp/icdp-modern/src/modules/paybill/components/PayBillLegacyDataEditor.tsx)
- **Key Components:**
  - `EmployeeLedgerView.tsx`: Master-detail 12-month ledger container with sticky totals, YoY deltas, and month drawers.
  - `LedgerMatrixTable.tsx`: Full-year tabular ledger (March -> February).
  - `Form16EditorPage.tsx` (1,534 LOC) & `Form16EditorModal.tsx` (1,159 LOC): Duplicated editor components for Form 16 Part A and Part B.
  - `Form16Document.tsx`: Printable official Income Tax Department Form-16 certificate.
  - `PayBillLegacyDataEditor.tsx` (1,406 LOC): Full-screen manual spreadsheet editor for overriding individual month figures.
  - `PdfUploader.tsx`: Drag-and-drop PDF ingestion dropzone.
- **Data Dependencies:** `paybill_imports`, `paybill_employee_earnings`, `paybill_employee_deductions`, `paybill_vouchers`, `payroll_components`, `form16_certificates`, `form16_audit_log`.
- **Business Logic & Calculations:**
  - Parsing engine: [src/modules/paybill/services/pdfParser.service.ts](file:///e:/account-icdp/icdp-modern/src/modules/paybill/services/pdfParser.service.ts) (1,592 LOC).
  - Income Tax calculation: [src/modules/paybill/services/form16Calculation.service.ts](file:///e:/account-icdp/icdp-modern/src/modules/paybill/services/form16Calculation.service.ts).
  - Ledger Math: [src/modules/paybill/components/employee-ledger/ledgerMath.ts](file:///e:/account-icdp/icdp-modern/src/modules/paybill/components/employee-ledger/ledgerMath.ts).
- **Status:** **Active / High Complexity**.

---

### 2.6 Module: `payroll` (Salary TDS 24Q & Reconciliation)
- **Business Purpose:** Monthly salary grid entry, Excel sheet uploads, quarterly Form 24Q preparation, and automated reconciliation between parsed paybills and salary registers.
- **Routes:**
  - `/payroll/entry` -> [PayrollPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/payroll/pages/PayrollPage.tsx) (`tab='entry'`)
  - `/payroll/report` -> [PayrollPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/payroll/pages/PayrollPage.tsx) (`tab='report'`)
  - `/payroll/reconciliation` -> [PayrollPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/payroll/pages/PayrollPage.tsx) (`tab='reconciliation'`)
  - `/payroll/budget` -> [PayrollPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/payroll/pages/PayrollPage.tsx) (`tab='budget'`)
  - `/payroll/lookup` -> [PayrollPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/payroll/pages/PayrollPage.tsx) (`tab='lookup'`)
  - `/payroll/employees` -> [PayrollPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/payroll/pages/PayrollPage.tsx) (`tab='employees'`)
- **Key Components:**
  - `SalaryEntryGrid.tsx` (970 LOC): Matrix grid for manual salary entry (Gross, DA, Tax).
  - `TaxReconciliationView.tsx`: Container for cross-system reconciliation.
  - `TaxReconciliationTable.tsx` (728 LOC): Discrepancy detector between paybill PDFs and manual salaries.
  - `TaxReconciliationSyncModal.tsx`: Sync modal to push paybill PDF figures into `employee_salaries`.
  - `QuarterReport.tsx`: Form 24Q quarterly returns generator.
  - `SalaryExcelImport.tsx`: Excel `.xlsx` salary sheet parser using SheetJS.
- **Data Dependencies:** `employees`, `employee_salaries`, `salary_imports`, `employee_salary`, `budget_heads`.
- **Status:** **Active / Overlaps heavily with Paybill**.

---

### 2.7 Module: `parties` (Vendor TDS 26Q & GST)
- **Business Purpose:** Registry of commercial vendors, transaction tracking, 2% TDS on GST, and quarterly Section 194C / 194J income tax deductions for Form 26Q.
- **Routes:**
  - `/parties/overview` -> [PartiesPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/parties/pages/PartiesPage.tsx) (`tab='overview'`)
  - `/parties/gst` -> [PartiesPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/parties/pages/PartiesPage.tsx) (`tab='gst'`)
  - `/parties/it` -> [PartiesPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/parties/pages/PartiesPage.tsx) (`tab='it'`)
- **Key Components:** `TransactionForm.tsx`, `TransactionsTable.tsx`, `GSTReportSection.tsx`, `ITReportSection.tsx`, `SummaryCards.tsx`.
- **Data Dependencies:** `parties`, `party_transactions`, `office_details`.
- **Business Logic & Calculations:**
  - [src/modules/parties/repositories/party.repository.ts](file:///e:/account-icdp/icdp-modern/src/modules/parties/repositories/party.repository.ts):
    * GST TDS = 2% (1% CGST + 1% SGST) for transactions where supply value exceeds ₹2,50,000.
    * Total GST = `cgst + sgst + igst`.
    * Income Tax TDS = based on PAN type and nature of contract.
- **Status:** **Active / Fully Functional**.

---

### 2.8 Module: `reports` (TDS Reports & Returns)
- **Business Purpose:** Dedicated export hub for statutory quarterly and annual income tax and GST returns.
- **Routes:**
  - `/reports/24q` -> [ReportsPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/reports/pages/ReportsPage.tsx) (`tab='24q'`)
  - `/reports/26q` -> [ReportsPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/reports/pages/ReportsPage.tsx) (`tab='26q'`)
  - `/reports/gst` -> [ReportsPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/reports/pages/ReportsPage.tsx) (`tab='gst'`)
- **Key Components:** `ReportsPage.tsx`, `ReportPrintArea.tsx`.
- **Data Dependencies:** `employees`, `employee_salaries`, `parties`, `party_transactions`.
- **Business Logic:**
  - Queries legacy tables only. Computes quarterly rollups entirely on the client in [src/modules/reports/repositories/report.repository.ts](file:///e:/account-icdp/icdp-modern/src/modules/reports/repositories/report.repository.ts).
- **Status:** **Active / Client-Side Reporting**.

---

### 2.9 Module: `establishment` (Establishment Register)
- **Business Purpose:** Canonical staff register, cadre-wise sanctioned post strength (મહેકમ માહિતી), post allocations, and pay revision increments.
- **Routes:**
  - `/establishment` -> [EstablishmentDirectoryPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/establishment/pages/EstablishmentDirectoryPage.tsx)
  - `/establishment/posts` -> [EstablishmentPostsPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/establishment/pages/EstablishmentPostsPage.tsx)
  - `/establishment/employees/new` -> [EstablishmentEmployeePage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/establishment/pages/EstablishmentEmployeePage.tsx)
  - `/establishment/employees/edit/:id` -> [EstablishmentEmployeePage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/establishment/pages/EstablishmentEmployeePage.tsx)
- **Key Components:** `EstablishmentEmployeeList.tsx`, `EstablishmentEmployeeForm.tsx`, `EstablishmentPostDesignationPicker.tsx`, `EstablishmentGujaratiDesignationPicker.tsx`.
- **Data Dependencies:** `establishment_employees`, `establishment_posts`, `establishment_pay_entries`, browser `localStorage`.
- **Status:** **Active / Dual Storage**.

---

### 2.10 Module: `gr_repository` (Government Resolution Document Archive)
- **Business Purpose:** Central catalog, full-text search, categorization, and previewing of official Government Resolutions (GRs), circulars, and departmental orders.
- **Routes:**
  - `/gr-repository` -> [GRListPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/gr/components/GRListPage.tsx)
  - `/gr-repository/*` -> [GRListPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/gr/components/GRListPage.tsx)
- **Key Components:**
  - `GRListPage.tsx` (719 LOC): Main searchable list with multi-faceted filtering.
  - `GRFormModal.tsx`: Upload and metadata editor.
  - `GRMasterSettingsModal.tsx` (734 LOC): Department, Category, and Subcategory catalog management.
  - `PDFViewerModal.tsx`: In-browser PDF preview modal.
  - `GRAuditTrailModal.tsx`: Audit history viewer.
- **Data Dependencies:** `gr_repository`, `gr_departments`, `gr_categories`, `gr_subcategories`, `gr_document_relations`, `gr_audit_logs`, Supabase Storage (private `gr-documents` bucket).
- **Status:** **Active / Fully Functional**.

---

### 2.11 Module: `settings` (Master Settings Hub)
- **Business Purpose:** Central administrative configuration panel for office details, TAN/GST, DDO parameters, GTR defaults, Income Tax slabs, and Form-16 deductor information.
- **Routes:**
  - `/settings/office` -> [SettingsPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/settings/pages/SettingsPage.tsx) (`tab='office'`)
  - `/settings/gtr30` -> [SettingsPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/settings/pages/SettingsPage.tsx) (`tab='gtr30'`)
  - `/settings/gtr44` -> [SettingsPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/settings/pages/SettingsPage.tsx) (`tab='gtr44'`)
  - `/settings/tax-rules` -> [SettingsPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/settings/pages/SettingsPage.tsx) (`tab='tax-rules'`)
  - `/settings/form16` -> [SettingsPage.tsx](file:///e:/account-icdp/icdp-modern/src/modules/settings/pages/SettingsPage.tsx) (`tab='form16'`)
- **Key Components:**
  - `OfficeForm.tsx`: Surat office profile, TAN, GST, address.
  - `GTR30SettingsView.tsx` (Imported from `@/modules/gtr30`): DA rates, budget heads, DDO signatory defaults.
  - `GTR44SettingsView.tsx` (Imported from `@/modules/gtr44`): 22 contingent items, EDP codes.
  - `Form16TaxRulesConfigForm.tsx`: Income tax slab limits, standard deductions, Section 87A ceilings u/s 115BAC.
  - `Form16DefaultsForm.tsx`: Deductor name, TAN, CIT address, signatory name/designation.
- **Data Dependencies:** `office_details`, `offices`, `app_config`, `paybill_settings`.
- **Status:** **Active / Composite Hub**.

---

## 3. Financial Calculations & Business Logic Rules

### 3.1 Income Tax Calculation (Section 115BAC New Tax Regime)

- **Location:** [src/modules/paybill/services/form16Calculation.service.ts](file:///e:/account-icdp/icdp-modern/src/modules/paybill/services/form16Calculation.service.ts)
- **Inputs:**
  - `grossSalary17_1`: Gross pay fetched from 12-Month Paybill Employee Ledger.
  - `financialYear`: FY integer (e.g. 2024 for FY 2024-25).
  - `assessmentYear`: Auto-derived as `financialYear + 1` (e.g. `2025-26`).
  - `partB`: Overrides for perquisites u/s 17(2), profits in lieu u/s 17(3), other employer salary, standard deduction override, Section 80C/80CCD deductions.

#### Statutory Rules & Slabs Implemented

```
AY 2024-25 (FY 2023-24):
  ₹0 to ₹3,00,000         : 0%
  ₹3,00,001 to ₹6,00,000   : 5%
  ₹6,00,001 to ₹9,00,000   : 10%
  ₹9,00,001 to ₹12,00,000  : 15%
  ₹12,00,001 to ₹15,00,000 : 20%
  Above ₹15,00,000        : 30%
  Standard Deduction u/s 16(ia): ₹50,000
  Rebate u/s 87A: Up to ₹7,00,000 taxable income (max ₹25,000)

AY 2025-26 (FY 2024-25):
  ₹0 to ₹3,00,000         : 0%
  ₹3,00,001 to ₹7,00,000   : 5%
  ₹7,00,001 to ₹10,00,000  : 10%
  ₹10,00,001 to ₹12,00,000 : 15%
  ₹12,00,001 to ₹15,00,000 : 20%
  Above ₹15,00,000        : 30%
  Standard Deduction u/s 16(ia): ₹75,000
  Rebate u/s 87A: Up to ₹7,00,000 taxable income (max ₹25,000)

AY 2026-27 (FY 2025-26):
  ₹0 to ₹4,00,000         : 0%
  ₹4,00,001 to ₹8,00,000   : 5%
  ₹8,00,001 to ₹12,00,000  : 10%
  ₹12,00,001 to ₹16,00,000 : 15%
  ₹16,00,001 to ₹20,00,000 : 20%
  ₹20,00,001 to ₹24,00,000 : 25%
  Above ₹24,00,000        : 30%
  Standard Deduction u/s 16(ia): ₹75,000
  Rebate u/s 87A: Up to ₹12,00,000 taxable income (max ₹60,000)
```

#### Section 87A Marginal Relief Algorithm
When taxable income exceeds the rebate limit (e.g. ₹7,00,000), tax payable cannot exceed the excess income above ₹7,00,000:
$$\text{excessIncome} = \text{taxableIncome} - \text{rebate87ALimit}$$
$$\text{marginalRebate} = \text{taxOnIncome} - \text{excessIncome}$$
$$\text{rebate87A} = \min(\text{taxOnIncome}, \max(0, \lceil\text{marginalRebate}\rceil))$$

#### Surcharge with Marginal Relief Algorithm
- ₹50L to ₹1Cr: 10%
- ₹1Cr to ₹2Cr: 15%
- Above ₹2Cr: 25%
- Marginal relief formula guarantees: $\text{Tax} + \text{Surcharge} \le \text{Tax at threshold} + \text{Prior surcharge at threshold} + (\text{Taxable income} - \text{Threshold})$.

#### Health & Education Cess
Calculated strictly at **4%** on `(Tax + Surcharge - Rebate)`.
$$\text{cess} = \lceil\text{taxAfterRebate} \times 0.04\rceil$$

---

### 3.2 GTR-30 Pay Bill Rules & Salary Matrix

- **Location:** [src/modules/gtr30/services/gtr30Calc.service.ts](file:///e:/account-icdp/icdp-modern/src/modules/gtr30/services/gtr30Calc.service.ts)
- **Inputs:** Employee roster, 7th pay commission level and cell, DA rate %, HRA rate %, allowances, deductions.
- **Formulas:**
  - **Dearness Allowance (DA):** $\text{round}(\text{basicPay} \times \frac{\text{daPercent}}{100})$.
  - **House Rent Allowance (HRA):** $\text{round}(\text{basicPay} \times \frac{\text{hraPercent}}{100})$.
  - **Compensatory Local Allowance (CLA):** Slabs based on basic pay (Government of Gujarat civil rules).
  - **Medical Allowance:** Fixed statutory rate (default ₹300/month).
  - **Transport Allowance:** Slabs based on 7th pay matrix level and pay scale.
  - **Gross Amount:** $\sum(\text{Basic} + \text{DA} + \text{HRA} + \text{CLA} + \text{Med} + \text{Trans} + \text{Special} + \text{Washing} + \text{NPP})$.
  - **Professional Tax:** ₹200 if gross salary exceeds statutory Gujarat threshold; ₹0 otherwise.
  - **Deductions Total:** $\sum(\text{GPF} + \text{NPS} + \text{Income Tax} + \text{PT} + \text{GIS} + \text{Rent} + \text{Society})$.
  - **Net Payable:** $\text{Gross Amount} - \text{Deductions Total}$.
- **Rounding:** Integer rounding (`Math.round`) for statutory Gujarat Treasury compliance.

---

### 3.3 Financial Year Assumptions & Accounting Conventions

Across the application, two competing financial year rules were discovered:

1. **Standard April–March Financial Year:**
   - Used by `UIStore`, `dashboard`, `reports`, and `parties`.
   - Date range: April 1 to March 31.
2. **March–February Work Month Salary Accounting (Single-Entry Rule):**
   - Implemented in `paybill` and enforced by migration `038_paybill_single_entry_mar_feb_fy.sql` and `050_paybill_fix_jan_feb_financial_year.sql`.
   - **Government Rule:** Salary for work done in month $M$ is paid in treasury month $M+1$.
   - Work done in **March** is paid in **April** (the first month of the new FY).
   - Therefore, the financial year for salary and Form-16 covers:
     * **March, April, May, June, July, August, September, October, November, December, January, February**.
   - Work in January and February belongs to the FY start year of the preceding calendar year (e.g. January 2026 work paid February 2026 belongs to FY 2025-26).

---

## 4. Duplicate and Overlapping Implementations

| Subsystem / Feature | Implementation A | Implementation B | Implementation C | Evidence & Files |
|---|---|---|---|---|
| **Employee Directory** | `payroll/components/EmployeeRegistration.tsx` (`employees` table) | `gtr30/pages/GTR30EmployeeManagementPage.tsx` (`gtr30_employee_master` table) | `establishment/pages/EstablishmentDirectoryPage.tsx` (`establishment_employees` table) | 3 separate tables, 3 separate forms, independent edits do not synchronize. |
| **Salary Data Ingestion** | `payroll/components/SalaryEntryGrid.tsx` (`employee_salaries` table) | `payroll/components/SalaryExcelImport.tsx` (`employee_salary` table) | `paybill/pages/PayBillImportPage.tsx` (`paybill_employee_earnings` table) | 3 separate data ingestion paths for monthly employee pay. |
| **Form-16 Editing** | `paybill/pages/Form16EditorPage.tsx` (1,534 LOC) | `paybill/components/Form16EditorModal.tsx` (1,159 LOC) | — | 2,700 lines of nearly identical Form-16 editor UI. |
| **Pay Bill Preparation** | `gtr30/pages/GTR30CreatePage.tsx` (GTR-30 Pay Bills) | `gtr44/pages/GTR44CreatePage.tsx` (GTR-44 DC Bills) | `paybill/components/PayBillLegacyDataEditor.tsx` | Separate legacy bill forms with bespoke grid calculations. |
| **Tax Reconciliation Bridge** | `payroll/services/taxReconciliation.service.ts` | — | — | 500 lines of code dedicated solely to bridging Paybill PDF numbers into Payroll salary tables. |
| **Excel Export** | `paybill/services/paybillExcel.service.ts` (using `exceljs`) | `shared/utilities/excelExport.ts` (using `exceljs`) | `payroll/services/salary.service.ts` (using `xlsx`) | 2 separate Excel engines installed in bundle. |
