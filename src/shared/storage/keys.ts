/**
 * Registry of every localStorage/sessionStorage key known to the app.
 *
 * This is the canonical inventory for the storage-consolidation work (P0-4) and the
 * duplicate-employee-master work (P0-5). Values are the EXACT historical key strings —
 * never rename a value here; rename candidates are applied by code migration, not by
 * editing this registry.
 *
 * Grouping follows the P0-4 taxonomy (see report):
 * - PERSIST  : zustand `persist` middleware stores (self-managing JSON envelopes).
 * - MIRROR   : local key that mirrors a Postgres table/row (dual-storage candidates).
 * - PREFIX   : parameterised key families (officeId/FY/HRPN suffixes).
 * - EPHEMERAL: client-only state with no server counterpart (safe to keep local).
 *
 * Note: Postgres-backed rows in `paybill_settings` (e.g. `gtr30_defaults`,
 * `gtr44_defaults`, `form16_deductor_defaults`, `self_assessment_fy_*`) are NOT listed
 * here — this registry only tracks browser storage keys.
 */
export const STORAGE_KEYS = {
  // ── Persist (zustand middleware) ────────────────────────────────────────────
  ICDP_UI_STORE: 'icdp-ui-store',
  ICDP_FEATURE_FLAGS: 'icdp-feature-flags',
  GTR44_SETTINGS_V1: 'gtr44-settings-v1',

  // ── GTR-30 ─────────────────────────────────────────────────────────────────
  /** Mirrors paybill_settings row `gtr30_defaults` (gtr30_budget_heads etc. are separate). */
  GTR30_SETTINGS_V1: 'gtr30-settings-v1',
  /** Mirrors gtr30_employee_master (office-scoped groups keyed monthKey|billCode). */
  GTR30_EMPLOYEE_MASTER_GROUPS: 'gtr30-employee-master-v3-groups-all',
  /** Pre-scope legacy key, migrated once into GTR30_EMPLOYEE_MASTER_GROUPS. */
  GTR30_EMPLOYEE_MASTER_GROUPS_LEGACY: 'gtr30-employee-master-v3-groups',
  /** Mirrors gtr30_bill_code_mappings. */
  GTR30_BILL_CODE_MAPPINGS: 'gtr30-employee-master-v3-mappings-all',
  /** Pre-scope legacy key, migrated once into GTR30_BILL_CODE_MAPPINGS. */
  GTR30_BILL_CODE_MAPPINGS_LEGACY: 'gtr30-employee-master-v3-mappings',
  /** Mirrors gtr30_budget_heads. */
  GTR30_BUDGET_HEADS: 'gtr30-budget-heads-v1-all',
  /** Client-only sync-phase tracker for the gtr30 employee-master flush queue. */
  GTR30_SYNC_PHASES: 'gtr30:syncPhases',

  // ── Establishment ───────────────────────────────────────────────────────────
  /** Mirrors establishment_employees (+ establishment_pay_entries). */
  ESTABLISHMENT_V1: 'establishment-v1-all',
  /** Mirrors app_config + positions (post catalog cache). */
  ESTABLISHMENT_POST_CATALOG: 'icdp_establishment_post_catalog',
  /** Cross-tab "directory changed" ping (timestamp payload). */
  ESTABLISHMENT_REFRESH_PING: 'establishment:refresh',

  // ── Paybill / Form 16 ───────────────────────────────────────────────────────
  /** Prefix: mirrors paybill_settings row `defaults`, per office. */
  PAYBILL_SETTINGS_PREFIX: 'paybill_settings_',
  /** Prefix: mirrors paybill_manual_adjustments, per office. */
  PAYBILL_MANUAL_VALUES_PREFIX: 'paybill_manual_values_',
  /** Prefix: mirrors form16_certificates rows. Key: form16_cert_v1_{officeId}_{fy}_{hrpn}. */
  FORM16_CERT_PREFIX: 'form16_cert_v1',
  /** Mirrors paybill_settings tax-rules row read by form16 calculation service. */
  FORM16_TAX_RULES_CONFIG: 'form16_tax_rules_config',
  /** Cross-tab "certificate last saved" (timestamp payload). */
  FORM16_LAST_SAVED: 'form16_last_saved',
  /** Prefix: mirrors paybill_settings rows `self_assessment_fy_{fy}_{hrpn}`. */
  SELF_ASSESSMENT_PREFIX: 'icdp_self_assessment_',
  /** MRU list of HRPNs recently opened in the employee ledger. */
  RECENT_HRPNS: 'paybill-ledger-recent-hrpns',

  // ── Payroll (sessionStorage) ────────────────────────────────────────────────
  /** Prefix (sessionStorage): unsynced SalaryEntryGrid drafts. Key: payroll-draft:1:{fy}:{month}. */
  PAYROLL_DRAFT_PREFIX: 'payroll-draft:1:',

  // ── Auth ────────────────────────────────────────────────────────────────────
  /** "Remember me" email on the login form (raw, non-JSON string). */
  REMEMBERED_EMAIL: 'icdp_remembered_email',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
