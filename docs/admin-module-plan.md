# Admin Module Redesign Plan

Status: **Phase 0 in progress** (see `# 6. Implementation status`)
Owner: ICDP team
Related: `src/modules/admin`, `src/modules/adminaudit`, `supabase/migrations/004,013,020`

---

## 1. Role & boundaries

Office modules are vertical slices producing data **per office**; the admin module is the
**control plane** that supervises all of them. Mapped inventory (from office-module analysis):

| Domain | Source module | Tables | Admin's job |
|---|---|---|---|
| Identity | auth / settings | `profiles`, `offices`, `office_details` | lifecycle, roles, suspend, FY |
| Salary TDS (24Q) | payroll | `employees`, `employee_salaries`, `salary_imports`, `employee_salary` | entry completion, import health |
| Vendor TDS (26Q) | parties | `parties`, `party_transactions` | cross-office totals |
| Employee IT | paybill | `paybill_imports`, `paybill_employee_deductions/earnings`, `paybill_vouchers` | import/validation monitoring, posted vouchers |
| DC Bills | gtr44 | GTR44 bill lifecycle (draft -> passed/objected) | register oversight |
| **Global config** | paybill | `payroll_components`, `payroll_component_aliases` | **admin-only writes** (migration 020) - no UI exists today |
| System config | settings | `app_config` (`currentFY`), `budget_heads` | global FY, office defaults |

**Key gap:** `payroll_components` is the only app-wide shared master; migration
`020_restrict_component_master_write.sql` already restricts writes to `is_admin()`, but there is
**no admin screen to manage it**. The Component Master tab lives in the office-side paybill module,
so offices see it but cannot edit. This moves into the new admin module.

---

## 2. Target information architecture

```
/admin                          -> redirect /admin/overview
+-- /admin/overview             System KPIs + entry-completion heatmap + import-health alerts
+-- /admin/users                User lifecycle (exists, keep + polish)
+-- /admin/offices              Offices: create/rename/district + current FY + details + budget heads
+-- /admin/reports              Cross-office drill-down 24Q/26Q/paybill/GTR44 (exists, consolidate)
+-- /admin/imports              NEW: import monitoring (salary_imports + paybill_imports)
+-- /admin/components           NEW: global payroll component master (admin-only CRUD)
+-- /admin/audit                Existing `adminaudit`, promoted + renamed under the admin shell
+-- /admin/settings             NEW: global defaults (default FY, GSTIN/TAN, office overrides)
```

`adminaudit` was previously a separate module importing `AdminLayout`/`AdminModal` from
`src/modules/admin/components` - an existing cross-module dependency. It is now folded into a
single `navGroup: 'admin'` tree: the audit page is served by the admin module and the standalone
`adminaudit` module definition/routes are removed (page, hooks, services, repos retained under
`src/modules/adminaudit`).

---

## 3. Data layer (Supabase functions to add)

Existing admin RPCs stay. New RPCs follow the existing `SECURITY DEFINER` + `is_admin()` +
`admin_log()` pattern (see `013_admin_consolidation.sql`; migration `021_admin_data_layer.sql`):

- `admin_import_health()` - per office: latest `salary_imports` + `paybill_imports`, matched vs
  total, pending `mapping_status`, `name_mismatch` counts.
- `admin_office_config(target_office_id bigint)` - read `current_fy` (from `app_config` key
  `currentFY`, the offices table has no current_fy column), `financial_years`, user/employee counts.
- `admin_set_office_fy(target_office_id bigint, fy integer)` - upserts `app_config` key `currentFY`
  (`value` is TEXT) + audits (header FY switcher is global; admin needs per-office override).
- `admin_component_list()` / `admin_component_save(component jsonb)` /
  `admin_component_set_active(component_id uuid, active boolean)` /
  `admin_component_delete(component_id uuid)` - CRUD on `payroll_components` + aliases (RLS already
  admin-only via 020; add audit + referenced-guard on delete).
- `admin_gtr44_summary()` - **DROPPED**: GTR44 bills live in browser `localStorage`
  (`src/modules/gtr44/repositories/gtr44.repository.ts`), not in any DB table. A SQL summary is not
  feasible; registering GTR44 for cross-office oversight requires a future DB migration (out of
  scope for this plan).
- Extend `get_system_stats` / `admin_data_entry_report` to include paybill/import totals (today
  they only cover payroll/parties) - additive keys only.

### Fixed RPC contract (Phase 2)

Frontend (agents B/C) codes against these shapes; migration 021 (agent A) must match exactly:

- `admin_import_health()` -> `json[]`, one row per office with any import data:
  `office_id (bigint), office_name, fy, salary_imports, salary_total_records,
  salary_matched_count, paybill_imports, paybill_total_records, paybill_matched_count,
  earnings_rows, deduction_rows, mapping_issues, name_mismatches, validation_errors,
  last_activity (timestamptz|null)`. `mapping_issues` = `mapping_status != 'MATCHED'`;
  `validation_errors` = `validation_status = 'error' OR jsonb_array_length(errors) > 0`.
- `admin_office_config(target_office_id bigint)` -> `json`:
  `office_id, office_name, district, current_fy (int|null), financial_years (int[]), users, employees`.
- `admin_set_office_fy(target_office_id bigint, fy integer)` -> `json { office_id, fy }`; audits.
- `admin_component_list()` -> `json[]` of components each with nested
  `aliases: [{id, alias_text, alias_type, created_at}]` (single round-trip, no N+1).
- `admin_component_save(component jsonb)` -> `json` (full component + aliases as list);
  `id` present => update, absent => insert; always replaces aliases; audits.
- `admin_component_set_active(component_id uuid, active boolean)` -> `json { id, active }`; audits.
- `admin_component_delete(component_id uuid)` -> `json { deleted, reason? }`;
  returns `{deleted:false, reason:...}` when referenced by `paybill_employee_components`
  (deactivate instead), else hard delete + audits.
- `get_system_stats()` extended with additive keys: `salary_imports, paybill_imports, paybill_unmatched`.
- `admin_data_entry_report()` extended per row: `paybill_imports, paybill_total_records,
  paybill_matched_count, mapping_issues`.

`office_id` params are `bigint` (013 live-schema convention); frontend passes numeric strings.
Do NOT edit `src/shared/database.types.ts` (hand-maintained); use `as unknown as T` casts.

---

## 4. Frontend architecture

Keep the module contract and layering (module -> hooks -> service -> repository -> RPC).

1. **Extract to `@/shared`**: `AdminLayout`, `AdminModal`, `ErrorBanner`, `getErrorMessage`.
2. **One invalidation helper**: `invalidateAdminQueries(queryClient)` in
   `src/shared/utilities/adminQuery.ts`; every admin mutation uses it.
3. **Scope the Refresh button**: `AdminLayout` must not call `queryClient.invalidateQueries()`
   with no args (currently wipes every module's cache). Scope to admin-prefixed keys.
4. **Table primitives**: reuse `@tanstack/react-virtual` (already in `UserList`) for
   imports/offices lists; standardize `SkeletonTable` / `EmptyState`.
5. **New pages as modules with own hooks/services/repos** - no inline `supabase` calls in
   components.
6. **RHF + Zod for all forms** (component master editor, office config) - already the pattern in
   `CreateUserForm`.

---

## 5. Implementation phases

| Phase | Scope | Output |
|---|---|---|
| **0 - Foundations** | Shared extraction (Layout/Modal/ErrorBanner), `invalidateAdminQueries`, scoped Refresh | Clean base, no behavior change |
| **1 - IA restructure** | Merge `adminaudit` under `admin`, route scaffolding for imports/components/settings | Navigable skeleton |
| **2 - Data layer** | New Supabase functions + typed repos/services | Backend contract |
| **3 - Features** | Imports monitor, Component Master editor, Office config/FY override, dashboard KPIs extended | Feature complete |
| **4 - Hardening** | Tests, error-envelope adoption, coverage for new pages | Quality gate |

Phase 0 done. Phase 1 done. Phase 2 done. Phase 3 done. Phase 4 done.

Each phase is independently shippable; `admin_module` feature flag remains the cutover switch.

---

## 6. Implementation status

- [x] **Phase 0 - Foundations**
  - [x] Shared `getErrorMessage` util + `ErrorBanner`
  - [x] `AdminLayout` + `AdminModal` moved to `@/shared/components` (cross-module dep removed)
  - [x] `invalidateAdminQueries` helper; applied to all admin mutations
  - [x] Refresh button scoped to admin-prefixed query keys
- [x] **Phase 1 - IA restructure**
  - [x] `adminaudit` folded under `admin` (module def + routes removed; page served by admin module)
  - [x] Route scaffolding: `/admin/imports`, `/admin/components`, `/admin/audit`, `/admin/settings`
  - [x] Placeholder pages for imports / components / settings (Phase 3 stubs)
  - [x] `admin/module.ts` children updated (nav + subtitles + icons)
- [x] **Phase 2 - Data layer** (contract frozen; `021_admin_data_layer.sql` +
  admin frontend types/repos/services/hooks added; typecheck + 175 tests pass)
  - [x] `021_admin_data_layer.sql`: `admin_import_health`, `admin_office_config`,
    `admin_set_office_fy`, `admin_component_list/save/set_active/delete`, extended
    `get_system_stats` + `admin_data_entry_report` (additive keys)
  - [x] `admin.types` + `admin.repository/service/hooks`: `ImportHealthRow`, `OfficeConfig`,
    `useImportHealth`, `useOfficeConfig`, `useSetOfficeFy`; `SystemStats`/`DataEntryReportRow` extended
  - [x] `admin/types/components.ts` + `adminComponents.repository/service/hooks` (new files):
    `useAdminComponents`, `useAdminComponentSave/SetActive/Delete`
  - [x] `database.types.ts` Functions map updated with the 7 new RPCs
  - [x] GTR44 summary dropped (localStorage-backed, no DB table) - documented in `# 3`
- [x] **Phase 3 - Features** (pages wired to Phase 2 data layers; typecheck + 175 tests pass)
  - [x] `AdminImportsPage`: import-health KPI cards + per-office matched/total, mapping/name/validation badges
  - [x] `AdminComponentsPage` + `ComponentEditor` (RHF+Zod): global component master CRUD, filters,
    activate/deactivate, guarded delete via `ConfirmDialog`
  - [x] `AdminSettingsPage`: office selector + config readout + per-office FY override
  - [x] `AdminOverviewPage`: added Salary Imports / Paybill Imports / Paybill Unmatched KPIs
- [x] **Phase 4 - Hardening** (typecheck + lint baseline + full suite green)
  - [x] Repository tests: error-envelope behavior (throw on RPC error / `{ error }`, fallback on empty),
    office_id stringification, RPC argument contracts for all new admin RPCs
  - [x] Service tests: `getImportHealth`/`getOfficeConfig`/`setOfficeFy` validation + delegation;
    `adminComponentsService` name/alias/boolean coercion + required-id guards
  - [x] UI tests: `AdminImportsPage`, `AdminComponentsPage` (+ ConfirmDialog delete + toggle),
    `ComponentEditor` (validation, alias chips, edit prefill, save-error surfacing), `AdminSettingsPage`
    (office selection, config readout, FY override submit)
  - [x] Coverage: 225 tests across 36 files; lint at baseline (2 pre-existing errors, 21 pre-existing warnings)
